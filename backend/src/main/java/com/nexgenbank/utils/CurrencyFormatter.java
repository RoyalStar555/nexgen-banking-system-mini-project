package com.nexgenbank.utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Utility class for formatting monetary BigDecimal values.
 * All methods are static. No instantiation needed.
 */
public final class CurrencyFormatter {

    private static final Locale INDIA = new Locale("en", "IN");

    private CurrencyFormatter() {
        // Prevent instantiation
    }

    /**
     * Formats a BigDecimal as Indian Rupee string.
     * Example: 150000.50 → "₹1,50,000.50"
     *
     * @param amount the BigDecimal amount to format
     * @return formatted currency string
     */
    public static String formatINR(BigDecimal amount) {
        if (amount == null) {
            return "₹0.00";
        }
        NumberFormat formatter = NumberFormat.getCurrencyInstance(INDIA);
        return formatter.format(amount);
    }

    /**
     * Rounds a BigDecimal to 2 decimal places using Banker's Rounding (HALF_EVEN).
     * Prevents IEEE 754 floating-point errors in monetary calculations.
     *
     * @param amount the BigDecimal amount to round
     * @return rounded BigDecimal
     */
    public static BigDecimal round(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO;
        }
        return amount.setScale(2, RoundingMode.HALF_EVEN);
    }

    /**
     * Parses a string to BigDecimal safely.
     * Returns BigDecimal.ZERO on null/empty/blank input.
     *
     * @param value the string representation of monetary amount
     * @return parsed BigDecimal rounded to 2 decimal places
     */
    public static BigDecimal parse(String value) {
        if (value == null || value.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(value.trim()).setScale(2, RoundingMode.HALF_EVEN);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid monetary value: '" + value + "'");
        }
    }

    /**
     * Validates that an amount is strictly positive.
     * Used as the input gate for all financial methods.
     *
     * @param amount    the amount to validate
     * @param fieldName descriptive name of the parameter
     */
    public static void validatePositive(BigDecimal amount, String fieldName) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(fieldName + " must be strictly positive");
        }
    }
}
