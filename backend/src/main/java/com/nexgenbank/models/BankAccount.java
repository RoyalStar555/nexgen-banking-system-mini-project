package com.nexgenbank.models;

import com.nexgenbank.enums.KycStatus;
import com.nexgenbank.enums.TransactionType;
import com.nexgenbank.exceptions.InsufficientFundsException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Abstract base class representing a bank account within the NexGen Banking System.
 * Encapsulates core financial state, thread-safe synchronization locks, ledger auditing,
 * beneficiary relationships, and goal vault locks.
 */
public abstract class BankAccount {

    private final String accountId;
    private final String accountNumber;
    private final String holderName;
    private KycStatus kycStatus;

    // Package-private / protected to allow efficient subclass mutation and TransferService atomic manipulation
    protected BigDecimal totalBalance;
    private BigDecimal lockedBalance;

    private final List<Transaction> transactionHistory = Collections.synchronizedList(new ArrayList<>());
    private final List<Beneficiary> beneficiaries = Collections.synchronizedList(new ArrayList<>());
    private final List<GoalVault> vaults = Collections.synchronizedList(new ArrayList<>());
    private final LocalDateTime createdAt;

    /**
     * Fair reentrant lock for thread-safe concurrent access across distributed transactions.
     * Public so coordinated services (such as TransferService) can enforce strict multi-account lock ordering.
     */
    public final ReentrantLock lock = new ReentrantLock(true);

    /**
     * Constructs a new BankAccount.
     *
     * @param accountId      unique system account identifier
     * @param accountNumber  human-readable account number
     * @param holderName     account holder's legal name
     * @param initialBalance initial opening balance (must be non-negative)
     */
    public BankAccount(String accountId, String accountNumber, String holderName, BigDecimal initialBalance) {
        if (accountId == null || accountId.isBlank()) {
            throw new IllegalArgumentException("AccountId cannot be null or blank");
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new IllegalArgumentException("AccountNumber cannot be null or blank");
        }
        if (holderName == null || holderName.isBlank()) {
            throw new IllegalArgumentException("HolderName cannot be null or blank");
        }
        if (initialBalance == null || initialBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Initial balance must be non-negative");
        }

        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.holderName = holderName;
        this.totalBalance = initialBalance.setScale(2, RoundingMode.HALF_EVEN);
        this.lockedBalance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN);
        this.kycStatus = KycStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * Calculates the available balance available for withdrawal, payment, or transfer.
     * Available Balance = Total Balance - Locked Balance.
     *
     * @return BigDecimal available funds
     */
    public BigDecimal getAvailableBalance() {
        return totalBalance.subtract(lockedBalance);
    }

    /**
     * Executes a deposit into the account in a thread-safe manner.
     *
     * @param amount the amount to deposit (must be strictly positive)
     * @return the logged Transaction entry
     */
    public Transaction deposit(BigDecimal amount) {
        lock.lock();
        try {
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Deposit amount must be strictly positive");
            }
            totalBalance = totalBalance.add(amount);
            return logTransaction(TransactionType.DEPOSIT, amount, totalBalance, "Deposit of " + amount);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Abstract withdrawal method to be implemented by specific account types
     * (e.g. SavingsAccount enforces daily limits, CurrentAccount enforces overdraft rules).
     *
     * @param amount the amount to withdraw
     * @return the logged Transaction entry
     */
    public abstract Transaction withdraw(BigDecimal amount);

    /**
     * Internal helper to record an immutable transaction in the ledger.
     *
     * @param type         the transaction event type
     * @param amount       amount transacted
     * @param balanceAfter resulting total balance
     * @param description  audit description
     * @return the newly logged Transaction
     */
    protected Transaction logTransaction(TransactionType type, BigDecimal amount, BigDecimal balanceAfter, String description) {
        Transaction txn = new Transaction(type, amount, balanceAfter, description, null);
        transactionHistory.add(txn);
        return txn;
    }

    /**
     * Records a transfer leg transaction containing a correlation reference ID.
     *
     * @param type         TRANSFER_IN or TRANSFER_OUT
     * @param amount       amount transacted
     * @param balanceAfter resulting total balance
     * @param description  audit description
     * @param referenceId  unique transfer correlation ID
     * @return the newly logged Transaction
     */
    public Transaction logTransfer(TransactionType type, BigDecimal amount, BigDecimal balanceAfter,
                                  String description, String referenceId) {
        Transaction txn = new Transaction(type, amount, balanceAfter, description, referenceId);
        transactionHistory.add(txn);
        return txn;
    }

    /**
     * Directly deducts balance for atomic multi-account transfers.
     * ONLY call from TransferService when account lock is already held.
     *
     * @param amount amount to deduct
     */
    public void deductBalanceForTransfer(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deduct amount must be strictly positive");
        }
        this.totalBalance = this.totalBalance.subtract(amount);
    }

