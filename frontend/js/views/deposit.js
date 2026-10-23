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
 * Deposit View
 * Handles funds deposits with instant preset amounts and safe transaction receipts.
 */
class DepositView {
  constructor() {
    this.container = null;
    this.recentDeposits = [];
    this.recentDepositsContainer = null;
  }

  async mount(outlet) {
    this.container = createElement('div', 'deposit-view animate-fade-in');
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
        this.recentDeposits = rawList.filter(
          tx => tx.type === 'DEPOSIT' || tx.type === 'CREDIT'
        );
      }
    } catch (err) {
      console.error('Deposit loadData error:', err);
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
    };

    // Page Header
    const header = createElement('div', 'page-header');
    const headerLeft = createElement('div', 'header-left');
    const title = createElement('h1', 'page-title', 'Deposit Funds');
    const subtitle = createElement(
      'p',
      'page-subtitle',
      'Instantly credit your account via simulated real-time settlement rails.'
    );
    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);
    header.appendChild(headerLeft);
    this.container.appendChild(header);

    // Layout Grid
    const grid = createElement('div', 'grid');

    // Deposit Form Card (col-7)
    const formCol = createElement('div', 'col-7 col-md-12');
    const formCard = createElement('div', 'card');

    const cardHeader = createElement('div', 'card-header');
    const cardTitle = createElement('h2', 'card-title', 'Direct Deposit');
    cardTitle.prepend(createSvgIcon('deposit'));
    cardHeader.appendChild(cardTitle);
    formCard.appendChild(cardHeader);

    const cardBody = createElement('div', 'card-body');

    // Account (read-only)
    const accGroup = createElement('div', 'form-group');
    const accLabel = createElement('label', 'form-label', 'Destination Account');
    const accInput = createElement('input', 'form-input');
    accInput.setAttribute('type', 'text');
    accInput.setAttribute('disabled', 'true');
    accInput.value = `${account.accountId} — ${account.holderName || account.accountHolder || 'Customer'} (${account.accountType})`;
    accGroup.appendChild(accLabel);
    accGroup.appendChild(accInput);
    cardBody.appendChild(accGroup);

    // Quick Preset Amounts
    const presetsLabel = createElement('label', 'form-label', 'Select Quick Preset');
    cardBody.appendChild(presetsLabel);

    const presetGrid = createElement('div', 'preset-grid');
    const presets = [1000, 5000, 10000, 25000];

    const amountInput = createElement('input', 'form-input');
    amountInput.setAttribute('type', 'number');
    amountInput.setAttribute('id', 'deposit-amount-input');
    amountInput.setAttribute('placeholder', 'Enter custom amount (e.g. 5000)');
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

    // Amount Input Form Group
    const amtGroup = createElement('div', 'form-group');
    const amtLabel = createElement('label', 'form-label', 'Deposit Amount (INR)');
    const errorEl = createElement('div', 'form-error');

    amtGroup.appendChild(amtLabel);
    amtGroup.appendChild(amountInput);
    amtGroup.appendChild(errorEl);
    cardBody.appendChild(amtGroup);

    // Submit Button
    const submitBtn = createElement('button', 'btn btn-primary btn-block btn-lg', 'Confirm & Deposit');
    submitBtn.setAttribute('id', 'btn-deposit');
    submitBtn.setAttribute('type', 'button');
    submitBtn.prepend(createSvgIcon('deposit'));

    // Receipt Container Placeholder
    const receiptContainer = createElement('div', 'receipt-slot');

    // Deposit Action Handler (debounced)
    const handleDeposit = debounce(async () => {
      const amountVal = parseFloat(amountInput.value);

      if (isNaN(amountVal) || amountVal <= 0) {
        errorEl.textContent = 'Please enter a valid deposit amount greater than ₹0.00.';
        amountInput.classList.add('has-error');
        amountInput.focus();
        return;
      }

      errorEl.textContent = '';
      amountInput.classList.remove('has-error');

      try {
        setButtonLoading(submitBtn, true, 'Processing Credit...');
        const response = await api.deposit(account.accountId, amountVal);

        showToast(`Successfully deposited ${formatCurrency(amountVal)}!`, 'success');

        // Refresh account details from backend
        const updatedAccount = await api.getAccount(account.accountId);
        setState({
          currentAccount: updatedAccount,
        });

        // Clear input
        amountInput.value = '';

        const depTxnId = (response && response.transaction && response.transaction.transactionId) || (response && response.transactionId) || `TXN-DEP-${Date.now().toString().slice(-6)}`;
        const depTimestamp = (response && response.transaction && response.transaction.timestamp) || (response && response.timestamp) || new Date().toISOString();

        // Render Transaction Receipt
        this.renderReceipt(receiptContainer, {
          amount: amountVal,
          newBalance: updatedAccount.availableBalance,
          transactionId: depTxnId,
          timestamp: depTimestamp,
          accountNumber: account.accountId,
          holderName: updatedAccount.holderName || account.holderName,
        });

        // Add to recent deposits & live re-render
        const newDepositTx = (response && response.transaction) ? response.transaction : {
          transactionId: depTxnId,
          type: 'DEPOSIT',
          amount: amountVal,
          balanceAfter: updatedAccount.availableBalance,
          timestamp: depTimestamp,
          description: `Direct Deposit | Ref: ${depTxnId}`,
          referenceId: depTxnId,
        };
        this.recentDeposits.unshift(newDepositTx);
        this.renderRecentDeposits();
      } catch (err) {
        console.error('Deposit error:', err);
      } finally {
        setButtonLoading(submitBtn, false);
      }
    }, 200);

    submitBtn.addEventListener('click', handleDeposit);
    cardBody.appendChild(submitBtn);
    cardBody.appendChild(receiptContainer);

    formCard.appendChild(cardBody);
    formCol.appendChild(formCard);
    grid.appendChild(formCol);

    // Sidebar Info Card (col-5)
    const infoCol = createElement('div', 'col-5 col-md-12');
    const infoCard = createElement('div', 'card');
    
    const infoHeader = createElement('div', 'card-header');
    const infoTitle = createElement('h3', 'card-title', 'Current Balances');
    infoTitle.prepend(createSvgIcon('wallet'));
    infoHeader.appendChild(infoTitle);
    infoCard.appendChild(infoHeader);

    const infoBody = createElement('div', 'card-body flex flex-col gap-4');
    
    const balCard = createElement('div', 'quick-stat-chip');
    const balIcon = createElement('div', 'quick-stat-icon-wrap accent', '');
    balIcon.appendChild(createSvgIcon('check'));
    const balMeta = createElement('div', 'quick-stat-meta');
    balMeta.appendChild(createElement('span', 'quick-stat-label', 'Available Balance'));
    balMeta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(account.availableBalance || 0)));
    balCard.appendChild(balIcon);
    balCard.appendChild(balMeta);
    infoBody.appendChild(balCard);

    const noteBox = createElement('div', 'modal-confirm-highlight');
    const noteHeading = createElement('div', 'font-semibold mb-1', 'Zero Settlement Delay');
    noteHeading.style.color = 'var(--color-primary-light)';
    noteHeading.style.marginBottom = '4px';
    const noteText = createElement(
      'p',
      'text-xs',
      'Deposits reflect instantaneously in your ledger. All funds become immediately available for goal allocation or external transfers.'
    );
    noteText.style.fontSize = 'var(--font-size-xs)';
    noteBox.appendChild(noteHeading);
    noteBox.appendChild(noteText);
    infoBody.appendChild(noteBox);

    infoCard.appendChild(infoBody);
    infoCol.appendChild(infoCard);
    grid.appendChild(infoCol);

    this.container.appendChild(grid);

    // Recent Deposits Section
    this.recentDepositsContainer = createElement('div', 'recent-deposits-wrap col-12');
    this.renderRecentDeposits();
    this.container.appendChild(this.recentDepositsContainer);
  }

  renderRecentDeposits() {
    if (!this.recentDepositsContainer) return;
    while (this.recentDepositsContainer.firstChild) {
      this.recentDepositsContainer.removeChild(this.recentDepositsContainer.firstChild);
    }
    const section = createRecentTransactionsSection({
      title: 'Recent Deposits',
      badgeText: `${this.recentDeposits.length} Deposits`,
      transactions: this.recentDeposits,
      currentAccount: getCurrentAccount(),
      emptyMessage: 'No deposits recorded yet. Deposit funds using the form above.',
    });
    this.recentDepositsContainer.appendChild(section);
  }

  renderReceipt(container, data) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const receiptData = {
      ...data,
      isCredit: true,
      badgeText: 'Deposit Confirmed',
      party: 'Self · Direct Deposit',
      fromAccount: 'UPI / Direct Bank Transfer',
      toAccount: `${data.accountNumber} · ${data.holderName || 'Account Holder'}`,
    };

    const receiptEl = createUpiReceiptElement(receiptData, () => {
      while (container.firstChild) container.removeChild(container.firstChild);
    });

    container.appendChild(receiptEl);

    // Also pop up modal for instant visual gratification (UPI payment style)
    showUpiReceiptModal(receiptData);
  }
}

export const depositView = new DepositView();
