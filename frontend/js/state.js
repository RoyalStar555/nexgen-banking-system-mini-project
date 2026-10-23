import { CONFIG } from './config.js';

/**
 * Immutable State Store
 * NexGen Banking Zero-State Rule:
 * The frontend calculates NOTHING. It strictly mirrors backend snapshots.
 */
let _state = {
  currentAccountId: CONFIG.DEFAULT_ACCOUNT,
  accounts: [],
  currentAccount: null,
  transactions: [],
  vaults: [],
  beneficiaries: [],
  isLoading: false,
  error: null,
};

const _listeners = new Set();

/**
 * Read-only state snapshot getter
 */
export const getState = () => Object.freeze({ ..._state });

/**
 * State updater — notifies all active subscribers with current and previous state
 */
export const setState = (updates) => {
  const prevState = Object.freeze({ ..._state });
  _state = { ..._state, ...updates };
  const nextState = Object.freeze({ ..._state });

  for (const listener of _listeners) {
    try {
      listener(nextState, prevState);
    } catch (err) {
      console.error('State subscriber error:', err);
    }
  }
};

/**
 * Subscribe to state changes
 * @param {Function} listener (nextState, prevState) => void
 * @returns {Function} unsubscribe function
 */
export const subscribe = (listener) => {
  if (typeof listener !== 'function') return () => {};
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
};

/**
 * Convenience helper to get the currently selected account object
 */
export const getCurrentAccount = () => {
  if (_state.currentAccount && _state.currentAccount.accountId === _state.currentAccountId) {
    return _state.currentAccount;
  }
  return _state.accounts.find(a => a.accountId === _state.currentAccountId) || null;
};
