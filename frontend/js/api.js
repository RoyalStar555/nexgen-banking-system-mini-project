import { CONFIG } from './config.js';
import { showToast, setButtonLoading } from './utils.js';
import { mockLedger } from './mockLedger.js';

/**
 * Global API Client & Fetch Interceptor
 * Handles all backend communication, error handling, network failures, and button loading states.
 */
export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Private fetch interceptor
   */
  async _fetch(endpoint, options = {}, button = null) {
    if (button) {
      setButtonLoading(button, true);
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Fast-path: If base URL is empty or unconfigured placeholder (e.g. static GitHub Pages deployment),
    // immediately route to mockLedger with 0ms latency instead of hanging on DNS lookup
    const isMockBackend = !this.baseUrl || this.baseUrl.includes('nexgen-banking-api.onrender.com');
    if (isMockBackend) {
      try {
        const method = options.method || 'GET';
        const parsedBody = options.body ? JSON.parse(options.body) : {};
        return mockLedger.handle(method, cleanEndpoint, parsedBody);
      } catch (mockErr) {
        showToast(mockErr.message, 'error');
        throw mockErr;
      } finally {
        if (button) {
          setButtonLoading(button, false);
        }
      }
    }

    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let responseJson = null;
      const text = await response.text();
      if (text) {
        try {
          responseJson = JSON.parse(text);
        } catch {
          responseJson = { message: text };
        }
      }

      if (!response.ok) {
        const errorMsg = (responseJson && (responseJson.message || responseJson.error)) || `HTTP ${response.status}: Request failed`;
        showToast(errorMsg, 'error');
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = responseJson;
        throw error;
      }

      // Return data field if wrapped, otherwise full response
      if (responseJson && typeof responseJson === 'object') {
        if ('data' in responseJson) {
          return responseJson.data;
        }
        return responseJson;
      }
      return responseJson;
    } catch (err) {
      // Differentiate network failure vs handled HTTP error across all browsers
      // (Safari uses 'Load failed', Firefox uses 'NetworkError', Chrome uses 'Failed to fetch')
      const isNetworkError = err instanceof TypeError || 
                             err.name === 'TypeError' ||
                             (err.message && (
                               err.message.includes('fetch') ||
                               err.message.includes('NetworkError') ||
                               err.message.includes('Load failed') ||
                               err.message.includes('aborted')
                             ));

      if (isNetworkError) {
        if (!mockLedger.hasNotified) {
          mockLedger.hasNotified = true;
          showToast('⚡ Running in Offline Demo Mode (Backend offline)', 'info');
        }
        try {
          const method = options.method || 'GET';
          const parsedBody = options.body ? JSON.parse(options.body) : {};
          return mockLedger.handle(method, cleanEndpoint, parsedBody);
        } catch (mockErr) {
          showToast(mockErr.message, 'error');
          throw mockErr;
        }
      } else if (!err.status) {
        // Unhandled other exception
        console.error('API Client error:', err);
      }
      throw err;
    } finally {
      if (button) {
        setButtonLoading(button, false);
      }
    }
  }

  // Generic HTTP verbs
  async get(path, button = null) {
    return this._fetch(path, { method: 'GET' }, button);
  }

  async post(path, body = {}, button = null) {
    return this._fetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }, button);
  }

  // --------------------------------------------------------------------------
  // Domain Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch all accounts list
   */
  async getAccounts(button = null) {
    return this.get('/accounts', button);
  }

  /**
   * Open / Register a new bank account
   */
  async createAccount(accountData, button = null) {
    return this.post('/accounts', accountData, button);
  }

  /**
   * Fetch specific account details
   */
  async getAccount(accountId, button = null) {
    return this.get(`/accounts/${encodeURIComponent(accountId)}`, button);
  }

  /**
   * Deposit money into account
   */
  async deposit(accountId, amount, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/deposit`, {
      amount: String(amount),
    }, button);
  }

  /**
   * Withdraw money from account
   */
  async withdraw(accountId, amount, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/withdraw`, {
      amount: String(amount),
    }, button);
  }

  /**
   * Transfer funds from source to target account with optional remark
   */
  async transfer(fromAccountId, toAccountId, amount, description = '', button = null) {
    return this.post(`/accounts/transfer`, {
      fromAccountId,
      toAccountId,
      amount: String(amount),
      description: String(description || ''),
      remark: String(description || ''),
    }, button);
  }

  /**
   * Get account passbook / transaction statement
   */
  async getStatement(accountId, params = {}, button = null) {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    const endpoint = `/accounts/${encodeURIComponent(accountId)}/statement${qs ? `?${qs}` : ''}`;
    return this.get(endpoint, button);
  }

  /**
   * Get beneficiaries list for account
   */
  async getBeneficiaries(accountId, button = null) {
    return this.get(`/accounts/${encodeURIComponent(accountId)}/beneficiaries`, button);
  }

  /**
   * Add a new beneficiary
   */
  async addBeneficiary(accountId, data, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/beneficiaries`, {
      name: data.name,
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode || data.ifsc,
    }, button);
  }

  /**
   * Get goal vaults for account
   */
  async getVaults(accountId, button = null) {
    return this.get(`/accounts/${encodeURIComponent(accountId)}/vaults`, button);
  }

  /**
   * Create a new goal vault
   */
  async createVault(accountId, data, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/vaults`, {
      goalName: data.goalName,
      targetAmount: String(data.targetAmount),
      targetDate: data.targetDate,
    }, button);
  }

  /**
   * Lock funds into vault
   */
  async lockVault(accountId, vaultId, amount, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/vaults/${encodeURIComponent(vaultId)}/lock`, {
      amount: String(amount),
    }, button);
  }

  /**
   * Unlock / break vault
   */
  async unlockVault(accountId, vaultId, button = null) {
    return this.post(`/accounts/${encodeURIComponent(accountId)}/vaults/${encodeURIComponent(vaultId)}/unlock`, {}, button);
  }
}

// Global ApiClient singleton
export const api = new ApiClient(CONFIG.API_BASE_URL);
