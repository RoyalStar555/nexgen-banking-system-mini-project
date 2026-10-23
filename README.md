<div align="center">

<h1>🏦 NexGen Banking System</h1>
<p><strong>Enterprise-Grade Full-Stack Banking Simulation · Anti-Gravity Framework</strong></p>

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-brightgreen?style=for-the-badge&logo=github)](https://royalstar555.github.io/nexgen-banking-system-mini-project/)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

<p align="center">
  🌐 <strong>Live Interactive Demo:</strong> <a href="https://royalstar555.github.io/nexgen-banking-system-mini-project/">https://royalstar555.github.io/nexgen-banking-system-mini-project/</a>
</p>

</div>

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [OOP Design Model](#oop-design-model)
- [Security Threat Model](#security-threat-model)
- [API Reference](#api-reference)
- [Local Development Setup](#local-development-setup)
- [Deployment Guide](#deployment-guide)
- [Environment Variables](#environment-variables)
- [Module Interconnection Map](#module-interconnection-map)

---

## Architecture Overview

NexGen Banking is built on the **Anti-Gravity Framework** — a strictly decoupled MVC paradigm where:

| Principle | Implementation |
|---|---|
| **Zero-State UI** | Frontend calculates nothing. All financial state comes from the Java backend. |
| **Immutable Ledger** | `Transaction` objects are 100% immutable (`final` fields, no setters). Past records never mutate. |
| **Atomic Transfers** | All multi-account operations use ordered `ReentrantLock` acquisition — rollback on any failure. |
| **Banker's Rounding** | All monetary math uses `BigDecimal` with `RoundingMode.HALF_EVEN`. `float`/`double` are banned. |
| **Decoupled Deployment** | Backend deploys independently to Render/Railway. Frontend deploys independently to GitHub Pages. |

---

## Directory Structure

```
nexgen_banking/                          ← Repository Root
│
├── .gitignore                           ← Excludes .class, node_modules, .env, IDE configs
├── README.md                            ← This file
│
├── backend/                             ← Spring Boot REST API (Java 17 + Maven)
│   ├── .env.example                     ← Environment variable template (copy → .env)
│   ├── pom.xml                          ← Maven build descriptor (deps: spring-boot-starter-web)
│   │
│   └── src/
│       └── main/
│           ├── java/
│           │   └── com/
│           │       └── nexgen/
│           │           └── banking/
│           │               │
│           │               ├── NexGenBankingApplication.java   ← @SpringBootApplication entry point
│           │               │
│           │               ├── config/
│           │               │   ├── CorsConfig.java             ← Global CORS filter (dev: *, prod: GitHub Pages URL)
│           │               │   └── DataSeeder.java             ← CommandLineRunner — pre-seeds demo accounts
│           │               │
│           │               ├── domain/
│           │               │   │
│           │               │   ├── enums/
│           │               │   │   ├── TransactionType.java    ← DEPOSIT | WITHDRAWAL | TRANSFER_OUT | TRANSFER_IN | OVERDRAFT_FEE | VAULT_LOCK | VAULT_UNLOCK
│           │               │   │   └── KycStatus.java          ← VERIFIED | PENDING | REJECTED
│           │               │   │
│           │               │   ├── interfaces/
│           │               │   │   ├── ITransactionOperations.java  ← Contract: deposit(), withdraw(), transfer()
│           │               │   │   └── IStatementGenerator.java     ← Contract: getStatement(start, end, page, size)
│           │               │   │
│           │               │   ├── model/                      ← Pure data structures / value objects
│           │               │   │   ├── Transaction.java        ← IMMUTABLE (all fields final, no setters)
│           │               │   │   ├── Beneficiary.java        ← Independent entity (aggregation)
│           │               │   │   └── GoalVault.java          ← Vault with lockedAmount + progressPercent
│           │               │   │
│           │               │   ├── account/                    ← OOP Hierarchy
│           │               │   │   ├── BankAccount.java        ← Abstract base (implements both interfaces)
│           │               │   │   ├── SavingsAccount.java     ← Overrides withdraw() + dailyLimit logic
│           │               │   │   └── CurrentAccount.java     ← Overrides withdraw() + overdraft logic
│           │               │   │
│           │               │   └── exceptions/                 ← Custom exception hierarchy
│           │               │       ├── InsufficientFundsException.java
│           │               │       ├── DailyLimitExceededException.java
│           │               │       ├── KycNotVerifiedException.java
│           │               │       ├── AccountNotFoundException.java
│           │               │       ├── BeneficiaryNotFoundException.java
│           │               │       ├── VaultNotFoundException.java
│           │               │       └── TransferFailedException.java
│           │               │
│           │               ├── service/                        ← Business logic + orchestration
│           │               │   ├── BankingService.java         ← Account registry (ConcurrentHashMap) + atomic ops
│           │               │   └── StatementService.java       ← Streams pipeline: filter → sort → paginate
│           │               │
│           │               └── api/                            ← HTTP layer (REST controllers + DTOs)
│           │                   ├── AccountController.java      ← All 12 REST endpoints
│           │                   ├── GlobalExceptionHandler.java ← @RestControllerAdvice → ApiResponse.failure()
│           │                   └── dto/
│           │                       ├── ApiResponse.java        ← Generic wrapper {success, message, data, timestamp}
│           │                       ├── AccountSummaryDto.java
│           │                       ├── AccountDetailDto.java
│           │                       ├── TransactionDto.java
│           │                       ├── BeneficiaryDto.java
│           │                       ├── GoalVaultDto.java
│           │                       ├── DepositRequest.java
│           │                       ├── WithdrawRequest.java
│           │                       ├── TransferRequest.java
│           │                       ├── BeneficiaryRequest.java
│           │                       ├── VaultCreateRequest.java
│           │                       └── VaultLockRequest.java
│           │
│           └── resources/
│               └── application.properties                      ← server.port, Jackson config, log levels
│
└── frontend/                            ← Vanilla SPA (Zero-dependency, ES2022 Modules)
    ├── .env.example                     ← Frontend environment variable template
    │
    ├── public/
    │   └── index.html                   ← DOM shell only — zero inline styles, zero inline scripts
    │
    ├── assets/
    │   ├── icons/                       ← SVG icons (inline in JS via createElementNS)
    │   ├── images/                      ← Static imagery if needed
    │   └── fonts/                       ← Self-hosted font fallback (Plus Jakarta Sans)
    │
    ├── css/
    │   ├── design-tokens.css            ← CSS custom properties: colors, spacing, radius, shadows, z-index
    │   ├── components.css               ← Glassmorphism cards, buttons, badges, toasts, skeletons, modals
    │   ├── layout.css                   ← 12-col CSS Grid, sidebar, responsive breakpoints (768px, 1024px)
    │   └── animations.css               ← @keyframes: shimmer, fadeIn, slideInRight, spin, fillProgress, pulse
    │
    └── js/
        ├── config.js                    ← ENV-aware API base URL (localhost ↔ production cloud URL)
        ├── api.js                       ← ApiClient class: fetch interceptor, error toasts, button locking
        ├── state.js                     ← Immutable state store: getState(), setState(), subscribe()
        ├── router.js                    ← Hash-based SPA router: #/dashboard, #/deposit, #/withdraw, etc.
        ├── utils.js                     ← formatCurrency (Intl), formatDate, showToast, createSkeleton, animateNumber
        ├── app.js                       ← Entry point: init, account-switcher, sidebar, route boot
        │
        └── views/
            ├── dashboard.js             ← Hero balance card, quick stats, recent transactions, vault overview
            ├── deposit.js               ← Amount form, quick presets, receipt block
            ├── withdraw.js              ← Amount form, available balance display, daily limit indicator
            ├── transfer.js              ← Beneficiary selector, confirmation modal, add-beneficiary inline form
            ├── passbook.js              ← Date-range filter, paginated table/cards, skeleton loader, CSV download
            └── vault.js                 ← Vault cards, progress bars, lock/unlock controls, create-vault form
```

---

## OOP Design Model

```
«interface»                    «interface»
ITransactionOperations         IStatementGenerator
  + deposit()                    + getStatement()
  + withdraw()
  + transfer()
        ↑                              ↑
        └──────────────┬──────────────┘
                       │ implements
                ┌──────┴──────┐
                │  BankAccount │  «abstract»
                │  (abstract)  │
                │ ─────────── │
                │ # totalBal  │◄── Composition ── List<Transaction> (immutable TXs)
                │ # lockedBal │◄── Composition ── List<GoalVault>
                │ # lock:     │◄── Aggregation ── List<Beneficiary>
                │ ReentrantLck│
                │             │
                │ getAvailable│ = totalBal − lockedBal
                │ deposit()   │ concrete — acquires lock, validates, logs TX
                │ withdraw()  │ abstract ← forced override
                └──────┬──────┘
          ┌────────────┴────────────┐
          │                         │
  ┌───────┴──────┐         ┌────────┴──────┐
  │SavingsAccount│         │CurrentAccount │
  │ ──────────── │         │ ────────────  │
  │ dailyLimit   │         │ overdraftLimit│
  │ dailyWithdrn │         │ overdraftFee  │
  │              │         │               │
  │ withdraw()   │         │ withdraw()    │
  │ ─ reset daily│         │ ─ allow neg   │
  │   counter    │         │   balance up  │
  │ ─ limit check│         │   to limit    │
  └──────────────┘         │ ─ auto-charge │
                           │   fee TX      │
                           └───────────────┘
```

---

## Security Threat Model

| # | Vulnerability | Attack Vector | Mitigation |
|---|---|---|---|
| 1 | **Race Condition / Double-Spend** | Concurrent withdrawal requests drain more than available funds | `ReentrantLock(fair=true)` per account; ordered acquisition by accountNumber prevents deadlock |
| 2 | **Unsigned Input Exploitation** | Negative deposit inflates balance; negative withdraw reduces it | `if (amount.compareTo(ZERO) <= 0) throw IllegalArgumentException` at the top of every financial method |
| 3 | **DOM Injection / XSS** | `<script>alert(1)</script>` in Beneficiary Name renders and executes | All DOM writes use `.textContent` exclusively; `.innerHTML` is banned across the entire codebase |
| 4 | **Vault Bypass** | Locking ₹40K of ₹50K, then withdrawing ₹50K (ignoring the lock) | `getAvailableBalance() = totalBalance − lockedBalance`; all withdraw/transfer checks against this value |

---

## API Reference

**Base URL (Dev):** `http://localhost:8080/api`
**Base URL (Prod):** `https://nexgen-banking-api.onrender.com/api`

All responses follow this envelope:
```json
{
  "success": true,
  "message": "Deposit successful",
  "data": { ... },
  "timestamp": "2024-01-01T10:00:00",
  "error": null
}
```

### Accounts

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/accounts` | List all account summaries | — |
| `GET` | `/accounts/{id}` | Full account detail | — |
| `POST` | `/accounts/{id}/deposit` | Deposit funds | `{"amount": "1000.00"}` |
| `POST` | `/accounts/{id}/withdraw` | Withdraw funds | `{"amount": "500.00"}` |
| `POST` | `/accounts/transfer` | Atomic transfer | `{"fromAccountId":"ACC001","toAccountId":"ACC002","amount":"200.00"}` |

### Statement / Passbook

| Method | Endpoint | Description | Query Params |
|---|---|---|---|
| `GET` | `/accounts/{id}/statement` | Paginated transaction history | `startDate`, `endDate`, `page`, `size` |

### Beneficiaries

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/accounts/{id}/beneficiaries` | List beneficiaries | — |
| `POST` | `/accounts/{id}/beneficiaries` | Add beneficiary | `{"name":"...","accountNumber":"...","ifscCode":"..."}` |

### Goal Vaults

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/accounts/{id}/vaults` | List all vaults | — |
| `POST` | `/accounts/{id}/vaults` | Create vault | `{"goalName":"...","targetAmount":"85000","targetDate":"2025-12-31"}` |
| `POST` | `/accounts/{id}/vaults/{vaultId}/lock` | Lock funds into vault | `{"amount":"5000.00"}` |
| `POST` | `/accounts/{id}/vaults/{vaultId}/unlock` | Unlock/break vault | — |

### HTTP Status Code Reference

| Code | Meaning |
|---|---|
| `200 OK` | Success |
| `400 Bad Request` | Negative amount, missing required field |
| `403 Forbidden` | KYC not verified |
| `404 Not Found` | Account / beneficiary / vault not found |
| `409 Conflict` | Insufficient funds, daily limit exceeded |
| `500 Internal Server Error` | Transfer rollback failure |

---

## Local Development Setup

### Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| JDK | 17 | `java -version` |
| Maven | 3.8+ | `mvn -version` |
| Any modern browser | — | Chrome / Firefox / Edge |

### Step 1 — Clone & Configure

```bash
git clone https://github.com/RoyalStar555/nexgen-banking-system-mini-project.git
cd nexgen-banking-system-mini-project
```

### Step 2 — Start the Backend

```bash
cd backend
# Copy env template (optional — defaults work out of the box)
copy .env.example .env

# Compile and run Spring Boot
mvn spring-boot:run
```

Backend starts at **http://localhost:8080**
Seeded accounts: `ACC001` (Savings) and `ACC002` (Current) are ready.

### Step 3 — Open the Frontend

```bash
# Option A: Open directly in browser (works for basic testing)
start frontend\public\index.html

# Option B: Serve via a static server (recommended for ES Modules)
npx -y serve frontend/public -p 3000
# OR
python -m http.server 3000 --directory frontend/public
```

Frontend available at **http://localhost:3000**

### Verification

```bash
# Test deposit endpoint
curl -X POST http://localhost:8080/api/accounts/ACC001/deposit \
     -H "Content-Type: application/json" \
     -d "{\"amount\": \"5000.00\"}"

# Test negative amount (should return 400)
curl -X POST http://localhost:8080/api/accounts/ACC001/deposit \
     -H "Content-Type: application/json" \
     -d "{\"amount\": \"-100.00\"}"

# Test atomic transfer
curl -X POST http://localhost:8080/api/accounts/transfer \
     -H "Content-Type: application/json" \
     -d "{\"fromAccountId\":\"ACC001\",\"toAccountId\":\"ACC002\",\"amount\":\"1000.00\"}"
```

---

## Deployment Guide

### Backend → Render (Free Tier)

1. Push `backend/` to a GitHub repository (or as a subfolder)
2. Create a new **Web Service** on [render.com](https://render.com)
3. **Build Command:** `mvn clean package -DskipTests`
4. **Start Command:** `java -jar target/nexgen-banking-*.jar`
5. Set Environment Variable: `SERVER_PORT=10000` (Render assigns this automatically)
6. Copy the live URL (e.g., `https://nexgen-banking-api.onrender.com`)

### Frontend → GitHub Pages

1. Update `frontend/js/config.js`:
   ```javascript
   // Replace the prod URL with your Render URL
   API_BASE_URL: isProd ? 'https://nexgen-banking-api.onrender.com/api' : 'http://localhost:8080/api'
   ```
2. Push the `frontend/public/` directory to a `gh-pages` branch:
   ```bash
   git subtree push --prefix frontend/public origin gh-pages
   ```
3. Enable GitHub Pages: **Repo Settings → Pages → Source: gh-pages branch**

### Backend CORS — Switch from Dev to Prod

In `CorsConfig.java`, change:
```java
// DEV
.allowedOrigins("*")

// PROD — restrict to your GitHub Pages domain
.allowedOrigins("https://royalstar555.github.io")
```

---

## Environment Variables

### Backend (`backend/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Port the Spring Boot server listens on |
| `SERVER_ENV` | `development` | Environment profile |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated allowed origins for CORS |
| `PERSISTENCE_ENABLED` | `false` | Enable flat-file JSON persistence |
| `SEED_ENABLED` | `true` | Pre-seed demo accounts on startup |
| `SEED_SAVINGS_BALANCE` | `150000.00` | Initial balance for ACC001 |
| `SEED_CURRENT_BALANCE` | `500000.00` | Initial balance for ACC002 |
| `LOG_LEVEL` | `DEBUG` | Logging verbosity |
| `JWT_SECRET` | `CHANGE_ME` | ⚠️ Change before production |

### Frontend (`frontend/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL_DEV` | `http://localhost:8080/api` | Dev API target |
| `VITE_API_BASE_URL_PROD` | `https://...onrender.com/api` | Prod API target |
| `VITE_FEATURE_VAULT` | `true` | Toggle vault screen visibility |
| `VITE_PAGE_SIZE` | `10` | Transactions per passbook page |
| `VITE_TOAST_DURATION_MS` | `4000` | Toast auto-dismiss duration |

---

## Module Interconnection Map

This describes how the modules **reference each other** — the dependency graph of the system.

### Backend Module References

```
NexGenBankingApplication
    └── @SpringBootApplication → scans com.nexgen.banking.*

DataSeeder (config)
    └── uses → BankingService (service)
                └── uses → SavingsAccount, CurrentAccount (domain/account)
                            └── extends → BankAccount (domain/account)
                                          └── implements → ITransactionOperations (domain/interfaces)
                                          └── implements → IStatementGenerator (domain/interfaces)
                                          └── composes  → Transaction (domain/model) [IMMUTABLE]
                                          └── composes  → GoalVault (domain/model)
                                          └── aggregates→ Beneficiary (domain/model)
                                          └── uses      → ReentrantLock (java.util.concurrent)

AccountController (api)
    └── @Autowired → BankingService (service)
    └── @Autowired → StatementService (service)
    └── returns    → ApiResponse<T> (api/dto) wrapping TransactionDto, AccountDetailDto, etc.
    └── accepts    → DepositRequest, WithdrawRequest, TransferRequest (api/dto)

GlobalExceptionHandler (api)
    └── catches → InsufficientFundsException, DailyLimitExceededException, etc. (domain/exceptions)
    └── returns → ApiResponse.failure(message, errorCode) (api/dto)

StatementService (service)
    └── uses → BankingService.getAccount() (service)
    └── uses → Java Streams API on Transaction list
    └── returns → PagedResult<TransactionDto> (api/dto)

CorsConfig (config)
    └── implements → WebMvcConfigurer (Spring)
    └── reads → CORS_ALLOWED_ORIGINS (application.properties / .env)
```

### Frontend Module References

```
index.html (public)
    └── loads (CSS) → design-tokens.css → variables consumed by components.css, layout.css, animations.css
    └── loads (JS, type=module) → app.js

app.js
    └── imports → config.js    (API_BASE_URL, feature flags)
    └── imports → api.js       (ApiClient singleton)
    └── imports → state.js     (getState, setState, subscribe)
    └── imports → router.js    (navigate, register routes)
    └── imports → utils.js     (showToast, formatCurrency)
    └── imports → dashboard.js, deposit.js, withdraw.js, transfer.js, passbook.js, vault.js
    └── on init: fetches all accounts → setState → router.navigate('#/dashboard')

api.js (ApiClient)
    └── imports → config.js    (reads API_BASE_URL)
    └── imports → utils.js     (calls showToast on NetworkError)
    └── all fetch() calls wrap responses → returns only .data field on success
    └── on error: calls showToast(message, 'error') — never breaks the page

router.js
    └── listens → window hashchange event
    └── calls   → view.mount(container) on route match
    └── calls   → view.unmount() on route leave

dashboard.js / deposit.js / withdraw.js / transfer.js / passbook.js / vault.js
    └── import → api.js        (for data fetching)
    └── import → state.js      (to read current account, account list)
    └── import → utils.js      (formatCurrency, showToast, setButtonLoading, animateNumber)
    └── write DOM → ONLY via textContent / setAttribute / createElement (NEVER innerHTML)
    └── on any button click → setButtonLoading(btn, true) → api call → setButtonLoading(btn, false)
```

---

## Tech Stack Summary

| Concern | Technology | Why |
|---|---|---|
| Domain OOP | Java 17 | `BigDecimal`, `ReentrantLock`, `abstract`/`interface` — explicit OOP |
| REST API | Spring Boot 3.2 | Industry standard, resume-ready, built-in CORS + Jackson |
| Serialization | Jackson (bundled) | Spring Boot default, annotation-driven JSON mapping |
| Frontend | ES2022 Modules | Native browser modules — zero build tool, maximum portability |
| Styling | CSS3 Custom Properties | Design tokens, glassmorphism, responsive grid — no frameworks |
| Backend Hosting | Render (free tier) | Supports Java JAR, free SSL, auto-deploy from GitHub |
| Frontend Hosting | GitHub Pages | Static hosting, free, integrates with GitHub CI |

---

<div align="center">

**Built with the Anti-Gravity Framework · Domain-Driven Design · Zero Compromises**

*Academic & Industry-Grade · OOP Maximization · Thread-Safe · XSS-Hardened*

</div>
