package com.nexgenbank.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global REST exception handler that intercepts domain and runtime exceptions
 * and converts them into standardized, consistent JSON responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Builds a standardized error response body map.
     *
     * @param message   the error message
     * @param errorCode the internal error code
     * @param status    the HTTP status code
     * @return map representing standard error response
     */
    private Map<String, Object> error(String message, String errorCode, int status) {
        Map<String, Object> errorMap = new LinkedHashMap<>();
        errorMap.put("success", false);
        errorMap.put("message", message);
        errorMap.put("error", errorCode);
        errorMap.put("status", status);
        errorMap.put("timestamp", LocalDateTime.now().toString());
        return errorMap;
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficient(InsufficientFundsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error(ex.getMessage(), ex.getErrorCode(), 409));
    }

    @ExceptionHandler(DailyLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleDailyLimit(DailyLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error(ex.getMessage(), ex.getErrorCode(), 409));
    }

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(AccountNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error(ex.getMessage(), ex.getErrorCode(), 404));
    }

    @ExceptionHandler(TransferFailedException.class)
    public ResponseEntity<Map<String, Object>> handleTransferFailed(TransferFailedException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error(ex.getMessage(), ex.getErrorCode(), 500));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadInput(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(error(ex.getMessage(), "INVALID_INPUT", 400));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("An unexpected error occurred: " + ex.getMessage(), "INTERNAL_ERROR", 500));
    }
}
