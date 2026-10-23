package com.nexgenbank.models;

import com.nexgenbank.enums.KycStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents an approved external or internal payee/beneficiary for an account.
 * Accounts can transfer funds to beneficiaries once verified.
 */
public class Beneficiary {

    private final String beneficiaryId;
    private final String name;
    private final String accountNumber;
    private final String ifscCode;
    private final KycStatus kycStatus;
    private final LocalDateTime addedAt;

    /**
     * Constructs a new Beneficiary with default VERIFIED KycStatus and generated UUID.
     *
     * @param name          payee name
     * @param accountNumber recipient account number
     * @param ifscCode      routing or bank IFSC code
     */
    public Beneficiary(String name, String accountNumber, String ifscCode) {
        this(UUID.randomUUID().toString(), name, accountNumber, ifscCode, KycStatus.VERIFIED, LocalDateTime.now());
    }

    /**
     * Constructs a Beneficiary with all explicit parameters.
     *
     * @param beneficiaryId unique beneficiary ID
     * @param name          payee name
     * @param accountNumber recipient account number
     * @param ifscCode      routing or bank IFSC code
     * @param kycStatus     KYC status of the beneficiary
     * @param addedAt       timestamp when beneficiary was registered
     */
    public Beneficiary(String beneficiaryId, String name, String accountNumber,
                       String ifscCode, KycStatus kycStatus, LocalDateTime addedAt) {
        this.beneficiaryId = beneficiaryId;
        this.name = name;
        this.accountNumber = accountNumber;
        this.ifscCode = ifscCode;
        this.kycStatus = (kycStatus != null) ? kycStatus : KycStatus.VERIFIED;
        this.addedAt = (addedAt != null) ? addedAt : LocalDateTime.now();
    }

    public String getBeneficiaryId() {
        return beneficiaryId;
    }

    public String getName() {
        return name;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getIfscCode() {
        return ifscCode;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }

    @Override
    public String toString() {
        return "Beneficiary{" +
                "beneficiaryId='" + beneficiaryId + '\'' +
                ", name='" + name + '\'' +
                ", accountNumber='" + accountNumber + '\'' +
                ", ifscCode='" + ifscCode + '\'' +
                ", kycStatus=" + kycStatus +
                ", addedAt=" + addedAt +
                '}';
    }
}
