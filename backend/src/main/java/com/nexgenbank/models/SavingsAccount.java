package com.nexgenbank.models;

import com.nexgenbank.enums.TransactionType;
import com.nexgenbank.exceptions.DailyLimitExceededException;
import com.nexgenbank.exceptions.InsufficientFundsException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Savings Account — enforces daily withdrawal limits with midnight auto-reset.
 *
 * Business Rules:
 *   1. Daily withdrawal limit defaults to ₹50,000. Resets at midnight.
 *   2. Withdrawal is gated against availableBalance (total - locked), never totalBalance.
 *   3. Both InsufficientFunds and DailyLimitExceeded checks run BEFORE any mutation.
 *   4. Thread safety is provided by the inherited fair ReentrantLock.
 */
public class SavingsAccount extends BankAccount {

    private static final BigDecimal DEFAULT_DAILY_LIMIT = new BigDecimal("50000.00");

    /** Maximum amount withdrawable per calendar day. */
    private final BigDecimal dailyWithdrawalLimit;

    /** Cumulative amount withdrawn today. Resets to ZERO at midnight. */
    private BigDecimal dailyWithdrawnAmount;

    /** Calendar date of the most recent withdrawal. Used for midnight reset. */
    private LocalDate lastWithdrawalDate;

    // -------------------------------------------------------------------------
    // Constructors
    // -------------------------------------------------------------------------

    /**
     * Default constructor — uses ₹50,000 daily limit.
     */
    public SavingsAccount(String accountId, String accountNumber,
                          String holderName, BigDecimal initialBalance) {
        super(accountId, accountNumber, holderName, initialBalance);
        this.dailyWithdrawalLimit = DEFAULT_DAILY_LIMIT;
        this.dailyWithdrawnAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        this.lastWithdrawalDate = null;
    }

    /**
     * Custom daily limit constructor — for premium or student account tiers.
     */
    public SavingsAccount(String accountId, String accountNumber,
                          String holderName, BigDecimal initialBalance,
                          BigDecimal customDailyLimit) {
        super(accountId, accountNumber, holderName, initialBalance);
        if (customDailyLimit == null || customDailyLimit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Custom daily limit must be strictly positive");
        }
        this.dailyWithdrawalLimit = customDailyLimit.setScale(2, RoundingMode.HALF_EVEN);
        this.dailyWithdrawnAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        this.lastWithdrawalDate = null;
    }

    // -------------------------------------------------------------------------
    // Core Operation — Withdraw
    // -------------------------------------------------------------------------

    /**
     * Executes a withdrawal from this savings account.
     *
     * Invariants enforced (in strict order):
     *   1. Amount must be strictly positive.
     *   2. Midnight daily-limit reset check.
     *   3. Amount must not exceed getAvailableBalance() (respects vault locks).
     *   4. Accumulated daily withdrawals must not exceed dailyWithdrawalLimit.
     *   5. All validations PASS before any state mutation occurs.
     *
     * @param amount the withdrawal amount (BigDecimal, never float/double)
     * @return the immutable Transaction ledger entry
     * @throws IllegalArgumentException     if amount is zero or negative
     * @throws InsufficientFundsException   if amount exceeds available balance
     * @throws DailyLimitExceededException  if today's total would exceed the limit
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

            // ── 2. Midnight Daily-Limit Reset ──────────────────────────────────────────
            LocalDate today = LocalDate.now();
            if (lastWithdrawalDate == null || !lastWithdrawalDate.equals(today)) {
                dailyWithdrawnAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
                lastWithdrawalDate = today;
            }

            // ── 3. Available Balance Check (Vault-Aware) ───────────────────────────────
            BigDecimal available = getAvailableBalance();
            if (amount.compareTo(available) > 0) {
                throw new InsufficientFundsException(
                        "Insufficient available balance. " +
                        "Requested: ₹" + amount + " | Available: ₹" + available +
                        " (Locked in vaults: ₹" + getLockedBalance() + ")"
                );
            }

            // ── 4. Daily Limit Check ───────────────────────────────────────────────────
            BigDecimal projectedDailyTotal = dailyWithdrawnAmount.add(amount);
            if (projectedDailyTotal.compareTo(dailyWithdrawalLimit) > 0) {
                BigDecimal remaining = dailyWithdrawalLimit.subtract(dailyWithdrawnAmount);
                throw new DailyLimitExceededException(
                        "Daily withdrawal limit of ₹" + dailyWithdrawalLimit + " exceeded. " +
                        "Already withdrawn today: ₹" + dailyWithdrawnAmount +
                        " | Remaining allowance: ₹" + remaining
                );
            }

            // ── 5. Commit Mutation (All Guards Passed) ─────────────────────────────────
            totalBalance = totalBalance.subtract(amount);
            dailyWithdrawnAmount = projectedDailyTotal;

            return logTransaction(
                    TransactionType.WITHDRAWAL,
                    amount,
                    totalBalance,
                    "Savings withdrawal of ₹" + amount
            );

        } finally {
            lock.unlock();
        }
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    public BigDecimal getDailyWithdrawalLimit() {
        return dailyWithdrawalLimit;
    }

    public BigDecimal getDailyWithdrawnAmount() {
        lock.lock();
        try {
            // Re-check reset on read as well for accurate snapshot
            LocalDate today = LocalDate.now();
            if (lastWithdrawalDate == null || !lastWithdrawalDate.equals(today)) {
                return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
            }
            return dailyWithdrawnAmount;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Dynamically computes remaining daily allowance.
     * Returns dailyWithdrawalLimit - dailyWithdrawnAmount (floored to ZERO).
     */
    public BigDecimal getRemainingDailyLimit() {
        lock.lock();
        try {
            LocalDate today = LocalDate.now();
            if (lastWithdrawalDate == null || !lastWithdrawalDate.equals(today)) {
                return dailyWithdrawalLimit;
            }
            BigDecimal remaining = dailyWithdrawalLimit.subtract(dailyWithdrawnAmount);
            return remaining.compareTo(BigDecimal.ZERO) < 0
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN)
                    : remaining;
        } finally {
            lock.unlock();
        }
    }

    @Override
    public String toString() {
        return "SavingsAccount{" +
                "base=" + super.toString() +
                ", dailyWithdrawalLimit=" + dailyWithdrawalLimit +
                ", dailyWithdrawnAmount=" + dailyWithdrawnAmount +
                ", lastWithdrawalDate=" + lastWithdrawalDate +
                '}';
    }
}
