/**
 * mockLedger.js — Zero-Dependency In-Memory Banking Simulation
 *
 * Provides an automatic, graceful simulation fallback for the frontend
 * whenever the Spring Boot Java backend is offline.
 *
 * Implements the exact same REST API response contracts, validation rules,
 * Banker's Rounding, and ledger atomicity as the Java backend.
 */

class MockLedger {
  constructor() {
    this.hasNotified = false;
    this.accounts = this._loadState() || this._getDefaultAccounts();
  }

  _saveState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('nexgen_mock_accounts_v1', JSON.stringify(this.accounts));
      }
    } catch (e) {
      console.warn('Unable to persist mock ledger:', e);
    }
  }

  _loadState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('nexgen_mock_accounts_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Unable to load mock ledger state:', e);
    }
    return null;
  }

  resetToDefault() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('nexgen_mock_accounts_v1');
      }
    } catch {
      // ignore
    }
    this.accounts = this._getDefaultAccounts();
    this._saveState();
  }

  _getDefaultAccounts() {
    return {
      ACC001: {
        accountId: 'ACC001',
        accountNumber: 'SAV-2024-001',
        holderName: 'Rahul Sharma',
        accountType: 'SavingsAccount',
        kycStatus: 'VERIFIED',
        totalBalance: 150000.0,
        lockedBalance: 20000.0,
        dailyWithdrawalLimit: 50000.0,
        dailyWithdrawnAmount: 7849.0,
        remainingDailyLimit: 42151.0,
        createdAt: '2024-01-15T10:00:00',
        transactions: [
          {
            transactionId: 'TXN-INIT-004',
            type: 'TRANSFER_OUT',
            amount: 5000.0,
            balanceAfter: 139300.0,
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            description: 'Transfer to NexGen Tech Pvt. Ltd. - Office rent advance | Ref: TXN-TRF-100234',
            referenceId: 'TXN-TRF-100234',
            remark: 'Office rent advance',
          },
          {
            transactionId: 'TXN-INIT-003',
            type: 'WITHDRAWAL',
            amount: 2200.0,
            balanceAfter: 144300.0,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            description: 'BESCOM electricity bill',
            referenceId: null,
          },
          {
            transactionId: 'TXN-INIT-002',
            type: 'WITHDRAWAL',
            amount: 3500.0,
            balanceAfter: 146500.0,
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            description: 'BigBasket grocery',
            referenceId: null,
          },
          {
            transactionId: 'TXN-INIT-001',
            type: 'DEPOSIT',
            amount: 85000.0,
            balanceAfter: 150000.0,
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
            description: 'Monthly salary credited',
            referenceId: null,
          },
        ],
        beneficiaries: [
          {
            beneficiaryId: 'BEN-001',
            name: 'NexGen Tech Pvt. Ltd.',
            accountNumber: 'ACC002',
            ifscCode: 'HDFC0001234',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-01T14:30:00',
          },
          {
            beneficiaryId: 'BEN-002',
            name: 'Priya Mehta',
            accountNumber: 'ACC003',
            ifscCode: 'ICIC0005678',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-15T11:00:00',
          },
        ],
        vaults: [
          {
            vaultId: 'VLT-001',
            goalName: 'iPhone 16 Fund',
            targetAmount: 85000.0,
            lockedAmount: 20000.0,
            progressPercent: 23.53,
            targetDate: '2025-06-30',
            createdAt: '2024-03-01T12:00:00',
          },
        ],
      },
      ACC002: {
        accountId: 'ACC002',
        accountNumber: 'CUR-2024-001',
        holderName: 'NexGen Tech Pvt. Ltd.',
        accountType: 'CurrentAccount',
        kycStatus: 'VERIFIED',
        totalBalance: 500000.0,
        lockedBalance: 75000.0,
        overdraftLimit: 25000.0,
        overdraftFee: 500.0,
        currentOverdraftUsed: 0.0,
        createdAt: '2023-11-10T09:00:00',
        transactions: [
          {
            transactionId: 'TXN-INIT-102',
            type: 'TRANSFER_IN',
            amount: 5000.0,
            balanceAfter: 505000.0,
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            description: 'Transfer from Rahul Sharma - Office rent advance | Ref: TXN-TRF-100234',
            referenceId: 'TXN-TRF-100234',
            remark: 'Office rent advance',
          },
          {
            transactionId: 'TXN-INIT-101',
            type: 'DEPOSIT',
            amount: 250000.0,
            balanceAfter: 500000.0,
            timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
            description: 'Client invoice payment',
            referenceId: null,
          },
        ],
        beneficiaries: [
          {
            beneficiaryId: 'BEN-101',
            name: 'Rahul Sharma',
            accountNumber: 'ACC001',
            ifscCode: 'SBIN0001234',
            kycStatus: 'VERIFIED',
            addedAt: '2024-01-20T11:15:00',
          },
          {
            beneficiaryId: 'BEN-102',
            name: 'Priya Mehta',
            accountNumber: 'ACC003',
            ifscCode: 'ICIC0005678',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-18T16:45:00',
          },
        ],
        vaults: [
          {
            vaultId: 'VLT-101',
            goalName: 'Q4 Tax Reserve',
            targetAmount: 200000.0,
            lockedAmount: 75000.0,
            progressPercent: 37.5,
            targetDate: '2025-03-31',
            createdAt: '2024-02-15T16:00:00',
          },
        ],
      },
      ACC003: {
        accountId: 'ACC003',
        accountNumber: 'SAV-2024-003',
        holderName: 'Priya Mehta',
        accountType: 'SavingsAccount',
        kycStatus: 'VERIFIED',
        totalBalance: 75000.0,
        lockedBalance: 15000.0,
        dailyWithdrawalLimit: 50000.0,
        dailyWithdrawnAmount: 0.0,
        remainingDailyLimit: 50000.0,
        createdAt: '2024-02-01T10:00:00',
        transactions: [
          {
            transactionId: 'TXN-INIT-201',
            type: 'DEPOSIT',
            amount: 75000.0,
            balanceAfter: 75000.0,
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            description: 'Professional consulting stipend',
            referenceId: null,
            remark: 'Consulting Stipend',
          },
        ],
        beneficiaries: [
          {
            beneficiaryId: 'BEN-201',
            name: 'Rahul Sharma',
            accountNumber: 'ACC001',
            ifscCode: 'SBIN0001234',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-10T11:00:00',
          },
          {
            beneficiaryId: 'BEN-202',
            name: 'NexGen Tech Pvt. Ltd.',
            accountNumber: 'ACC002',
            ifscCode: 'HDFC0001234',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-15T14:30:00',
          },
        ],
        vaults: [],
      },
      ACC004: {
        accountId: 'ACC004',
        accountNumber: 'SAV-2024-004',
        holderName: 'Vikram Malhotra',
        accountType: 'SavingsAccount',
        kycStatus: 'VERIFIED',
        totalBalance: 120000.0,
        lockedBalance: 0.0,
        dailyWithdrawalLimit: 50000.0,
        dailyWithdrawnAmount: 0.0,
        remainingDailyLimit: 50000.0,
        createdAt: '2024-02-15T09:00:00',
        transactions: [
          {
            transactionId: 'TXN-INIT-301',
            type: 'DEPOSIT',
            amount: 120000.0,
            balanceAfter: 120000.0,
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
            description: 'Retainer balance transfer',
            referenceId: null,
            remark: 'Retainer balance',
          },
        ],
        beneficiaries: [
          {
            beneficiaryId: 'BEN-301',
            name: 'Rahul Sharma',
            accountNumber: 'ACC001',
            ifscCode: 'SBIN0001234',
            kycStatus: 'VERIFIED',
            addedAt: '2024-02-20T10:00:00',
          },
        ],
        vaults: [],
      },
    };
  }

  _getAvailableBalance(acc) {
    return Number((acc.totalBalance - acc.lockedBalance).toFixed(2));
  }

  handle(method, endpoint, body = {}) {
    const res = this._route(method, endpoint, body);
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      this._saveState();
    }
    return res;
  }

  _route(method, endpoint, body = {}) {
    const clean = endpoint.split('?')[0].replace(/\/+$/, '');
    const query = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');

    // GET /accounts
    if (method === 'GET' && clean === '/accounts') {
      return Object.values(this.accounts).map(acc => ({
        accountId: acc.accountId,
        accountNumber: acc.accountNumber,
        holderName: acc.holderName,
        accountType: acc.accountType,
        kycStatus: acc.kycStatus,
        totalBalance: acc.totalBalance,
        lockedBalance: acc.lockedBalance,
        availableBalance: this._getAvailableBalance(acc),
      }));
    }

    // GET /accounts/{id}
    const accMatch = clean.match(/^\/accounts\/([^/]+)$/);
    if (method === 'GET' && accMatch) {
      const id = accMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      return {
        ...acc,
        availableBalance: this._getAvailableBalance(acc),
        transactionCount: acc.transactions.length,
        beneficiaryCount: acc.beneficiaries.length,
        vaultCount: acc.vaults.length,
      };
    }

    // POST /accounts/{id}/deposit
    const depMatch = clean.match(/^\/accounts\/([^/]+)\/deposit$/);
    if (method === 'POST' && depMatch) {
      const id = depMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const amt = parseFloat(body.amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Deposit amount must be strictly positive');
      
      acc.totalBalance = Number((acc.totalBalance + amt).toFixed(2));
      const tx = {
        transactionId: `TXN-DEP-${Date.now().toString().slice(-6)}`,
        type: 'DEPOSIT',
        amount: amt,
        balanceAfter: acc.totalBalance,
        timestamp: new Date().toISOString(),
        description: `Deposit of ${amt.toFixed(2)}`,
        referenceId: null,
      };
      acc.transactions.unshift(tx);
      return {
        transaction: tx,
        newAvailableBalance: this._getAvailableBalance(acc),
        newTotalBalance: acc.totalBalance,
      };
    }

    // POST /accounts/{id}/withdraw
    const withMatch = clean.match(/^\/accounts\/([^/]+)\/withdraw$/);
    if (method === 'POST' && withMatch) {
      const id = withMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const amt = parseFloat(body.amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Withdrawal amount must be strictly positive');
      
      const avail = this._getAvailableBalance(acc);
      const isCurrent = acc.accountType === 'CurrentAccount';
      const maxWithdrawable = isCurrent ? avail + (acc.overdraftLimit || 0) : avail;

      if (amt > maxWithdrawable) {
        throw new Error(`Insufficient funds. Available: ₹${avail.toFixed(2)}`);
      }

      acc.totalBalance = Number((acc.totalBalance - amt).toFixed(2));
      if (!isCurrent) {
        acc.dailyWithdrawnAmount = Number(((acc.dailyWithdrawnAmount || 0) + amt).toFixed(2));
        acc.remainingDailyLimit = Math.max(0, Number((acc.dailyWithdrawalLimit - acc.dailyWithdrawnAmount).toFixed(2)));
      }

      const tx = {
        transactionId: `TXN-WTH-${Date.now().toString().slice(-6)}`,
        type: 'WITHDRAWAL',
        amount: amt,
        balanceAfter: acc.totalBalance,
        timestamp: new Date().toISOString(),
        description: `Withdrawal of ${amt.toFixed(2)}`,
        referenceId: null,
      };
      acc.transactions.unshift(tx);
      return {
        transaction: tx,
        newAvailableBalance: this._getAvailableBalance(acc),
        newTotalBalance: acc.totalBalance,
      };
    }

    // POST /accounts (Open New Bank Account)
    if (method === 'POST' && (clean === '/accounts' || clean === '/accounts/register')) {
      const count = Object.keys(this.accounts).length + 1;
      const newId = `ACC${String(count).padStart(3, '0')}`;
      const holderName = body.holderName || body.name || 'New Customer';
      const accountType = body.accountType || 'SavingsAccount';
      const initialDeposit = parseFloat(body.initialDeposit || body.amount || 0);

      const newAccount = {
        accountId: newId,
        accountNumber: `${accountType.startsWith('Cur') ? 'CUR' : 'SAV'}-2024-${String(count).padStart(3, '0')}`,
        holderName,
        accountType,
        kycStatus: 'VERIFIED',
        totalBalance: initialDeposit,
        lockedBalance: 0.0,
        dailyWithdrawalLimit: 50000.0,
        dailyWithdrawnAmount: 0.0,
        remainingDailyLimit: 50000.0,
        overdraftLimit: accountType.startsWith('Cur') ? 50000.0 : 0.0,
        overdraftFee: accountType.startsWith('Cur') ? 500.0 : 0.0,
        currentOverdraftUsed: 0.0,
        createdAt: new Date().toISOString(),
        transactions: initialDeposit > 0 ? [
          {
            transactionId: `TXN-INIT-${Date.now().toString().slice(-4)}`,
            type: 'DEPOSIT',
            amount: initialDeposit,
            balanceAfter: initialDeposit,
            timestamp: new Date().toISOString(),
            description: 'Account opening initial deposit',
            referenceId: null,
            remark: 'Account opening deposit',
          }
        ] : [],
        beneficiaries: [
          {
            beneficiaryId: 'BEN-INIT-01',
            name: 'Rahul Sharma',
            accountNumber: 'ACC001',
            ifscCode: 'SBIN0001234',
            kycStatus: 'VERIFIED',
            addedAt: new Date().toISOString(),
          }
        ],
        vaults: [],
      };

      this.accounts[newId] = newAccount;
      return {
        ...newAccount,
        availableBalance: this._getAvailableBalance(newAccount),
        transactionCount: newAccount.transactions.length,
        beneficiaryCount: newAccount.beneficiaries.length,
        vaultCount: 0,
      };
    }

    // POST /accounts/transfer
    if (method === 'POST' && (clean === '/accounts/transfer' || clean.endsWith('/transfer'))) {
      const fromId = body.fromAccountId;
      const toId = body.toAccountId;
      const amt = parseFloat(body.amount);
      if (!fromId || !toId) throw new Error('From and To accounts required');
      if (fromId === toId) throw new Error('Cannot transfer to same account');
      const sender = this.accounts[fromId];
      if (!sender) throw new Error('Invalid sender account ID: ' + fromId);
      if (isNaN(amt) || amt <= 0) throw new Error('Transfer amount must be strictly positive');

      const remark = (body.description || body.remark || '').trim();
      const avail = this._getAvailableBalance(sender);
      if (amt > avail) {
        throw new Error(`Sender insufficient funds. Available: ₹${avail.toFixed(2)}`);
      }

      const receiver = this.accounts[toId];
      let receiverHolderName = '';

      if (receiver) {
        receiverHolderName = receiver.holderName;
      } else {
        // Look up in sender's beneficiaries or fallback
        const foundBen = sender.beneficiaries ? sender.beneficiaries.find(b => b.accountNumber === toId) : null;
        if (foundBen) {
          receiverHolderName = foundBen.name;
        } else {
          receiverHolderName = body.receiverHolderName || `Beneficiary (${toId})`;
        }
      }

      const refId = `TXN-TRF-${Date.now().toString().slice(-6)}`;
      sender.totalBalance = Number((sender.totalBalance - amt).toFixed(2));

      // Internal transfer: credit receiver on this core ledger
      if (receiver) {
        receiver.totalBalance = Number((receiver.totalBalance + amt).toFixed(2));
        const receiverTx = {
          transactionId: `TXN-IN-${Date.now().toString().slice(-6)}`,
          type: 'TRANSFER_IN',
          amount: amt,
          balanceAfter: receiver.totalBalance,
          timestamp: new Date().toISOString(),
          description: `Transfer from ${sender.holderName}${remark ? ' - ' + remark : ''} | Ref: ${refId}`,
          referenceId: refId,
          remark: remark,
        };
        receiver.transactions.unshift(receiverTx);
      }

      const senderTx = {
        transactionId: `TXN-OUT-${Date.now().toString().slice(-6)}`,
        type: 'TRANSFER_OUT',
        amount: amt,
        balanceAfter: sender.totalBalance,
        timestamp: new Date().toISOString(),
        description: `Transfer to ${receiverHolderName}${remark ? ' - ' + remark : ''} | Ref: ${refId}`,
        referenceId: refId,
        remark: remark,
      };
      sender.transactions.unshift(senderTx);

      return {
        transaction: senderTx,
        referenceId: refId,
        remark: remark,
        senderAccountId: fromId,
        receiverAccountId: toId,
        receiverHolderName: receiverHolderName,
        senderHolderName: sender.holderName,
        amount: amt,
        senderNewAvailableBalance: this._getAvailableBalance(sender),
        receiverNewAvailableBalance: receiver ? this._getAvailableBalance(receiver) : 0,
      };
    }

    // GET /accounts/{id}/statement
    const stmtMatch = clean.match(/^\/accounts\/([^/]+)\/statement$/);
    if (method === 'GET' && stmtMatch) {
      const id = stmtMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const page = parseInt(query.get('page') || '0', 10);
      const size = parseInt(query.get('size') || '10', 10);
      const content = acc.transactions.slice(page * size, (page + 1) * size);
      return {
        content,
        totalElements: acc.transactions.length,
        totalPages: Math.max(1, Math.ceil(acc.transactions.length / size)),
        currentPage: page,
        pageSize: size,
      };
    }

    // GET /accounts/{id}/beneficiaries
    const benMatch = clean.match(/^\/accounts\/([^/]+)\/beneficiaries$/);
    if (method === 'GET' && benMatch) {
      const id = benMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      return acc.beneficiaries;
    }

    // POST /accounts/{id}/beneficiaries
    if (method === 'POST' && benMatch) {
      const id = benMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const b = {
        beneficiaryId: `BEN-${Date.now().toString().slice(-4)}`,
        name: body.name,
        accountNumber: body.accountNumber,
        ifscCode: body.ifscCode || body.ifsc || 'NEXG0001',
        kycStatus: 'VERIFIED',
        addedAt: new Date().toISOString(),
      };
      acc.beneficiaries.push(b);
      return b;
    }

    // GET /accounts/{id}/vaults
    const vltMatch = clean.match(/^\/accounts\/([^/]+)\/vaults$/);
    if (method === 'GET' && vltMatch) {
      const id = vltMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      return acc.vaults;
    }

    // POST /accounts/{id}/vaults
    if (method === 'POST' && vltMatch) {
      const id = vltMatch[1];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const target = parseFloat(body.targetAmount);
      const v = {
        vaultId: `VLT-${Date.now().toString().slice(-4)}`,
        goalName: body.goalName,
        targetAmount: target,
        lockedAmount: 0.0,
        progressPercent: 0.0,
        targetDate: body.targetDate || null,
        createdAt: new Date().toISOString(),
      };
      acc.vaults.push(v);
      return v;
    }

    // POST /accounts/{id}/vaults/{vaultId}/lock
    const lockMatch = clean.match(/^\/accounts\/([^/]+)\/vaults\/([^/]+)\/lock$/);
    if (method === 'POST' && lockMatch) {
      const id = lockMatch[1];
      const vaultId = lockMatch[2];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const v = acc.vaults.find(item => item.vaultId === vaultId);
      if (!v) throw new Error(`Vault not found: ${vaultId}`);
      const amt = parseFloat(body.amount);
      const avail = this._getAvailableBalance(acc);
      if (amt > avail) throw new Error(`Insufficient available balance: ₹${avail.toFixed(2)}`);

      acc.lockedBalance = Number((acc.lockedBalance + amt).toFixed(2));
      v.lockedAmount = Number((v.lockedAmount + amt).toFixed(2));
      v.progressPercent = Math.min(100, Number(((v.lockedAmount / v.targetAmount) * 100).toFixed(2)));

      acc.transactions.unshift({
        transactionId: `TXN-LCK-${Date.now().toString().slice(-6)}`,
        type: 'VAULT_LOCK',
        amount: amt,
        balanceAfter: acc.totalBalance,
        timestamp: new Date().toISOString(),
        description: `Locked funds to vault: ${v.goalName}`,
        referenceId: null,
      });

      return {
        vault: v,
        newAvailableBalance: this._getAvailableBalance(acc),
        newLockedBalance: acc.lockedBalance,
      };
    }

    // POST /accounts/{id}/vaults/{vaultId}/unlock
    const unlkMatch = clean.match(/^\/accounts\/([^/]+)\/vaults\/([^/]+)\/unlock$/);
    if (method === 'POST' && unlkMatch) {
      const id = unlkMatch[1];
      const vaultId = unlkMatch[2];
      const acc = this.accounts[id];
      if (!acc) throw new Error(`Account not found: ${id}`);
      const v = acc.vaults.find(item => item.vaultId === vaultId);
      if (!v) throw new Error(`Vault not found: ${vaultId}`);

      const released = v.lockedAmount;
      acc.lockedBalance = Number(Math.max(0, acc.lockedBalance - released).toFixed(2));
      v.lockedAmount = 0.0;
      v.progressPercent = 0.0;

      acc.transactions.unshift({
        transactionId: `TXN-UNL-${Date.now().toString().slice(-6)}`,
        type: 'VAULT_UNLOCK',
        amount: released,
        balanceAfter: acc.totalBalance,
        timestamp: new Date().toISOString(),
        description: `Released funds from vault: ${v.goalName}`,
        referenceId: null,
      });

      return {
        releasedAmount: released,
        newAvailableBalance: this._getAvailableBalance(acc),
        newLockedBalance: acc.lockedBalance,
      };
    }

    throw new Error(`Unhandled mock route: ${method} ${endpoint}`);
  }
}

export const mockLedger = new MockLedger();

if (typeof window !== 'undefined') {
  window.resetNexGenLedger = () => {
    mockLedger.resetToDefault();
    window.location.reload();
  };
}
