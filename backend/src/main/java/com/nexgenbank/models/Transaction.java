package com.nexgenbank.models;

import com.nexgenbank.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable ledger entry representing an atomic financial transaction.
 * All fields are final and no mutating operations or setters are exposed.
 */
public final class Transaction {

    private final String transactionId;
    private final TransactionType type;
    private final BigDecimal amount;
    private final BigDecimal balanceAfter;
    private final LocalDateTime timestamp;
    private final String description;
    private final String referenceId;

    /**
     * Constructs a new Transaction with an automatically generated UUID and current timestamp.
     *
     * @param type         the transaction event type
     * @param amount       the monetary amount involved
     * @param balanceAfter the ledger balance after this transaction
     * @param description  human-readable audit log description
     * @param referenceId  optional correlation reference ID (e.g. linking transfer legs)
     */
    public Transaction(TransactionType type, BigDecimal amount, BigDecimal balanceAfter,
                       String description, String referenceId) {
        this(UUID.randomUUID().toString(), type, amount, balanceAfter, LocalDateTime.now(), description, referenceId);
    }

    /**
     * Constructs a Transaction with explicit parameters.
     * Useful for historical ledger entries or data seeder initialization.
     *
     * @param transactionId unique identifier
     * @param type          the transaction event type
     * @param amount        the monetary amount involved
     * @param balanceAfter  the ledger balance after this transaction
     * @param timestamp     the exact timestamp of transaction occurrence
     * @param description   human-readable audit log description
     * @param referenceId   optional correlation reference ID
     */
    public Transaction(String transactionId, TransactionType type, BigDecimal amount,
                       BigDecimal balanceAfter, LocalDateTime timestamp, String description,
                       String referenceId) {
        this.transactionId = transactionId;
        this.type = type;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.timestamp = timestamp;
        this.description = description;
        this.referenceId = referenceId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public TransactionType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public String getDescription() {
        return description;
    }

    public String getReferenceId() {
        return referenceId;
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "transactionId='" + transactionId + '\'' +
                ", type=" + type +
                ", amount=" + amount +
                ", balanceAfter=" + balanceAfter +
                ", timestamp=" + timestamp +
                ", description='" + description + '\'' +
                ", referenceId='" + referenceId + '\'' +
                '}';
    }
}
