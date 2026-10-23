package com.nexgenbank.controllers;

import com.nexgenbank.models.*;
import com.nexgenbank.models.SavingsAccount;
import com.nexgenbank.models.CurrentAccount;
import com.nexgenbank.services.AccountService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * AccountController — Read Operations for Account Data
 *
 * Base path: /api
 *
 * Exposes:
 *   GET  /api/accounts              → all account summaries
 *   GET  /api/accounts/{id}         → full account detail
 *   GET  /api/accounts/{id}/statement     → paginated, date-filtered passbook
 *   GET  /api/accounts/{id}/beneficiaries → beneficiary list
 *   GET  /api/accounts/{id}/vaults         → goal vault list
 */
@RestController
@RequestMapping("/api")
public class AccountController {

    @Autowired
    private AccountService accountService;

    // =========================================================================
    // GET /api/accounts
    // =========================================================================

    /**
     * Returns a summary list of all registered accounts.
     * Response includes balances, account type, and KYC status.
     */
    @GetMapping("/accounts")
    public ResponseEntity<Map<String, Object>> getAllAccounts() {
        List<BankAccount> accounts = accountService.getAllAccounts();
        List<Map<String, Object>> summaries = new ArrayList<>();

        for (BankAccount acc : accounts) {
            summaries.add(buildSummary(acc));
        }

        return ResponseEntity.ok(success(summaries, "Accounts retrieved successfully"));
    }

    @PostMapping("/accounts")
    public ResponseEntity<Map<String, Object>> createAccount(@RequestBody Map<String, Object> body) {
        String holderName = (String) body.getOrDefault("holderName", body.get("name"));
        if (holderName == null || holderName.isBlank()) {
            holderName = "New Customer";
        }
        String accountType = (String) body.getOrDefault("accountType", "SavingsAccount");
        BigDecimal initialDeposit = BigDecimal.ZERO;
        if (body.containsKey("initialDeposit")) {
            initialDeposit = AccountService.parseAmount(body.get("initialDeposit").toString());
        }

        int count = accountService.getAllAccounts().size() + 1;
        String nextId = "ACC" + String.format("%03d", count);
        String accountNumber = (accountType.startsWith("Cur") ? "CUR" : "SAV") + "-2024-" + String.format("%03d", count);

        BankAccount newAcc;
        if (accountType.startsWith("Cur")) {
            newAcc = new CurrentAccount(nextId, accountNumber, holderName, initialDeposit);
        } else {
            newAcc = new SavingsAccount(nextId, accountNumber, holderName, initialDeposit);
        }
        newAcc.setKycStatus(com.nexgenbank.enums.KycStatus.VERIFIED);
        accountService.registerAccount(newAcc);

        if (initialDeposit.compareTo(BigDecimal.ZERO) > 0) {
            newAcc.creditBalance(initialDeposit);
            newAcc.logTransaction(com.nexgenbank.enums.TransactionType.DEPOSIT, initialDeposit, "Initial account opening deposit", null);
        }

        return ResponseEntity.ok(success(buildSummary(newAcc), "Account created successfully"));
    }

    // =========================================================================
    // GET /api/accounts/{accountId}
    // =========================================================================

    /**
     * Returns full account detail, including type-specific fields,
     * vault count, beneficiary count, and transaction count.
     */
    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<Map<String, Object>> getAccount(
            @PathVariable String accountId) {

        BankAccount acc = accountService.getAccount(accountId);
        Map<String, Object> detail = new LinkedHashMap<>(buildSummary(acc));

        // Extended fields
        detail.put("transactionCount", acc.getTransactionHistory().size());
        detail.put("beneficiaryCount", acc.getBeneficiaries().size());
        detail.put("vaultCount", acc.getVaults().size());
        detail.put("createdAt", acc.getCreatedAt().toString());

        // Type-specific fields
        if (acc instanceof SavingsAccount savings) {
            detail.put("accountType", "SavingsAccount");
            detail.put("dailyWithdrawalLimit",   savings.getDailyWithdrawalLimit());
            detail.put("dailyWithdrawnAmount",   savings.getDailyWithdrawnAmount());
            detail.put("remainingDailyLimit",    savings.getRemainingDailyLimit());
        } else if (acc instanceof CurrentAccount current) {
            detail.put("accountType", "CurrentAccount");
            detail.put("overdraftLimit",         current.getOverdraftLimit());
            detail.put("overdraftFee",           current.getOverdraftFee());
            detail.put("currentOverdraftUsed",   current.getCurrentOverdraftUsed());
        }

        return ResponseEntity.ok(success(detail, "Account detail retrieved successfully"));
    }

    // =========================================================================
    // GET /api/accounts/{accountId}/statement
    // =========================================================================

