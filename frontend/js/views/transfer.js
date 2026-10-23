import { api } from '../api.js';
import { getState, setState, getCurrentAccount } from '../state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  showToast,
  setButtonLoading,
} from '../utils.js';
import {
  createUpiReceiptElement,
  showUpiReceiptModal,
  createRecentTransactionsSection,
} from '../receipt.js';

/**
 * Transfer View — Atomic Fund Transfer with Beneficiary Management
 *
 * Zero-State UI Mandate: No financial math is done here.
 * All balance validation is performed by the backend.
 * The frontend only collects and forwards input.
 */
class TransferView {
  constructor() {
    this.container = null;
    this.accounts = [];
    this.beneficiaries = [];
    this.recentTransfers = [];
    this.recentTransfersContainer = null;
    this.receiptContainer = null;
    this.showAddBeneficiary = false;
  }

  async mount(outlet) {
    this.container = createElement('div', 'transfer-view animate-fade-in');
    outlet.appendChild(this.container);

    this.renderSkeleton();
    await this.loadData();
    this.render();
  }

  unmount() {
    this.container = null;
  }

  async loadData() {
    const { currentAccountId } = getState();
    try {
      const [accountsData, beneficiariesData, accountData, statementData] = await Promise.allSettled([
        api.getAccounts(),
        api.getBeneficiaries(currentAccountId),
        api.getAccount(currentAccountId),
        api.getStatement(currentAccountId, { page: 0, size: 50 }),
      ]);

      if (accountsData.status === 'fulfilled') {
        this.accounts = Array.isArray(accountsData.value) ? accountsData.value : [];
      }
      if (beneficiariesData.status === 'fulfilled') {
        this.beneficiaries = Array.isArray(beneficiariesData.value) ? beneficiariesData.value : [];
      }
      if (accountData.status === 'fulfilled') {
        setState({ currentAccount: accountData.value });
      }
      if (statementData.status === 'fulfilled' && statementData.value) {
        const rawList = Array.isArray(statementData.value.content)
          ? statementData.value.content
          : (Array.isArray(statementData.value) ? statementData.value : []);
        this.recentTransfers = rawList.filter(
          tx => tx.type === 'TRANSFER_IN' || tx.type === 'TRANSFER_OUT'
        );
      }
    } catch (err) {
      console.error('Transfer loadData error:', err);
    }
  }

  renderSkeleton() {
    if (!this.container) return;
    this.container.textContent = '';

    const skeletonCard = createElement('div', 'card');
    for (let i = 0; i < 5; i++) {
      const line = createElement('div', 'skeleton skeleton-text');
      line.style.width = i % 2 === 0 ? '70%' : '50%';
      line.style.marginBottom = '16px';
      skeletonCard.appendChild(line);
    }
    this.container.appendChild(skeletonCard);
  }

