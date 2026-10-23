package com.nexgenbank.exceptions;

/**
 * Exception thrown when an atomic transfer fails during execution
 * and a rollback was triggered.
 */
public class TransferFailedException extends RuntimeException {
    private final String errorCode = "TRANSFER_FAILED";

    public TransferFailedException(String message) {
        super(message);
    }

    public TransferFailedException(String message, Throwable cause) {
        super(message, cause);
    }

    public String getErrorCode() {
        return errorCode;
    }
}