    /**
     * Returns a paginated list of transactions filtered by date range.
     *
     * Query params:
     *   startDate  (yyyy-MM-dd) — defaults to 30 days ago
     *   endDate    (yyyy-MM-dd) — defaults to today
     *   page       (int, 0-indexed) — default 0
     *   size       (int) — default 10
     */
    @GetMapping("/accounts/{accountId}/statement")
    public ResponseEntity<Map<String, Object>> getStatement(
            @PathVariable String accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        // Default date range: last 30 days → today
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        if (startDate == null) {
            startDate = endDate.minusDays(30);
        }

        if (page < 0) page = 0;
        if (size < 1) size = 10;
        if (size > 100) size = 100;

        List<Transaction> transactions = accountService.getStatement(accountId, startDate, endDate, page, size);
        long totalCount = accountService.getStatementTotalCount(accountId, startDate, endDate);
        int totalPages = (int) Math.ceil((double) totalCount / size);

        List<Map<String, Object>> txDtos = new ArrayList<>();
        for (Transaction tx : transactions) {
            txDtos.add(buildTransactionDto(tx));
        }

        Map<String, Object> paginated = new LinkedHashMap<>();
        paginated.put("content", txDtos);
        paginated.put("totalElements", totalCount);
        paginated.put("totalPages", totalPages);
        paginated.put("currentPage", page);
        paginated.put("pageSize", size);
        paginated.put("startDate", startDate.toString());
        paginated.put("endDate", endDate.toString());

        return ResponseEntity.ok(success(paginated, "Statement retrieved successfully"));
    }

    // =========================================================================
    // GET /api/accounts/{accountId}/beneficiaries
    // =========================================================================

    @GetMapping("/accounts/{accountId}/beneficiaries")
    public ResponseEntity<Map<String, Object>> getBeneficiaries(
            @PathVariable String accountId) {

        List<Beneficiary> beneficiaries = accountService.getBeneficiaries(accountId);
        List<Map<String, Object>> dtos = new ArrayList<>();

        for (Beneficiary b : beneficiaries) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("beneficiaryId",  b.getBeneficiaryId());
            dto.put("name",           b.getName());
            dto.put("accountNumber",  b.getAccountNumber());
            dto.put("ifscCode",       b.getIfscCode());
            dto.put("kycStatus",      b.getKycStatus().name());
            dto.put("addedAt",        b.getAddedAt().toString());
            dtos.add(dto);
        }

        return ResponseEntity.ok(success(dtos, "Beneficiaries retrieved successfully"));
    }

    // =========================================================================
    // GET /api/accounts/{accountId}/vaults
    // =========================================================================

    @GetMapping("/accounts/{accountId}/vaults")
    public ResponseEntity<Map<String, Object>> getVaults(
            @PathVariable String accountId) {

        List<GoalVault> vaults = accountService.getVaults(accountId);
        List<Map<String, Object>> dtos = new ArrayList<>();

        for (GoalVault v : vaults) {
            dtos.add(buildVaultDto(v));
        }

        return ResponseEntity.ok(success(dtos, "Vaults retrieved successfully"));
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private Map<String, Object> buildSummary(BankAccount acc) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("accountId",         acc.getAccountId());
        map.put("accountNumber",     acc.getAccountNumber());
        map.put("holderName",        acc.getHolderName());
        map.put("accountType",       acc.getClass().getSimpleName());
        map.put("kycStatus",         acc.getKycStatus().name());
        map.put("totalBalance",      acc.getTotalBalance());
        map.put("lockedBalance",     acc.getLockedBalance());
        map.put("availableBalance",  acc.getAvailableBalance());
        return map;
    }

    Map<String, Object> buildTransactionDto(Transaction tx) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("transactionId", tx.getTransactionId());
        dto.put("type",          tx.getType().name());
        dto.put("amount",        tx.getAmount());
        dto.put("balanceAfter",  tx.getBalanceAfter());
        dto.put("timestamp",     tx.getTimestamp().toString());
        dto.put("description",   tx.getDescription());
        dto.put("referenceId",   tx.getReferenceId());
        return dto;
    }

    Map<String, Object> buildVaultDto(GoalVault v) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("vaultId",         v.getVaultId());
        dto.put("goalName",        v.getGoalName());
        dto.put("targetAmount",    v.getTargetAmount());
        dto.put("lockedAmount",    v.getLockedAmount());
        dto.put("progressPercent", v.getProgressPercent());
        dto.put("targetDate",      v.getTargetDate() != null ? v.getTargetDate().toString() : null);
        dto.put("createdAt",       v.getCreatedAt().toString());
        return dto;
    }

    /** Standard success envelope for all responses. */
    Map<String, Object> success(Object data, String message) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success",   true);
        res.put("message",   message);
        res.put("data",      data);
        res.put("timestamp", LocalDateTime.now().toString());
        return res;
    }
}
