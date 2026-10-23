package com.nexgenbank.enums;

/**
 * Represents the Know-Your-Customer verification state of an account holder.
 * Only VERIFIED accounts can execute transfers to external beneficiaries.
 */
public enum KycStatus {
    VERIFIED,
    PENDING,
    REJECTED
}
