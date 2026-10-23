package com.nexgenbank.services;

import com.nexgenbank.enums.TransactionType;
import com.nexgenbank.exceptions.InsufficientFundsException;
import com.nexgenbank.exceptions.TransferFailedException;
import com.nexgenbank.models.BankAccount;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

/**
 * TransferService — Deadlock-Safe Atomic Fund Transfer
 *
 * Implements the multi-account locking protocol for atomic, rollback-capable
 * fund transfers between any two accounts in the registry.
 *
 * Deadlock Prevention Strategy:
 *   Always acquire both account locks in a consistent global order (lexicographic
 *   comparison of accountId strings). This ensures that no two concurrent transfers
 *   ever request the same two locks in opposite orders, eliminating circular wait.
 *
 * Atomicity Guarantee:
 *   1. Sender is debited FIRST.
 *   2. Receiver is credited inside a try-catch.
 *   3. If the credit throws, the sender debit is immediately reversed.
 *   4. A TransferFailedException is then rethrown wrapping the original cause.
 */
@Service
public class TransferService {

    @Autowired
    private AccountService accountService;

    /**
     * Executes an atomic, thread-safe transfer from one account to another.
     *
     * @param fromAccountId source account ID
     * @param toAccountId   destination account ID
     * @param amount        amount to transfer (must be strictly positive BigDecimal)
     * @throws IllegalArgumentException   if amount <= 0 or accounts are the same
     * @throws InsufficientFundsException if sender lacks sufficient available balance
     * @throws TransferFailedException    if transfer fails after debit (full rollback executed)
     */
    public void executeTransfer(String fromAccountId, String toAccountId, BigDecimal amount) {
        executeTransfer(fromAccountId, toAccountId, amount, null);
    }

    /**
     * Executes an atomic, thread-safe transfer with custom remark.
     */
    public void executeTransfer(String fromAccountId, String toAccountId, BigDecimal amount, String remark) {

        if (fromAccountId.equals(toAccountId)) {
            throw new IllegalArgumentException("Cannot transfer to the same account");
        }

        // ── Retrieve both accounts ─────────────────────────────────────────────────
        BankAccount sender   = accountService.getAccount(fromAccountId);
        BankAccount receiver = accountService.getAccount(toAccountId);

        // ── Deadlock-prevention: Acquire locks in consistent lexicographic order ───
        ReentrantLock firstLock;
        ReentrantLock secondLock;
        BankAccount   firstAccount;
        BankAccount   secondAccount;

        if (sender.getAccountId().compareTo(receiver.getAccountId()) < 0) {
            firstLock    = sender.lock;
            secondLock   = receiver.lock;
            firstAccount = sender;
            secondAccount = receiver;
        } else {
            firstLock    = receiver.lock;
            secondLock   = sender.lock;
            firstAccount = receiver;
            secondAccount = sender;
        }

        firstLock.lock();
        try {
            secondLock.lock();
            try {
                // ── Input Gate ─────────────────────────────────────────────────────
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("Transfer amount must be strictly positive");
                }
                amount = amount.setScale(2, RoundingMode.HALF_EVEN);

                // ── Available Balance Check ────────────────────────────────────────
                BigDecimal senderAvailable = sender.getAvailableBalance();
                if (amount.compareTo(senderAvailable) > 0) {
                    throw new InsufficientFundsException(
                            "Sender insufficient funds. " +
                            "Requested: ₹" + amount +
                            " | Available: ₹" + senderAvailable +
                            " (Total: ₹" + sender.getTotalBalance() +
                            ", Locked: ₹" + sender.getLockedBalance() + ")"
                    );
                }

                // ── Shared Reference ID — links TRANSFER_OUT ↔ TRANSFER_IN entries ─
                String referenceId = "TXN-" + UUID.randomUUID().toString()
                        .replace("-", "").substring(0, 10).toUpperCase();

                // ─────────────────────────────────────────────────────────────────
                // ATOMIC COMMIT BEGINS
                // ─────────────────────────────────────────────────────────────────

                // Step 1: Debit sender
                sender.deductBalanceForTransfer(amount);
                String senderRemarkSuffix = (remark != null && !remark.isBlank()) ? " - " + remark.trim() : "";
                sender.logTransfer(
                        TransactionType.TRANSFER_OUT,
                        amount,
                        sender.getTotalBalance(),
                        "Transfer to " + receiver.getHolderName() +
                        " (" + receiver.getAccountNumber() + ")" + senderRemarkSuffix + " | Ref: " + referenceId,
                        referenceId
                );

                try {
                    // Step 2: Credit receiver
                    receiver.creditBalanceForTransfer(amount);
                    receiver.logTransfer(
                            TransactionType.TRANSFER_IN,
                            amount,
                            receiver.getTotalBalance(),
                            "Transfer from " + sender.getHolderName() +
                            " (" + sender.getAccountNumber() + ")" + senderRemarkSuffix + " | Ref: " + referenceId,
                            referenceId
                    );

                } catch (Exception creditException) {
                    // ── ROLLBACK: Undo sender debit immediately ────────────────────
                    sender.creditBalanceForTransfer(amount);
                    // Note: The TRANSFER_OUT log entry is already written — we log
                    // a compensating TRANSFER_IN back to sender to maintain audit trail
                    sender.logTransfer(
                            TransactionType.TRANSFER_IN,
                            amount,
                            sender.getTotalBalance(),
                            "ROLLBACK: Transfer reversed — credit phase failed | Ref: " + referenceId,
                            referenceId
                    );
                    throw new TransferFailedException(
                            "Transfer of ₹" + amount + " to " + receiver.getHolderName() +
                            " failed during credit phase. Full rollback executed. Ref: " + referenceId,
                            creditException
                    );
                }

                // ─────────────────────────────────────────────────────────────────
                // ATOMIC COMMIT COMPLETE
                // ─────────────────────────────────────────────────────────────────

            } finally {
                secondLock.unlock();
            }
        } finally {
            firstLock.unlock();
        }
    }
}
