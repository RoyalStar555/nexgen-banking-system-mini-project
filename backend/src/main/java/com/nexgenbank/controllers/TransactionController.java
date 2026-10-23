package com.nexgenbank.controllers;

import com.nexgenbank.models.*;
import com.nexgenbank.services.AccountService;
import com.nexgenbank.services.TransferService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * TransactionController — Write Operations (Deposit, Withdraw, Transfer, Vault, Beneficiary)
 *
 * Base path: /api
 *
 * Exposes:
 *   POST /api/accounts/{id}/deposit                     → deposit funds
 *   POST /api/accounts/{id}/withdraw                    → withdraw funds
 *   POST /api/accounts/transfer                         → atomic transfer
 *   POST /api/accounts/{id}/beneficiaries               → add beneficiary
 *   POST /api/accounts/{id}/vaults                      → create vault
 *   POST /api/accounts/{id}/vaults/{vaultId}/lock       → lock funds to vault
 *   POST /api/accounts/{id}/vaults/{vaultId}/unlock     → release vault funds
 */
@RestController
@RequestMapping("/api")
public class TransactionController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransferService transferService;

    @Autowired
    private AccountController accountController; // Reuse DTO builders

    // =========================================================================
    // POST /api/accounts/{accountId}/deposit
    // =========================================================================

    /**
     * Deposits funds into an account.
     *
     * Request body: { "amount": "1000.00" }
     */
    @PostMapping("/accounts/{accountId}/deposit")
    public ResponseEntity<Map<String, Object>> deposit(
            @PathVariable String accountId,
            @RequestBody Map<String, String> body) {

        BigDecimal amount = AccountService.parseAmount(body.get("amount"));
        Transaction tx = accountService.deposit(accountId, amount);
        BankAccount account = accountService.getAccount(accountId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transaction",       accountController.buildTransactionDto(tx));
        result.put("newAvailableBalance", account.getAvailableBalance());
        result.put("newTotalBalance",     account.getTotalBalance());

        return ResponseEntity.ok(accountController.success(result,
                "Deposit of ₹" + amount + " successful"));
    }

    // =========================================================================
    // POST /api/accounts/{accountId}/withdraw
    // =========================================================================

    /**
     * Withdraws funds from an account.
     * Delegates to the concrete account type for business rule enforcement.
     *
     * Request body: { "amount": "500.00" }
     */
    @PostMapping("/accounts/{accountId}/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(
            @PathVariable String accountId,
            @RequestBody Map<String, String> body) {

        BigDecimal amount = AccountService.parseAmount(body.get("amount"));
        Transaction tx = accountService.withdraw(accountId, amount);
        BankAccount account = accountService.getAccount(accountId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transaction",         accountController.buildTransactionDto(tx));
        result.put("newAvailableBalance", account.getAvailableBalance());
        result.put("newTotalBalance",     account.getTotalBalance());

        return ResponseEntity.ok(accountController.success(result,
                "Withdrawal of ₹" + amount + " successful"));
    }

    // =========================================================================
    // POST /api/accounts/transfer
    // =========================================================================

    /**
     * Executes an atomic fund transfer between two accounts.
     * TransferService handles deadlock-prevention and rollback.
     *
     * Request body: { "fromAccountId": "ACC001", "toAccountId": "ACC002", "amount": "2000.00" }
     */
    @PostMapping("/accounts/transfer")
    public ResponseEntity<Map<String, Object>> transfer(
            @RequestBody Map<String, String> body) {

        String fromId = body.get("fromAccountId");
        String toId   = body.get("toAccountId");
        if (fromId == null || fromId.isBlank()) {
            throw new IllegalArgumentException("fromAccountId is required");
        }
        if (toId == null || toId.isBlank()) {
            throw new IllegalArgumentException("toAccountId is required");
        }

        BigDecimal amount = AccountService.parseAmount(body.get("amount"));
        String remark = body.getOrDefault("remark", body.get("description"));
        transferService.executeTransfer(fromId, toId, amount, remark);

        BankAccount sender   = accountService.getAccount(fromId);
        BankAccount receiver = accountService.getAccount(toId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("senderAccountId",          fromId);
        result.put("receiverAccountId",         toId);
        result.put("senderHolderName",          sender.getHolderName());
        result.put("receiverHolderName",        receiver.getHolderName());
        result.put("amount",                    amount);
        result.put("remark",                    remark != null ? remark : "");
        result.put("senderNewAvailableBalance",  sender.getAvailableBalance());
        result.put("receiverNewAvailableBalance", receiver.getAvailableBalance());

        return ResponseEntity.ok(accountController.success(result,
                "Transfer of ₹" + amount + " to " + receiver.getHolderName() + " successful"));
    }

    // =========================================================================
    // POST /api/accounts/{accountId}/beneficiaries
    // =========================================================================

    /**
     * Adds a new beneficiary to the account.
     *
     * Request body: { "name": "Priya Mehta", "accountNumber": "ACC002", "ifscCode": "HDFC0001234" }
     */
    @PostMapping("/accounts/{accountId}/beneficiaries")
    public ResponseEntity<Map<String, Object>> addBeneficiary(
            @PathVariable String accountId,
            @RequestBody Map<String, String> body) {

        String name          = body.get("name");
        String accountNumber = body.get("accountNumber");
        String ifscCode      = body.getOrDefault("ifscCode", body.get("ifsc"));

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Beneficiary name is required");
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new IllegalArgumentException("Beneficiary accountNumber is required");
        }

        Beneficiary b = accountService.addBeneficiary(accountId, name, accountNumber,
                ifscCode != null ? ifscCode : "");

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("beneficiaryId",  b.getBeneficiaryId());
        dto.put("name",           b.getName());
        dto.put("accountNumber",  b.getAccountNumber());
        dto.put("ifscCode",       b.getIfscCode());
        dto.put("addedAt",        b.getAddedAt().toString());

        return ResponseEntity.ok(accountController.success(dto,
                "Beneficiary '" + name + "' added successfully"));
    }

    // =========================================================================
    // POST /api/accounts/{accountId}/vaults
    // =========================================================================

    /**
     * Creates a new GoalVault for the account.
     *
     * Request body: { "goalName": "iPhone 16 Fund", "targetAmount": "85000", "targetDate": "2025-06-30" }
     */
    @PostMapping("/accounts/{accountId}/vaults")
    public ResponseEntity<Map<String, Object>> createVault(
            @PathVariable String accountId,
            @RequestBody Map<String, String> body) {

        String goalName    = body.get("goalName");
        BigDecimal target  = AccountService.parseAmount(body.get("targetAmount"));
        String dateStr     = body.get("targetDate");

        if (goalName == null || goalName.isBlank()) {
            throw new IllegalArgumentException("goalName is required");
        }

        LocalDate targetDate = null;
        if (dateStr != null && !dateStr.isBlank()) {
            try {
                targetDate = LocalDate.parse(dateStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid targetDate format. Use yyyy-MM-dd");
            }
        }

        GoalVault vault = accountService.createVault(accountId, goalName, target, targetDate);

        return ResponseEntity.ok(accountController.success(
                accountController.buildVaultDto(vault),
                "Goal vault '" + goalName + "' created successfully"));
    }

    // =========================================================================
    // POST /api/accounts/{accountId}/vaults/{vaultId}/lock
    // =========================================================================

    /**
     * Locks a specified amount into a GoalVault, reducing available balance.
     *
     * Request body: { "amount": "5000.00" }
     */
    @PostMapping("/accounts/{accountId}/vaults/{vaultId}/lock")
    public ResponseEntity<Map<String, Object>> lockVault(
            @PathVariable String accountId,
            @PathVariable String vaultId,
            @RequestBody Map<String, String> body) {

        BigDecimal amount = AccountService.parseAmount(body.get("amount"));
        accountService.lockFundsToVault(accountId, vaultId, amount);

        BankAccount account = accountService.getAccount(accountId);
        GoalVault vault = account.getVaults().stream()
                .filter(v -> v.getVaultId().equals(vaultId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Vault not found: " + vaultId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vault",              accountController.buildVaultDto(vault));
        result.put("newAvailableBalance", account.getAvailableBalance());
        result.put("newLockedBalance",    account.getLockedBalance());

        return ResponseEntity.ok(accountController.success(result,
                "₹" + amount + " locked into vault '" + vault.getGoalName() + "'"));
    }

    // =========================================================================
    // POST /api/accounts/{accountId}/vaults/{vaultId}/unlock
    // =========================================================================

    /**
     * Releases all funds from a GoalVault back into the available balance.
     * No request body needed.
     */
    @PostMapping("/accounts/{accountId}/vaults/{vaultId}/unlock")
    public ResponseEntity<Map<String, Object>> unlockVault(
            @PathVariable String accountId,
            @PathVariable String vaultId) {

        BigDecimal released = accountService.unlockVault(accountId, vaultId);
        BankAccount account = accountService.getAccount(accountId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("releasedAmount",     released);
        result.put("newAvailableBalance", account.getAvailableBalance());
        result.put("newLockedBalance",    account.getLockedBalance());

        return ResponseEntity.ok(accountController.success(result,
                "₹" + released + " released from vault successfully"));
    }
}
