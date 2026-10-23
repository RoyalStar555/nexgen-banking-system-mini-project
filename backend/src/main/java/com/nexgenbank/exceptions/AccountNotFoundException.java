package com.nexgenbank.exceptions;

/**
 * Exception thrown when an account with a specified accountId
 * cannot be found in the registry.
 */
public class AccountNotFoundException extends RuntimeException {
    private final String errorCode = "ACCOUNT_NOT_FOUND";

    public AccountNotFoundException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return errorCode;
    }
}
