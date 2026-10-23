package com.nexgenbank.enums;

/**
 * Enum representing every possible transaction event in the ledger.
 * Each type maps to a distinct visual indicator in the frontend.
 */
public enum TransactionType {
    DEPOSIT,         // Incoming funds (credit)
    WITHDRAWAL,      // Outgoing funds (debit)
    TRANSFER_OUT,    // Sent to another account (debit)
    TRANSFER_IN,     // Received from another account (credit)
    OVERDRAFT_FEE,   // Penalty charged on CurrentAccount overdraft usage
    VAULT_LOCK,      // Funds locked into a GoalVault (debit from available)
    VAULT_UNLOCK     // Funds released from a GoalVault (credit to available)
}
