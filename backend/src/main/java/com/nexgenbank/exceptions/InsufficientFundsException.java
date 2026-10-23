package com.nexgenbank.exceptions;

/**
 * Exception thrown when an account has insufficient available funds
 * to fulfill a withdrawal, transfer, or vault lock operation.
 */
public class InsufficientFundsException extends RuntimeException {
    private final String errorCode = "INSUFFICIENT_FUNDS";

    public InsufficientFundsException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return errorCode;
    }
}
