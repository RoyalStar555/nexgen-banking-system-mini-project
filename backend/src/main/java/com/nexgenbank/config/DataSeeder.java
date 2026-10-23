package com.nexgenbank.config;

import com.nexgenbank.enums.KycStatus;
import com.nexgenbank.models.*;
import com.nexgenbank.services.AccountService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DataSeeder — Startup Data Initializer
 *
 * Seeds two realistic demo accounts with transactions, beneficiaries, and goal vaults
 * so the frontend dashboard loads with meaningful data on first launch.
 *
 * Seeded Accounts:
 *   ACC001 — Rahul Sharma's Savings Account (₹1,50,000 opening balance)
 *   ACC002 — NexGen Tech Pvt. Ltd. Current Account (₹5,00,000 opening balance)
 *
 * Run order: Executes after the Spring context is fully loaded.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private AccountService accountService;

    @Override
    public void run(String... args) {
        log.info("=== NexGen Banking DataSeeder: Initializing demo accounts ===");

        try {
            seedSavingsAccount();
        } catch (Exception e) {
            log.error("Failed to seed savings account ACC001: {}", e.getMessage(), e);
        }

        try {
            seedCurrentAccount();
        } catch (Exception e) {
            log.error("Failed to seed current account ACC002: {}", e.getMessage(), e);
        }

        try {
            seedPriyaMehtaAccount();
        } catch (Exception e) {
            log.error("Failed to seed savings account ACC003: {}", e.getMessage(), e);
        }

        log.info("=== DataSeeder complete. Accounts seeded: ACC001, ACC002, ACC003 ===");
    }

    // =========================================================================
    // ACC001 — Savings Account (Rahul Sharma)
    // =========================================================================

    private void seedSavingsAccount() {
        SavingsAccount savings = new SavingsAccount(
                "ACC001",
                "SAV-2024-001",
                "Rahul Sharma",
                new BigDecimal("150000.00")
        );
        savings.setKycStatus(KycStatus.VERIFIED);
        accountService.registerAccount(savings);
        log.info("Registered ACC001 — Rahul Sharma (Savings, ₹1,50,000)");

        // ── Seed realistic transaction history ─────────────────────────────────────
        // Salary credit
        accountService.deposit("ACC001", new BigDecimal("85000.00"));
        log.info("  [ACC001] +₹85,000.00 — Monthly salary credited");

        // Grocery
        accountService.withdraw("ACC001", new BigDecimal("3500.00"));
        log.info("  [ACC001] -₹3,500.00 — BigBasket grocery");

        // Electricity bill
        accountService.withdraw("ACC001", new BigDecimal("2200.00"));
        log.info("  [ACC001] -₹2,200.00 — BESCOM electricity bill");

        // OTT subscription
        accountService.withdraw("ACC001", new BigDecimal("649.00"));
        log.info("  [ACC001] -₹649.00 — Netflix subscription");

        // Gym membership
        accountService.withdraw("ACC001", new BigDecimal("1500.00"));
        log.info("  [ACC001] -₹1,500.00 — Cult.fit gym membership");

        // ── Beneficiaries ──────────────────────────────────────────────────────────
        accountService.addBeneficiary("ACC001", "NexGen Tech Pvt. Ltd.", "ACC002", "HDFC0001234");
        accountService.addBeneficiary("ACC001", "Priya Mehta", "ACC003", "ICIC0005678");
        log.info("  [ACC001] Beneficiaries added: NexGen Tech (ACC002), Priya Mehta (ACC003)");

        // ── Goal Vault: iPhone 16 Fund ─────────────────────────────────────────────
        GoalVault phoneVault = accountService.createVault(
                "ACC001",
                "iPhone 16 Fund",
                new BigDecimal("85000.00"),
                LocalDate.of(2025, 6, 30)
        );
        accountService.lockFundsToVault("ACC001", phoneVault.getVaultId(), new BigDecimal("20000.00"));
        log.info("  [ACC001] Vault created: '{}' — Locked ₹20,000", phoneVault.getGoalName());

        // ── Goal Vault: Europe Trip Fund ───────────────────────────────────────────
        GoalVault tripVault = accountService.createVault(
                "ACC001",
                "Europe Trip 2025",
                new BigDecimal("200000.00"),
                LocalDate.of(2025, 12, 15)
        );
        accountService.lockFundsToVault("ACC001", tripVault.getVaultId(), new BigDecimal("15000.00"));
        log.info("  [ACC001] Vault created: '{}' — Locked ₹15,000", tripVault.getGoalName());
    }

    // =========================================================================
    // ACC002 — Current Account (NexGen Tech Pvt. Ltd.)
    // =========================================================================

    private void seedCurrentAccount() {
        CurrentAccount current = new CurrentAccount(
                "ACC002",
                "CUR-2024-001",
                "NexGen Tech Pvt. Ltd.",
                new BigDecimal("500000.00")
        );
        current.setKycStatus(KycStatus.VERIFIED);
        accountService.registerAccount(current);
        log.info("Registered ACC002 — NexGen Tech Pvt. Ltd. (Current, ₹5,00,000)");

        // ── Seed business transactions ─────────────────────────────────────────────
        // Client payment received
        accountService.deposit("ACC002", new BigDecimal("250000.00"));
        log.info("  [ACC002] +₹2,50,000.00 — Client invoice payment");

        // Office rent
        accountService.withdraw("ACC002", new BigDecimal("45000.00"));
        log.info("  [ACC002] -₹45,000.00 — Office rent");

        // Cloud infrastructure
        accountService.withdraw("ACC002", new BigDecimal("12800.00"));
        log.info("  [ACC002] -₹12,800.00 — AWS bill");

        // Payroll run
        accountService.withdraw("ACC002", new BigDecimal("180000.00"));
        log.info("  [ACC002] -₹1,80,000.00 — Payroll disbursement");

        // Software license
        accountService.withdraw("ACC002", new BigDecimal("8500.00"));
        log.info("  [ACC002] -₹8,500.00 — GitHub Teams annual license");

        // ── Beneficiaries ──────────────────────────────────────────────────────────
        accountService.addBeneficiary("ACC002", "Rahul Sharma", "ACC001", "SBIN0001234");
        accountService.addBeneficiary("ACC002", "Priya Mehta", "ACC003", "ICIC0005678");
        log.info("  [ACC002] Beneficiaries added: Rahul Sharma (ACC001), Priya Mehta (ACC003)");

        // ── Goal Vault: Q4 Tax Reserve ─────────────────────────────────────────────
        GoalVault taxVault = accountService.createVault(
                "ACC002",
                "Q4 Tax Reserve",
                new BigDecimal("200000.00"),
                LocalDate.of(2025, 3, 31)
        );
        accountService.lockFundsToVault("ACC002", taxVault.getVaultId(), new BigDecimal("75000.00"));
        log.info("  [ACC002] Vault created: '{}' — Locked ₹75,000", taxVault.getGoalName());

        // ── Goal Vault: Office Expansion Fund ─────────────────────────────────────
        GoalVault expansionVault = accountService.createVault(
                "ACC002",
                "Office Expansion Fund",
                new BigDecimal("500000.00"),
                LocalDate.of(2025, 9, 30)
        );
        accountService.lockFundsToVault("ACC002", expansionVault.getVaultId(), new BigDecimal("50000.00"));
        log.info("  [ACC002] Vault created: '{}' — Locked ₹50,000", expansionVault.getGoalName());
    }

    // =========================================================================
    // ACC003 — Savings Account (Priya Mehta)
    // =========================================================================

    private void seedPriyaMehtaAccount() {
        SavingsAccount priya = new SavingsAccount(
                "ACC003",
                "SAV-2024-003",
                "Priya Mehta",
                new BigDecimal("75000.00")
        );
        priya.setKycStatus(KycStatus.VERIFIED);
        accountService.registerAccount(priya);
        log.info("Registered ACC003 — Priya Mehta (Savings, ₹75,000)");

        accountService.deposit("ACC003", new BigDecimal("75000.00"));
        accountService.addBeneficiary("ACC003", "Rahul Sharma", "ACC001", "SBIN0001234");
        accountService.addBeneficiary("ACC003", "NexGen Tech Pvt. Ltd.", "ACC002", "HDFC0001234");
        log.info("  [ACC003] Beneficiaries added: Rahul Sharma (ACC001), NexGen Tech (ACC002)");
    }
}
