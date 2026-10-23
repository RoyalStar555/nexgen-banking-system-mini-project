import { api } from '../api.js';
import { getState, setState, getCurrentAccount } from '../state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  showToast,
  setButtonLoading,
  debounce,
} from '../utils.js';
import {
  createUpiReceiptElement,
  showUpiReceiptModal,
  createRecentTransactionsSection,
} from '../receipt.js';

/**
 * Withdraw View
 * Handles funds withdrawals with balance pre-checks and daily limit awareness.
 */
class WithdrawView {
  constructor() {
    this.container = null;
    this.recentWithdrawals = [];
    this.recentWithdrawalsContainer = null;
  }

  async mount(outlet) {
    this.container = createElement('div', 'withdraw-view animate-fade-in');
    outlet.appendChild(this.container);
    await this.loadData();
    this.render();
  }

  unmount() {
    this.container = null;
  }

  async loadData() {
    const { currentAccountId } = getState();
    try {
      const [accountData, statementData] = await Promise.allSettled([
        api.getAccount(currentAccountId),
        api.getStatement(currentAccountId, { page: 0, size: 50 }),
      ]);
      if (accountData.status === 'fulfilled') {
        setState({ currentAccount: accountData.value });
      }
      if (statementData.status === 'fulfilled' && statementData.value) {
        const rawList = Array.isArray(statementData.value.content)
          ? statementData.value.content
          : (Array.isArray(statementData.value) ? statementData.value : []);
        this.recentWithdrawals = rawList.filter(tx => tx.type === 'WITHDRAWAL');
      }
    } catch (err) {
      console.error('Withdraw loadData error:', err);
    }
  }

  render() {
    if (!this.container) return;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const account = getCurrentAccount() || {
      accountId: getState().currentAccountId,
      holderName: 'Customer',
      accountType: 'SavingsAccount',
      availableBalance: 0,
      remainingDailyLimit: 50000,
      dailyWithdrawalLimit: 50000,
      overdraftLimit: 0,
    };

    const isCurrentAccount = account.accountType === 'CurrentAccount' || account.accountType === 'CURRENT';
    const availableBalance = Number(account.availableBalance) || 0;
    const dailyLimitLeft = account.remainingDailyLimit !== undefined 
      ? Number(account.remainingDailyLimit) 
      : (account.dailyLimitRemaining !== undefined ? Number(account.dailyLimitRemaining) : 50000);

    // Page Header
    const header = createElement('div', 'page-header');
    const headerLeft = createElement('div', 'header-left');
    const title = createElement('h1', 'page-title', 'Withdraw Funds');
    const subtitle = createElement(
      'p',
      'page-subtitle',
      'Disburse funds securely from your verified account ledger.'
    );
    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);
    header.appendChild(headerLeft);
    this.container.appendChild(header);

    // Layout Grid
    const grid = createElement('div', 'grid');

    // Withdraw Form (col-7)
    const formCol = createElement('div', 'col-7 col-md-12');
    const formCard = createElement('div', 'card');

    const cardHeader = createElement('div', 'card-header');
    const cardTitle = createElement('h2', 'card-title', 'Disbursement Request');
    cardTitle.prepend(createSvgIcon('withdraw'));
    cardHeader.appendChild(cardTitle);
    formCard.appendChild(cardHeader);

    const cardBody = createElement('div', 'card-body');

    // Source Account
    const accGroup = createElement('div', 'form-group');
    const accLabel = createElement('label', 'form-label', 'Source Account');
    const accInput = createElement('input', 'form-input');
    accInput.setAttribute('type', 'text');
    accInput.setAttribute('disabled', 'true');
    accInput.value = `${account.accountId} — ${account.holderName || account.accountHolder || 'Customer'} (${account.accountType})`;
    accGroup.appendChild(accLabel);
    accGroup.appendChild(accInput);
    cardBody.appendChild(accGroup);

    // Preset Buttons
    const presetsLabel = createElement('label', 'form-label', 'Select Quick Amount');
    cardBody.appendChild(presetsLabel);

    const presetGrid = createElement('div', 'preset-grid');
    const presets = [500, 1000, 2000, 5000];

    const amountInput = createElement('input', 'form-input');
    amountInput.setAttribute('type', 'number');
    amountInput.setAttribute('id', 'withdraw-amount-input');
    amountInput.setAttribute('placeholder', 'Enter amount to withdraw (e.g. 2000)');
    amountInput.setAttribute('min', '0.01');
    amountInput.setAttribute('step', '0.01');

