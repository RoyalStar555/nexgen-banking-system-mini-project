package com.nexgenbank.models;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a savings goal vault within a BankAccount.
 * Funds allocated to a GoalVault are locked and not available for general withdrawals or transfers.
 */
public class GoalVault {

    private final String vaultId;
    private final String goalName;
    private final BigDecimal targetAmount;
    private BigDecimal lockedAmount;
    private final LocalDate targetDate;
    private final LocalDateTime createdAt;

    /**
     * Constructs a new GoalVault with zero initial locked amount.
     *
     * @param goalName     name or description of the savings goal
     * @param targetAmount target savings amount
     * @param targetDate   target completion date
     */
    public GoalVault(String goalName, BigDecimal targetAmount, LocalDate targetDate) {
        this(UUID.randomUUID().toString(), goalName, targetAmount, BigDecimal.ZERO, targetDate, LocalDateTime.now());
    }

    /**
     * Constructs a GoalVault with all explicit parameters.
     *
     * @param vaultId      unique vault identifier
     * @param goalName     name or description of the savings goal
     * @param targetAmount target savings amount
     * @param lockedAmount currently locked amount
     * @param targetDate   target completion date
     * @param createdAt    timestamp of vault creation
     */
    public GoalVault(String vaultId, String goalName, BigDecimal targetAmount,
                     BigDecimal lockedAmount, LocalDate targetDate, LocalDateTime createdAt) {
        this.vaultId = vaultId;
        this.goalName = goalName;
        this.targetAmount = targetAmount;
        this.lockedAmount = (lockedAmount != null) ? lockedAmount : BigDecimal.ZERO;
        this.targetDate = targetDate;
        this.createdAt = (createdAt != null) ? createdAt : LocalDateTime.now();
    }

    /**
     * Calculates the savings progress percentage toward the target amount.
     * Uses Banker's Rounding (HALF_EVEN) and guards against division by zero.
     *
     * @return progress percentage as BigDecimal with 2 decimal places (e.g. 23.53)
     */
    public BigDecimal getProgressPercent() {
        if (targetAmount == null || targetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (lockedAmount == null || lockedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        }
        return lockedAmount.multiply(BigDecimal.valueOf(100))
                .divide(targetAmount, 2, RoundingMode.HALF_EVEN);
    }

    /**
     * Increments the locked amount for this vault.
     *
     * @param amount the amount to lock
     */
    public void addLockedAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount to lock must be positive");
        }
        this.lockedAmount = this.lockedAmount.add(amount);
    }

    /**
     * Resets the locked amount to zero upon vault release or unlock.
     */
    public void clearLockedAmount() {
        this.lockedAmount = BigDecimal.ZERO;
    }

    public String getVaultId() {
        return vaultId;
    }

    public String getGoalName() {
        return goalName;
    }

    public BigDecimal getTargetAmount() {
        return targetAmount;
    }

    public BigDecimal getLockedAmount() {
        return lockedAmount;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public String toString() {
        return "GoalVault{" +
                "vaultId='" + vaultId + '\'' +
                ", goalName='" + goalName + '\'' +
                ", targetAmount=" + targetAmount +
                ", lockedAmount=" + lockedAmount +
                ", targetDate=" + targetDate +
                ", createdAt=" + createdAt +
                ", progress=" + getProgressPercent() + "%" +
                '}';
    }
}
