package com.nexgenbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * NexGen Banking System — Application Entry Point
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ANTI-GRAVITY FRAMEWORK: Decoupled REST API Architecture         │
 * │  Backend:  Spring Boot 3.2 | Java 17 | In-Memory Storage        │
 * │  Frontend: Vanilla ES2022 SPA (GitHub Pages / static host)      │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Starting the server:
 *   cd backend
 *   mvn spring-boot:run
 *
 * API Base URL:
 *   http://localhost:8080/api
 *
 * Key endpoints:
 *   GET  /api/accounts                   — List all accounts
 *   GET  /api/accounts/{id}              — Account detail
 *   POST /api/accounts/{id}/deposit      — Deposit funds
 *   POST /api/accounts/{id}/withdraw     — Withdraw funds
 *   POST /api/accounts/transfer          — Atomic transfer
 *   GET  /api/accounts/{id}/statement    — Paginated passbook
 *   GET  /api/accounts/{id}/vaults       — Goal vaults
 *   GET  /api/accounts/{id}/beneficiaries — Beneficiaries
 */
@SpringBootApplication
public class NexGenBankingApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexGenBankingApplication.class, args);
    }
}
