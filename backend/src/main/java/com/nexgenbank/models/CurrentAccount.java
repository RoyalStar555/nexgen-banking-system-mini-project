package com.nexgenbank.models;

import com.nexgenbank.enums.TransactionType;
import com.nexgenbank.exceptions.InsufficientFundsException;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Current Account — supports overdraft facility with automatic penalty fee.
 *
 * Business Rules:
 *   1. Overdraft limit defaults to ₹25,000 (balance can go negative up to this amount).
 *   2. If balance turns negative after a withdrawal, a fixed overdraft fee (₹500) is charged.
 *   3. Maximum withdrawable = availableBalance + overdraftLimit.
 *   4. Thread safety is provided by the inherited fair ReentrantLock.
 */
public class CurrentAccount extends BankAccount {

    private static final BigDecimal DEFAULT_OVERDRAFT_LIMIT = new BigDecimal("25000.00");
    private static final BigDecimal OVERDRAFT_FEE = new BigDecimal("500.00");

    /** Maximum amount the balance may go below zero. */
    private final BigDecimal overdraftLimit;

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Default constructor — ₹25,000 overdraft limit.
     */
    public CurrentAccount(String accountId, String accountNumber,
                          String holderName, BigDecimal initialBalance) {
        super(accountId, accountNumber, holderName, initialBalance);
        this.overdraftLimit = DEFAULT_OVERDRAFT_LIMIT;
    }

    /**
     * Custom overdraft limit constructor.
     */
    public CurrentAccount(String accountId, String accountNumber,
                          String holderName, BigDecimal initialBalance,
                          BigDecimal customOverdraftLimit) {
        super(accountId, accountNumber, holderName, initialBalance);
        if (customOverdraftLimit == null || customOverdraftLimit.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Overdraft limit must be non-negative");
        }
        this.overdraftLimit = customOverdraftLimit.setScale(2, RoundingMode.HALF_EVEN);
    }

    // -------------------------------------------------------------------------
    // Core Operation — Withdraw
    // -------------------------------------------------------------------------

    /**
     * Executes a withdrawal allowing overdraft usage up to the configured limit.
     *
     * Invariants enforced (in strict order):
     *   1. Amount must be strictly positive.
     *   2. Amount must not exceed (availableBalance + overdraftLimit).
     *   3. Balance is deducted.
     *   4. If balance is now negative, OVERDRAFT_FEE is automatically charged and logged.
     *   5. WITHDRAWAL transaction is logged.
     *
     * @param amount the withdrawal amount (BigDecimal, never float/double)
     * @return the immutable WITHDRAWAL Transaction ledger entry
     * @throws IllegalArgumentException   if amount is zero or negative
     * @throws InsufficientFundsException if amount exceeds combined limit
     */
    @Override
    public Transaction withdraw(BigDecimal amount) {
        lock.lock();
        try {
            // ── 1. Input Gate ──────────────────────────────────────────────────────────
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Withdrawal amount must be strictly positive");
            }
            amount = amount.setScale(2, RoundingMode.HALF_EVEN);

            // ── 2. Combined Limit Check (Available Balance + Overdraft Facility) ───────
            BigDecimal maxWithdrawable = getAvailableBalance().add(overdraftLimit);
            if (amount.compareTo(maxWithdrawable) > 0) {
                throw new InsufficientFundsException(
                        "Amount exceeds combined available balance and overdraft facility. " +
                        "Requested: ₹" + amount +
                        " | Available: ₹" + getAvailableBalance() +
                        " | Overdraft Facility: ₹" + overdraftLimit +
                        " | Max Withdrawable: ₹" + maxWithdrawable
                );
            }

            // ── 3. Deduct Balance ──────────────────────────────────────────────────────
            totalBalance = totalBalance.subtract(amount);

            // ── 4. Overdraft Penalty Fee (if balance went negative) ────────────────────
            if (totalBalance.compareTo(BigDecimal.ZERO) < 0) {
                totalBalance = totalBalance.subtract(OVERDRAFT_FEE);
                logTransaction(
                        TransactionType.OVERDRAFT_FEE,
                        OVERDRAFT_FEE,
                        totalBalance,
                        "Overdraft facility usage fee — balance entered negative territory"
                );
            }

            // ── 5. Log Withdrawal ──────────────────────────────────────────────────────
            return logTransaction(
                    TransactionType.WITHDRAWAL,
                    amount,
                    totalBalance,
                    "Current account withdrawal of ₹" + amount
            );

        } finally {
            lock.unlock();
        }
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    public BigDecimal getOverdraftLimit() {
        return overdraftLimit;
    }

    public BigDecimal getOverdraftFee() {
        return OVERDRAFT_FEE;
    }

    /**
     * Returns the amount currently consumed from the overdraft facility.
     * If the balance is still positive, returns ZERO.
     */
    public BigDecimal getCurrentOverdraftUsed() {
        lock.lock();
        try {
            BigDecimal balance = getTotalBalance();
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                // Return the magnitude of the negative balance
                return balance.negate().setScale(2, RoundingMode.HALF_EVEN);
            }
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public String toString() {
        return "CurrentAccount{" +
                "base=" + super.toString() +
                ", overdraftLimit=" + overdraftLimit +
                ", overdraftFee=" + OVERDRAFT_FEE +
                '}';
    }
}