    /**
     * Directly credits balance for atomic multi-account transfers.
     * ONLY call from TransferService when account lock is already held.
     *
     * @param amount amount to credit
     */
    public void creditBalanceForTransfer(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be strictly positive");
        }
        this.totalBalance = this.totalBalance.add(amount);
    }

    /**
     * Registers a new beneficiary associated with this account.
     *
     * @param beneficiary beneficiary to add
     */
    public synchronized void addBeneficiary(Beneficiary beneficiary) {
        if (beneficiary == null) {
            throw new IllegalArgumentException("Beneficiary cannot be null");
        }
        beneficiaries.add(beneficiary);
    }

    /**
     * Returns an unmodifiable view of all registered beneficiaries.
     *
     * @return unmodifiable list of beneficiaries
     */
    public List<Beneficiary> getBeneficiaries() {
        return Collections.unmodifiableList(new ArrayList<>(beneficiaries));
    }

    /**
     * Finds a beneficiary by ID.
     *
     * @param beneficiaryId ID of beneficiary
     * @return Optional containing Beneficiary if found
     */
    public Optional<Beneficiary> findBeneficiary(String beneficiaryId) {
        return beneficiaries.stream()
                .filter(b -> b.getBeneficiaryId().equals(beneficiaryId))
                .findFirst();
    }

    /**
     * Creates and attaches a new GoalVault to this account.
     *
     * @param goalName     name of the goal
     * @param targetAmount target savings amount
     * @param targetDate   target completion date
     * @return the created GoalVault
     */
    public GoalVault createVault(String goalName, BigDecimal targetAmount, LocalDate targetDate) {
        GoalVault vault = new GoalVault(goalName, targetAmount, targetDate);
        vaults.add(vault);
        return vault;
    }

    /**
     * Locks funds into a designated GoalVault, reducing available balance.
     *
     * @param vaultId ID of the target GoalVault
     * @param amount  monetary amount to lock
     */
    public void lockFundsToVault(String vaultId, BigDecimal amount) {
        lock.lock();
        try {
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Amount to lock must be strictly positive");
            }
            if (amount.compareTo(getAvailableBalance()) > 0) {
                throw new InsufficientFundsException(
                        "Insufficient available balance. Available: " + getAvailableBalance() + ", Requested: " + amount);
            }
            GoalVault vault = vaults.stream()
                    .filter(v -> v.getVaultId().equals(vaultId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("GoalVault not found with ID: " + vaultId));

            lockedBalance = lockedBalance.add(amount);
            vault.addLockedAmount(amount);
            logTransaction(TransactionType.VAULT_LOCK, amount, totalBalance,
                    "Locked funds to vault: " + vault.getGoalName());
        } finally {
            lock.unlock();
        }
    }

    /**
     * Unlocks and releases all accumulated funds from a GoalVault back into the available balance.
     *
     * @param vaultId ID of the GoalVault to unlock
     * @return released BigDecimal amount
     */
    public BigDecimal unlockVault(String vaultId) {
        lock.lock();
        try {
            GoalVault vault = vaults.stream()
                    .filter(v -> v.getVaultId().equals(vaultId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("GoalVault not found with ID: " + vaultId));

            BigDecimal releasedAmount = vault.getLockedAmount();
            if (releasedAmount.compareTo(BigDecimal.ZERO) > 0) {
                lockedBalance = lockedBalance.subtract(releasedAmount);
                vault.clearLockedAmount();
                logTransaction(TransactionType.VAULT_UNLOCK, releasedAmount, totalBalance,
                        "Released funds from vault: " + vault.getGoalName());
            }
            return releasedAmount;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Returns an unmodifiable list of all GoalVaults associated with this account.
     *
     * @return unmodifiable list of GoalVaults
     */
    public List<GoalVault> getVaults() {
        return Collections.unmodifiableList(new ArrayList<>(vaults));
    }

    public String getAccountId() {
        return accountId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getHolderName() {
        return holderName;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }

    public void setKycStatus(KycStatus kycStatus) {
        this.kycStatus = kycStatus;
    }

    public BigDecimal getTotalBalance() {
        return totalBalance;
    }

    public BigDecimal getLockedBalance() {
        return lockedBalance;
    }

    public List<Transaction> getTransactionHistory() {
        return Collections.unmodifiableList(new ArrayList<>(transactionHistory));
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public String toString() {
        return "BankAccount{" +
                "accountId='" + accountId + '\'' +
                ", accountNumber='" + accountNumber + '\'' +
                ", holderName='" + holderName + '\'' +
                ", kycStatus=" + kycStatus +
                ", totalBalance=" + totalBalance +
                ", lockedBalance=" + lockedBalance +
                ", availableBalance=" + getAvailableBalance() +
                ", createdAt=" + createdAt +
                '}';
    }
}
