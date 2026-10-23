package com.nexgenbank.exceptions;

/**
 * Exception thrown when a withdrawal or operation exceeds
 * the account's allowed daily limit.
 */
public class DailyLimitExceededException extends RuntimeException {
    private final String errorCode = "DAILY_LIMIT_EXCEEDED";

    public DailyLimitExceededException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return errorCode;
    }
}