    for (const amt of presets) {
      const pBtn = createElement('button', 'preset-btn', formatCurrency(amt));
      pBtn.setAttribute('type', 'button');
      pBtn.addEventListener('click', () => {
        amountInput.value = String(amt);
        errorEl.textContent = '';
        amountInput.classList.remove('has-error');
      });
      presetGrid.appendChild(pBtn);
    }
    cardBody.appendChild(presetGrid);

    // Amount Form Group
    const amtGroup = createElement('div', 'form-group');
    const amtLabel = createElement('label', 'form-label', 'Withdrawal Amount (INR)');
    const errorEl = createElement('div', 'form-error');

    amtGroup.appendChild(amtLabel);
    amtGroup.appendChild(amountInput);
    amtGroup.appendChild(errorEl);
    cardBody.appendChild(amtGroup);

    // Submit Button
    const submitBtn = createElement('button', 'btn btn-danger btn-block btn-lg', 'Authorize Withdrawal');
    submitBtn.setAttribute('id', 'btn-withdraw');
    submitBtn.setAttribute('type', 'button');
    submitBtn.prepend(createSvgIcon('withdraw'));

    const receiptContainer = createElement('div', 'receipt-slot');

    // Real-time input validation
    amountInput.addEventListener('input', () => {
      const val = parseFloat(amountInput.value);
      if (!isNaN(val) && val > availableBalance) {
        errorEl.textContent = `Insufficient funds: Amount exceeds available balance of ${formatCurrency(availableBalance)}.`;
        amountInput.classList.add('has-error');
      } else {
        errorEl.textContent = '';
        amountInput.classList.remove('has-error');
      }
    });

    // Withdraw Action Handler (debounced)
    const handleWithdraw = debounce(async () => {
      const amountVal = parseFloat(amountInput.value);

      if (isNaN(amountVal) || amountVal <= 0) {
        errorEl.textContent = 'Please enter a valid amount greater than ₹0.00.';
        amountInput.classList.add('has-error');
        amountInput.focus();
        return;
      }

      // Pre-validation: available balance check
      if (amountVal > availableBalance) {
        errorEl.textContent = `Insufficient balance: You have ${formatCurrency(availableBalance)} available.`;
        amountInput.classList.add('has-error');
        amountInput.focus();
        return;
      }

      // Pre-validation: daily limit check for savings
      if (!isCurrentAccount && amountVal > dailyLimitLeft) {
        errorEl.textContent = `Daily limit exceeded: Remaining daily limit is ${formatCurrency(dailyLimitLeft)}.`;
        amountInput.classList.add('has-error');
        amountInput.focus();
        return;
      }

      errorEl.textContent = '';
      amountInput.classList.remove('has-error');

      try {
        setButtonLoading(submitBtn, true, 'Authorizing Debit...');
        const response = await api.withdraw(account.accountId, amountVal);

        showToast(`Successfully withdrawn ${formatCurrency(amountVal)}.`, 'success');

        // Fetch fresh state from backend
        const updatedAccount = await api.getAccount(account.accountId);
        setState({
          currentAccount: updatedAccount,
        });

        // Clear input
        amountInput.value = '';

        const wthTxnId = (response && response.transaction && response.transaction.transactionId) || (response && response.transactionId) || `TXN-WTH-${Date.now().toString().slice(-6)}`;
        const wthTimestamp = (response && response.transaction && response.transaction.timestamp) || (response && response.timestamp) || new Date().toISOString();

        // Render Transaction Receipt
        this.renderReceipt(receiptContainer, {
          amount: amountVal,
          newBalance: updatedAccount.availableBalance,
          transactionId: wthTxnId,
          timestamp: wthTimestamp,
          accountNumber: account.accountId,
          holderName: updatedAccount.holderName || account.holderName,
        });

        // Add to recent withdrawals & live re-render
        const newWithdrawalTx = (response && response.transaction) ? response.transaction : {
          transactionId: wthTxnId,
          type: 'WITHDRAWAL',
          amount: amountVal,
          balanceAfter: updatedAccount.availableBalance,
          timestamp: wthTimestamp,
          description: `Disbursement / Cash Withdrawal | Ref: ${wthTxnId}`,
          referenceId: wthTxnId,
        };
        this.recentWithdrawals.unshift(newWithdrawalTx);
        this.renderRecentWithdrawals();
      } catch (err) {
        console.error('Withdrawal error:', err);
      } finally {
        setButtonLoading(submitBtn, false);
      }
    }, 200);