  render() {
    if (!this.container) return;
    this.container.textContent = '';

    const account = getCurrentAccount();
    const { currentAccountId } = getState();

    // ── Page Header ───────────────────────────────────────────────────────────
    const header = createElement('div', 'page-header');
    const titleRow = createElement('div', 'page-title-row');
    const iconWrap = createElement('span', 'page-title-icon');
    iconWrap.appendChild(createSvgIcon('transfer'));
    const h1 = createElement('h1', 'page-title', 'Fund Transfer');
    titleRow.appendChild(iconWrap);
    titleRow.appendChild(h1);
    const subtitle = createElement('p', 'page-subtitle',
      'Transfer funds securely between verified accounts with instant UPI settlement');
    header.appendChild(titleRow);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    // ── Main Layout Grid ──────────────────────────────────────────────────────
    const grid = createElement('div', 'transfer-grid');

    // ── Left Column: Transfer Form ─────────────────────────────────────────
    const formCard = createElement('div', 'card transfer-form-card');

    // Available Balance Banner
    if (account) {
      const banner = createElement('div', 'balance-banner');
      const label = createElement('span', 'balance-banner-label', 'Available Balance');
      const value = createElement('span', 'balance-banner-value',
        formatCurrency(account.availableBalance));
      banner.appendChild(label);
      banner.appendChild(value);
      formCard.appendChild(banner);
    }

    // From Account (read-only)
    const fromGroup = createElement('div', 'form-group');
    const fromLabel = createElement('label', 'form-label', 'From Account');
    fromLabel.setAttribute('for', 'transfer-from');
    const fromSelect = createElement('select', 'form-input');
    fromSelect.id = 'transfer-from';
    this.accounts.forEach(acc => {
      const opt = createElement('option', '', `${acc.accountNumber} — ${acc.holderName}`);
      opt.value = acc.accountId;
      if (acc.accountId === currentAccountId) opt.selected = true;
      fromSelect.appendChild(opt);
    });
    fromGroup.appendChild(fromLabel);
    fromGroup.appendChild(fromSelect);
    formCard.appendChild(fromGroup);

    // To Beneficiary
    const toGroup = createElement('div', 'form-group');
    const toLabel = createElement('label', 'form-label', 'To Beneficiary / Account');
    toLabel.setAttribute('for', 'transfer-to');
    const toSelect = createElement('select', 'form-input');
    toSelect.id = 'transfer-to';

    const defaultOpt = createElement('option', '', '— Select recipient —');
    defaultOpt.value = '';
    toSelect.appendChild(defaultOpt);

    // Add beneficiaries as options
    this.beneficiaries.forEach(b => {
      const opt = createElement('option', '',
        `${b.name} (${b.accountNumber})`);
      opt.value = b.accountNumber;
      toSelect.appendChild(opt);
    });

    // Add all other accounts (not current) as options
    this.accounts
      .filter(a => a.accountId !== currentAccountId)
      .forEach(acc => {
        const alreadyListed = this.beneficiaries.some(b => b.accountNumber === acc.accountId);
        if (!alreadyListed) {
          const opt = createElement('option', '',
            `${acc.accountNumber} — ${acc.holderName}`);
          opt.value = acc.accountId;
          toSelect.appendChild(opt);
        }
      });

    toGroup.appendChild(toLabel);
    toGroup.appendChild(toSelect);
    formCard.appendChild(toGroup);

    // Amount input
    const amtGroup = createElement('div', 'form-group');
    const amtLabel = createElement('label', 'form-label', 'Transfer Amount (₹)');
    amtLabel.setAttribute('for', 'transfer-amount');
    const amtInput = createElement('input', 'form-input');
    amtInput.id = 'transfer-amount';
    amtInput.type = 'number';
    amtInput.placeholder = '0.00';
    amtInput.min = '1';
    amtInput.step = '0.01';
    const amtHint = createElement('span', 'form-hint',
      'Minimum transfer: ₹1.00');
    amtGroup.appendChild(amtLabel);
    amtGroup.appendChild(amtInput);
    amtGroup.appendChild(amtHint);
    formCard.appendChild(amtGroup);

    // Description / Remark (optional)
    const descGroup = createElement('div', 'form-group');
    const descLabel = createElement('label', 'form-label', 'Remark / Purpose (shown on receipt)');
    descLabel.setAttribute('for', 'transfer-desc');
    const descInput = createElement('input', 'form-input');
    descInput.id = 'transfer-desc';
    descInput.type = 'text';
    descInput.placeholder = 'e.g. Rent, Family Support, Invoice #102';
    descInput.maxLength = 100;
    descGroup.appendChild(descLabel);
    descGroup.appendChild(descInput);
    formCard.appendChild(descGroup);

    // Transfer Button
    const btnRow = createElement('div', 'form-btn-row');
    const transferBtn = createElement('button', 'btn btn-primary btn-block');
    transferBtn.id = 'btn-transfer';
    const btnIcon = createElement('span', 'btn-icon-wrap');
    btnIcon.appendChild(createSvgIcon('transfer'));
    const btnText = createElement('span', '', 'Transfer Now');
    transferBtn.appendChild(btnIcon);
    transferBtn.appendChild(btnText);
    btnRow.appendChild(transferBtn);
    formCard.appendChild(btnRow);

    // Inline receipt container
    this.receiptContainer = createElement('div', 'receipt-slot');
    formCard.appendChild(this.receiptContainer);

    // Transfer event
    transferBtn.addEventListener('click', async () => {
      const fromId = fromSelect.value;
      const toId   = toSelect.value;
      const amount = amtInput.value.trim();
      const remark = descInput.value.trim();

      if (!toId) {
        showToast('Please select a recipient account.', 'warning');
        toSelect.focus();
        return;
      }
      if (!amount || parseFloat(amount) <= 0) {
        showToast('Please enter a valid transfer amount.', 'warning');
        amtInput.focus();
        return;
      }

      // Determine recipient holder name
      let recipientName = 'Recipient Account';
      const foundBen = this.beneficiaries.find(b => b.accountNumber === toId);
      if (foundBen) {
        recipientName = foundBen.name;
      } else {
        const foundAcc = this.accounts.find(a => a.accountId === toId);
        if (foundAcc) {
          recipientName = foundAcc.holderName;
        } else if (toSelect.selectedOptions && toSelect.selectedOptions[0]) {
          recipientName = toSelect.selectedOptions[0].text.split('—')[0].trim();
        }
      }

      try {
        setButtonLoading(transferBtn, true, 'Processing Transfer...');
        const response = await api.transfer(fromId, toId, amount, remark);
        const [updatedAccount] = await Promise.all([
          api.getAccount(currentAccountId),
        ]);
        setState({ currentAccount: updatedAccount });

        showToast(`₹${parseFloat(amount).toFixed(2)} transferred successfully!`, 'success');

        const resolvedParty = (response && response.receiverHolderName) || recipientName;
        const txnId = (response && response.transaction && response.transaction.transactionId) ||
                      (response && response.referenceId) ||
                      `TXN-OUT-${Date.now().toString().slice(-6)}`;
        const refId = (response && response.referenceId) ||
                      (response && response.transaction && response.transaction.referenceId) ||
                      `TXN-TRF-${Date.now().toString().slice(-6)}`;

        const receiptData = {
          amount: parseFloat(amount),
          newBalance: updatedAccount.availableBalance,
          isCredit: false,
          badgeText: 'Payment Debited',
          party: resolvedParty,
          fromAccount: `${account.accountId} · ${account.holderName}`,
          toAccount: `${toId} · ${resolvedParty}`,
          transactionId: txnId,
          refId: refId,
          remark: remark || (response && response.remark) || '',
          timestamp: new Date().toISOString(),
          dateFormatted: formatDate(new Date().toISOString()),
        };

        // 1. Popup UPI receipt modal
        showUpiReceiptModal(receiptData);

        // 2. Render inline in form card
        this.renderReceipt(this.receiptContainer, receiptData);

        // 3. Add to recent transfers history and live update section
        const newTx = (response && response.transaction) ? response.transaction : {
          transactionId: txnId,
          type: 'TRANSFER_OUT',
          amount: parseFloat(amount),
          balanceAfter: updatedAccount.availableBalance,
          timestamp: new Date().toISOString(),
          description: `Transfer to ${resolvedParty}${remark ? ' - ' + remark : ''} | Ref: ${refId}`,
          referenceId: refId,
          remark: remark,
        };
        this.recentTransfers.unshift(newTx);
        this.renderRecentTransfers();

        amtInput.value = '';
        descInput.value = '';
        toSelect.value = '';

        // Refresh balance banner
        const banner = this.container.querySelector('.balance-banner-value');
        if (banner && updatedAccount) {
          banner.textContent = formatCurrency(updatedAccount.availableBalance);
        }
      } catch (err) {
        // Toast shown by api.js
      } finally {
        setButtonLoading(transferBtn, false);
      }
    });

    grid.appendChild(formCard);

    // ── Right Column: Beneficiary Management ─────────────────────────────────
    const benefCard = createElement('div', 'card beneficiaries-card');
    const benefTitle = createElement('h3', 'card-section-title', 'Saved Beneficiaries');
    benefCard.appendChild(benefTitle);

    if (this.beneficiaries.length === 0) {
      const empty = createElement('p', 'empty-state-text',
        'No beneficiaries added yet. Add one below.');
      benefCard.appendChild(empty);
    } else {
      const list = createElement('ul', 'beneficiary-list');
      this.beneficiaries.forEach(b => {
        const item = createElement('li', 'beneficiary-item');

        const avatar = createElement('div', 'beneficiary-avatar');
        avatar.textContent = b.name.charAt(0).toUpperCase();

        const info = createElement('div', 'beneficiary-info');
        const name = createElement('span', 'beneficiary-name', b.name);
        const acct = createElement('span', 'beneficiary-acct', b.accountNumber);
        const ifsc = createElement('span', 'beneficiary-ifsc', b.ifscCode || '');
        info.appendChild(name);
        info.appendChild(acct);
        if (b.ifscCode) info.appendChild(ifsc);

        // Quick-select button
        const quickBtn = createElement('button', 'btn btn-sm btn-secondary', 'Select');
        quickBtn.addEventListener('click', () => {
          for (const opt of toSelect.options) {
            if (opt.value === b.accountNumber) {
              toSelect.value = b.accountNumber;
              amtInput.focus();
              showToast(`${b.name} selected as recipient.`, 'info');
              break;
            }
          }
        });

        item.appendChild(avatar);
        item.appendChild(info);
        item.appendChild(quickBtn);
        list.appendChild(item);
      });
      benefCard.appendChild(list);
    }

    // Add Beneficiary Accordion
    const addBenefBtn = createElement('button', 'btn btn-secondary btn-block add-benef-toggle');
    addBenefBtn.id = 'toggle-add-benef';
    addBenefBtn.textContent = '+ Add New Beneficiary';
    benefCard.appendChild(addBenefBtn);

    const addBenefForm = createElement('div', 'add-benef-form hidden');
    addBenefForm.id = 'add-benef-form';

    const bnNameGroup = createElement('div', 'form-group');
    const bnNameLabel = createElement('label', 'form-label', 'Beneficiary Name');
    const bnNameInput = createElement('input', 'form-input');
    bnNameInput.type = 'text';
    bnNameInput.placeholder = 'e.g. Priya Mehta';
    bnNameGroup.appendChild(bnNameLabel);
    bnNameGroup.appendChild(bnNameInput);

    const bnAcctGroup = createElement('div', 'form-group');
    const bnAcctLabel = createElement('label', 'form-label', 'Account Number');
    const bnAcctInput = createElement('input', 'form-input');
    bnAcctInput.type = 'text';
    bnAcctInput.placeholder = 'e.g. ACC002';
    bnAcctGroup.appendChild(bnAcctLabel);
    bnAcctGroup.appendChild(bnAcctInput);

    const bnIfscGroup = createElement('div', 'form-group');
    const bnIfscLabel = createElement('label', 'form-label', 'IFSC Code');
    const bnIfscInput = createElement('input', 'form-input');
    bnIfscInput.type = 'text';
    bnIfscInput.placeholder = 'e.g. HDFC0001234';
    bnIfscGroup.appendChild(bnIfscLabel);
    bnIfscGroup.appendChild(bnIfscInput);

    const saveBenefBtn = createElement('button', 'btn btn-accent btn-block');
    saveBenefBtn.textContent = 'Save Beneficiary';

    addBenefForm.appendChild(bnNameGroup);
    addBenefForm.appendChild(bnAcctGroup);
    addBenefForm.appendChild(bnIfscGroup);
    addBenefForm.appendChild(saveBenefBtn);
    benefCard.appendChild(addBenefForm);

    // Toggle accordion
    addBenefBtn.addEventListener('click', () => {
      addBenefForm.classList.toggle('hidden');
      addBenefBtn.textContent = addBenefForm.classList.contains('hidden')
        ? '+ Add New Beneficiary'
        : '− Cancel';
    });

    // Save beneficiary handler
    saveBenefBtn.addEventListener('click', async () => {
      const name   = bnNameInput.value.trim();
      const acct   = bnAcctInput.value.trim();
      const ifsc   = bnIfscInput.value.trim();

      if (!name || !acct) {
        showToast('Name and Account Number are required.', 'warning');
        return;
      }

      try {
        setButtonLoading(saveBenefBtn, true);
        await api.addBeneficiary(currentAccountId, { name, accountNumber: acct, ifsc });
        showToast(`${name} added as beneficiary.`, 'success');
        await this.loadData();
        this.render();
      } catch (err) {
        // Toast shown by api.js
      } finally {
        setButtonLoading(saveBenefBtn, false);
      }
    });

    grid.appendChild(benefCard);
    this.container.appendChild(grid);

    // ── Bottom: Recent Transfers Section ─────────────────────────────────────
    this.recentTransfersContainer = createElement('div', 'recent-transfers-wrap col-12');
    this.renderRecentTransfers();
    this.container.appendChild(this.recentTransfersContainer);
  }

  renderReceipt(container, data) {
    if (!container) return;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    const receiptEl = createUpiReceiptElement(data, () => {
      while (container.firstChild) container.removeChild(container.firstChild);
    });
    container.appendChild(receiptEl);
  }

  renderRecentTransfers() {
    if (!this.recentTransfersContainer) return;
    while (this.recentTransfersContainer.firstChild) {
      this.recentTransfersContainer.removeChild(this.recentTransfersContainer.firstChild);
    }
    const section = createRecentTransactionsSection({
      title: 'Recent Transfers',
      badgeText: `${this.recentTransfers.length} Transfers`,
      transactions: this.recentTransfers,
      currentAccount: getCurrentAccount(),
      emptyMessage: 'No fund transfers recorded for this account yet. Initiate your first transfer above.',
    });
    this.recentTransfersContainer.appendChild(section);
  }
}

export const transferView = new TransferView();
