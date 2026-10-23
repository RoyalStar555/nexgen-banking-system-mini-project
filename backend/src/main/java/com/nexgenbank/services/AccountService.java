package com.nexgenbank.services;

import com.nexgenbank.exceptions.AccountNotFoundException;
import com.nexgenbank.models.*;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * AccountService — In-Memory Registry Operations
 *
 * Manages all account CRUD operations and delegates to domain models for
 * financial logic. Uses a thread-safe ConcurrentHashMap as the in-memory store
 * (no JPA, no database — as per the Anti-Gravity Framework specification).
 *
 * Concurrency Note: deposit/withdraw/transfer are delegated to the domain models
 * which each hold their own fair ReentrantLock. AccountService itself only needs
 * to guard registry-level mutations (adding/removing accounts).
 */
@Service
public class AccountService {

    /** Thread-safe in-memory account registry. Key = accountId (e.g. "ACC001"). */
    private final Map<String, BankAccount> accountRegistry = new ConcurrentHashMap<>();

    // =========================================================================
    // Registry Management
    // =========================================================================

    /**
     * Registers a new account into the in-memory registry.
     * Called by DataSeeder on application startup.
     *
     * @param account a fully-constructed BankAccount instance
     */
    public void registerAccount(BankAccount account) {
        if (account == null) {
            throw new IllegalArgumentException("Account cannot be null");
        }
        accountRegistry.put(account.getAccountId(), account);
    }

    /**
     * Retrieves a single account by its unique system ID.
     *
     * @param accountId the account's system identifier (e.g. "ACC001")
     * @return the BankAccount domain object
     * @throws AccountNotFoundException if no account exists with the given ID
     */
    public BankAccount getAccount(String accountId) {
        BankAccount account = accountRegistry.get(accountId);
        if (account == null) {
            throw new AccountNotFoundException(
                    "Account not found with ID: '" + accountId + "'");
        }
        return account;
    }

    /**
     * Returns all registered accounts. Order is not guaranteed (ConcurrentHashMap).
     *
     * @return a new mutable list of all BankAccount instances
     */
    public List<BankAccount> getAllAccounts() {
        return new ArrayList<>(accountRegistry.values());
    }

    // =========================================================================
    // Financial Operations — Delegated to Domain Model
    // =========================================================================

    /**
     * Deposits funds into the specified account.
     *
     * @param accountId account to credit
     * @param amount    amount to deposit (must be > 0)
     * @return the immutable Transaction ledger entry
     */
    public Transaction deposit(String accountId, BigDecimal amount) {
        return getAccount(accountId).deposit(amount);
    }

    /**
     * Withdraws funds from the specified account.
     * Delegates to the concrete account type (SavingsAccount or CurrentAccount).
     *
     * @param accountId account to debit
     * @param amount    amount to withdraw (must be > 0)
     * @return the immutable Transaction ledger entry
     */
    public Transaction withdraw(String accountId, BigDecimal amount) {
        return getAccount(accountId).withdraw(amount);
    }

    // =========================================================================
    // Statement / Passbook
    // =========================================================================

    /**
     * Returns a paginated, date-filtered list of transactions (newest first).
     *
     * @param accountId  account to query
     * @param startDate  inclusive start date
     * @param endDate    inclusive end date
     * @param page       zero-indexed page number
     * @param size       results per page
     * @return list of matching Transaction objects
     */
    public List<Transaction> getStatement(String accountId, LocalDate startDate,
                                          LocalDate endDate, int page, int size) {
        BankAccount account = getAccount(accountId);

        return account.getTransactionHistory().stream()
                .filter(tx -> {
                    LocalDate txDate = tx.getTimestamp().toLocalDate();
                    boolean afterStart = startDate == null || !txDate.isBefore(startDate);
                    boolean beforeEnd  = endDate   == null || !txDate.isAfter(endDate);
                    return afterStart && beforeEnd;
                })
                .sorted(Comparator.comparing(Transaction::getTimestamp).reversed())
                .skip((long) page * size)
                .limit(size)
                .collect(Collectors.toList());
    }

    /**
     * Returns the total count of transactions matching the date filter (for pagination metadata).
     */
    public long getStatementTotalCount(String accountId, LocalDate startDate, LocalDate endDate) {
        BankAccount account = getAccount(accountId);
        return account.getTransactionHistory().stream()
                .filter(tx -> {
                    LocalDate txDate = tx.getTimestamp().toLocalDate();
                    boolean afterStart = startDate == null || !txDate.isBefore(startDate);
                    boolean beforeEnd  = endDate   == null || !txDate.isAfter(endDate);
                    return afterStart && beforeEnd;
                })
                .count();
    }

    // =========================================================================
    // Beneficiary Management
    // =========================================================================

    /**
     * Adds a new beneficiary to an account.
     *
     * @param accountId     account to which the beneficiary belongs
     * @param name          beneficiary name
     * @param accountNumber beneficiary account number
     * @param ifscCode      IFSC code of beneficiary's bank branch
     * @return the newly created Beneficiary
     */
    public Beneficiary addBeneficiary(String accountId, String name,
                                      String accountNumber, String ifscCode) {
        BankAccount account = getAccount(accountId);
        Beneficiary beneficiary = new Beneficiary(name, accountNumber, ifscCode);
        account.addBeneficiary(beneficiary);
        return beneficiary;
    }

    /**
     * Returns all beneficiaries for the given account.
     */
    public List<Beneficiary> getBeneficiaries(String accountId) {
        return getAccount(accountId).getBeneficiaries();
    }

    // =========================================================================
    // Goal Vault Management
    // =========================================================================

    /**
     * Creates a new GoalVault and attaches it to the account.
     */
    public GoalVault createVault(String accountId, String goalName,
                                  BigDecimal targetAmount, LocalDate targetDate) {
        return getAccount(accountId).createVault(goalName, targetAmount, targetDate);
    }

    /**
     * Locks a specified amount into a GoalVault, reducing available balance.
     */
    public void lockFundsToVault(String accountId, String vaultId, BigDecimal amount) {
        getAccount(accountId).lockFundsToVault(vaultId, amount);
    }

    /**
     * Unlocks all funds from a GoalVault, restoring available balance.
     *
     * @return the amount that was released
     */
    public BigDecimal unlockVault(String accountId, String vaultId) {
        return getAccount(accountId).unlockVault(vaultId);
    }

    /**
     * Returns all GoalVaults for the given account.
     */
    public List<GoalVault> getVaults(String accountId) {
        return getAccount(accountId).getVaults();
    }

    /**
     * Safely parses a String amount value to a scaled BigDecimal.
     * Utility method used by controllers receiving request bodies as Map<String, String>.
     */
    public static BigDecimal parseAmount(String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) {
            throw new IllegalArgumentException("Amount field is required");
        }
        try {
            return new BigDecimal(rawAmount.trim()).setScale(2, RoundingMode.HALF_EVEN);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid amount format: '" + rawAmount + "'");
        }
    }
}