    submitBtn.addEventListener('click', handleWithdraw);
    cardBody.appendChild(submitBtn);
    cardBody.appendChild(receiptContainer);

    formCard.appendChild(cardBody);
    formCol.appendChild(formCard);
    grid.appendChild(formCol);

    // Limits & Balances Sidebar (col-5)
    const sideCol = createElement('div', 'col-5 col-md-12');
    const sideCard = createElement('div', 'card');

    const sideHeader = createElement('div', 'card-header');
    const sideTitle = createElement('h3', 'card-title', 'Available Liquidity');
    sideTitle.prepend(createSvgIcon('shield'));
    sideHeader.appendChild(sideTitle);
    sideCard.appendChild(sideHeader);

    const sideBody = createElement('div', 'card-body flex flex-col gap-4');

    // Available balance stat
    const balChip = createElement('div', 'quick-stat-chip');
    const balIcon = createElement('div', 'quick-stat-icon-wrap accent', '');
    balIcon.appendChild(createSvgIcon('wallet'));
    const balMeta = createElement('div', 'quick-stat-meta');
    balMeta.appendChild(createElement('span', 'quick-stat-label', 'Withdrawable Balance'));
    balMeta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(availableBalance)));
    balChip.appendChild(balIcon);
    balChip.appendChild(balMeta);
    sideBody.appendChild(balChip);

    // Limit Chip
    const limChip = createElement('div', 'quick-stat-chip');
    const limIcon = createElement('div', 'quick-stat-icon-wrap warning', '');
    limIcon.appendChild(createSvgIcon('calendar'));
    const limMeta = createElement('div', 'quick-stat-meta');
    if (isCurrentAccount) {
      limMeta.appendChild(createElement('span', 'quick-stat-label', 'Overdraft Buffer'));
      limMeta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(account.overdraftLimit || 100000)));
    } else {
      limMeta.appendChild(createElement('span', 'quick-stat-label', 'Daily Limit Left'));
      limMeta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(dailyLimitLeft)));
    }
    limChip.appendChild(limIcon);
    limChip.appendChild(limMeta);
    sideBody.appendChild(limChip);

    // Advisory notice
    const noteBox = createElement('div', 'modal-confirm-highlight');
    const noteHeading = createElement('div', 'font-semibold mb-1', 'Protection Protocol');
    noteHeading.style.color = 'var(--color-danger-light)';
    noteHeading.style.marginBottom = '4px';
    const noteText = createElement(
      'p',
      'text-xs',
      'Funds locked in Goal Vaults cannot be debited until explicitly unlocked. Ensure your available liquidity is sufficient before placing requests.'
    );
    noteText.style.fontSize = 'var(--font-size-xs)';
    noteBox.appendChild(noteHeading);
    noteBox.appendChild(noteText);
    sideBody.appendChild(noteBox);

    sideCard.appendChild(sideBody);
    sideCol.appendChild(sideCard);
    grid.appendChild(sideCol);

    this.container.appendChild(grid);

    // Recent Withdrawals Section
    this.recentWithdrawalsContainer = createElement('div', 'recent-withdrawals-wrap col-12');
    this.renderRecentWithdrawals();
    this.container.appendChild(this.recentWithdrawalsContainer);
  }

  renderRecentWithdrawals() {
    if (!this.recentWithdrawalsContainer) return;
    while (this.recentWithdrawalsContainer.firstChild) {
      this.recentWithdrawalsContainer.removeChild(this.recentWithdrawalsContainer.firstChild);
    }
    const section = createRecentTransactionsSection({
      title: 'Recent Withdrawals',
      badgeText: `${this.recentWithdrawals.length} Withdrawals`,
      transactions: this.recentWithdrawals,
      currentAccount: getCurrentAccount(),
      emptyMessage: 'No withdrawals recorded for this account yet.',
    });
    this.recentWithdrawalsContainer.appendChild(section);
  }

  renderReceipt(container, data) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const receiptData = {
      ...data,
      isCredit: false,
      badgeText: 'Disbursement Complete',
      party: 'Self · Cash / Liquidity Payout',
      fromAccount: `${data.accountNumber} · ${data.holderName || 'Account Holder'}`,
      toAccount: 'Authorized Cash Payout Rail',
    };

    const receiptEl = createUpiReceiptElement(receiptData, () => {
      while (container.firstChild) container.removeChild(container.firstChild);
    });

    container.appendChild(receiptEl);

    // Also pop up modal for instant visual confirmation
    showUpiReceiptModal(receiptData);
  }
}

export const withdrawView = new WithdrawView();
