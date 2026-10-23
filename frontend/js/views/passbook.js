import { api } from '../api.js';
import { getState, setState, getCurrentAccount } from '../state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  showToast,
  setButtonLoading,
  createSkeleton,
} from '../utils.js';
import { CONFIG } from '../config.js';
import { showUpiReceiptModal, parseTxDetails } from '../receipt.js';

/**
 * Passbook View — Paginated, Date-Filtered Transaction Ledger
 *
 * Features:
 *   - Date-range filter (startDate / endDate)
 *   - Skeleton loaders while fetching
 *   - Responsive: table on desktop, stacked cards on mobile (<768px)
 *   - Prev/Next pagination with page metadata
 *   - CSV export via Blob API (no server needed)
 *   - All data rendered via textContent — zero innerHTML
 */
class PassbookView {
  constructor() {
    this.container = null;
    this.currentPage = 0;
    this.totalPages  = 1;
    this.totalCount  = 0;
    this.startDate   = this.getMonthStart();
    this.endDate     = this.getToday();
    this.transactions = [];
    this.account = null;
  }

  async mount(outlet) {
    this.container = createElement('div', 'passbook-view animate-fade-in');
    outlet.appendChild(this.container);

    this.renderSkeleton();
    await this.loadData();
    this.render();
  }

  unmount() {
    this.container = null;
  }

  // ── Data Loading ────────────────────────────────────────────────────────────

  async loadData() {
    const { currentAccountId } = getState();
    try {
      const [accountData, statementData] = await Promise.allSettled([
        api.getAccount(currentAccountId),
        api.getStatement(currentAccountId, {
          startDate: this.startDate,
          endDate:   this.endDate,
          page:      this.currentPage,
          size:      CONFIG.PAGE_SIZE,
        }),
      ]);

      if (accountData.status === 'fulfilled') {
        this.account = accountData.value;
        setState({ currentAccount: accountData.value });
      }

      if (statementData.status === 'fulfilled' && statementData.value) {
        const sd = statementData.value;
        if (sd.content) {
          // Paginated response
          this.transactions = sd.content;
          this.totalPages   = sd.totalPages || 1;
          this.totalCount   = sd.totalElements || 0;
        } else if (Array.isArray(sd)) {
          this.transactions = sd;
          this.totalPages   = 1;
          this.totalCount   = sd.length;
        } else {
          this.transactions = [];
        }
      }
    } catch (err) {
      console.error('Passbook loadData error:', err);
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────

  renderSkeleton() {
    if (!this.container) return;
    this.container.textContent = '';

    const card = createElement('div', 'card');

    // Header skeleton
    const hdr = createElement('div', 'skeleton skeleton-text');
    hdr.style.width = '40%';
    hdr.style.marginBottom = '24px';
    card.appendChild(hdr);

    // Row skeletons
    for (let i = 0; i < 7; i++) {
      const row = createElement('div', 'skeleton skeleton-row');
      card.appendChild(row);
    }

    this.container.appendChild(card);
  }

  // ── Main Render ─────────────────────────────────────────────────────────────

  render() {
    if (!this.container) return;
    this.container.textContent = '';

    // ── Page Header ─────────────────────────────────────────────────────────
    const header = createElement('div', 'page-header');
    const titleRow = createElement('div', 'page-title-row');
    const iconWrap = createElement('span', 'page-title-icon');
    iconWrap.appendChild(createSvgIcon('passbook'));
    const h1 = createElement('h1', 'page-title', 'Passbook');
    titleRow.appendChild(iconWrap);
    titleRow.appendChild(h1);
    const subtitle = createElement('p', 'page-subtitle',
      `${this.totalCount} transaction${this.totalCount !== 1 ? 's' : ''} found in selected range`);
    header.appendChild(titleRow);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    // ── Filter Bar ──────────────────────────────────────────────────────────
    this.container.appendChild(this.renderFilterBar());

    // ── Transaction List ────────────────────────────────────────────────────
    const card = createElement('div', 'card passbook-card');

    if (this.transactions.length === 0) {
      const empty = createElement('div', 'empty-state');
      const emptyIcon = createElement('div', 'empty-state-icon');
      emptyIcon.appendChild(createSvgIcon('passbook'));
      const emptyMsg = createElement('p', 'empty-state-text',
        'No transactions found in this date range.');
      const emptyHint = createElement('p', 'empty-state-hint',
        'Try expanding the date range or switching accounts.');
      empty.appendChild(emptyIcon);
      empty.appendChild(emptyMsg);
      empty.appendChild(emptyHint);
      card.appendChild(empty);
    } else {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        card.appendChild(this.renderMobileCards());
      } else {
        card.appendChild(this.renderDesktopTable());
      }
    }

    this.container.appendChild(card);

    // ── Pagination ──────────────────────────────────────────────────────────
    if (this.totalPages > 1 || this.transactions.length > 0) {
      this.container.appendChild(this.renderPagination());
    }

    // ── CSV Export ──────────────────────────────────────────────────────────
    if (this.transactions.length > 0) {
      const exportRow = createElement('div', 'export-row');
      const csvBtn = createElement('button', 'btn btn-secondary');
      const csvIcon = createElement('span', 'btn-icon-wrap');
      csvIcon.appendChild(createSvgIcon('download'));
      const csvText = createElement('span', '', 'Export CSV');
      csvBtn.appendChild(csvIcon);
      csvBtn.appendChild(csvText);
      csvBtn.addEventListener('click', () => {
        this.downloadCsv();
        showToast('Statement exported as CSV.', 'success');
      });
      exportRow.appendChild(csvBtn);
      this.container.appendChild(exportRow);
    }
  }

  // ── Filter Bar ──────────────────────────────────────────────────────────────

  renderFilterBar() {
    const { currentAccountId } = getState();
    const bar = createElement('div', 'passbook-filter-bar');

    // Start date
    const startGroup = createElement('div', 'filter-group');
    const startLabel = createElement('label', 'form-label', 'From');
    const startInput = createElement('input', 'form-input filter-date');
    startInput.type  = 'date';
    startInput.value = this.startDate;
    startInput.max   = this.endDate;
    startGroup.appendChild(startLabel);
    startGroup.appendChild(startInput);

    // End date
    const endGroup = createElement('div', 'filter-group');
    const endLabel = createElement('label', 'form-label', 'To');
    const endInput = createElement('input', 'form-input filter-date');
    endInput.type  = 'date';
    endInput.value = this.endDate;
    endInput.max   = this.getToday();
    endGroup.appendChild(endLabel);
    endGroup.appendChild(endInput);

    // Filter button
    const filterBtn = createElement('button', 'btn btn-primary');
    filterBtn.id = 'btn-passbook-filter';
    filterBtn.textContent = 'Apply Filter';

    filterBtn.addEventListener('click', async () => {
      this.startDate   = startInput.value || this.getMonthStart();
      this.endDate     = endInput.value || this.getToday();
      this.currentPage = 0;

      setButtonLoading(filterBtn, true);
      this.renderSkeleton();
      await this.loadData();
      this.render();
    });

    // Quick preset chips
    const presets = createElement('div', 'filter-presets');

    const presetsData = [
      { label: 'This Month', start: this.getMonthStart(), end: this.getToday() },
      { label: 'Last 7 Days', start: this.daysAgo(7), end: this.getToday() },
      { label: 'Last 30 Days', start: this.daysAgo(30), end: this.getToday() },
      { label: 'Last 3 Months', start: this.daysAgo(90), end: this.getToday() },
    ];

    presetsData.forEach(preset => {
      const chip = createElement('button', 'filter-chip', preset.label);
      chip.addEventListener('click', async () => {
        this.startDate   = preset.start;
        this.endDate     = preset.end;
        this.currentPage = 0;
        startInput.value = this.startDate;
        endInput.value   = this.endDate;
        this.renderSkeleton();
        await this.loadData();
        this.render();
      });
      presets.appendChild(chip);
    });

    bar.appendChild(startGroup);
    bar.appendChild(endGroup);
    bar.appendChild(filterBtn);
    bar.appendChild(presets);

    return bar;
  }

  // ── Desktop Table ────────────────────────────────────────────────────────────

  renderDesktopTable() {
    const { currentAccountId } = getState();
    const currentAccount = this.account || getCurrentAccount();
    const tableWrapper = createElement('div', 'table-scroll-wrapper');
    const table = createElement('table', 'tx-table');
    table.setAttribute('role', 'table');

    // Head
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    ['Date & Time', 'Type', 'Counterparty / Party', 'Narration / Remark', 'Amount', 'Balance After', 'Action'].forEach(h => {
      const th = createElement('th', '', h);
      th.setAttribute('scope', 'col');
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');
    this.transactions.forEach(tx => {
      const parsed = parseTxDetails(tx);
      const isCredit = parsed.isCredit;
      const row = createElement('tr');
      row.setAttribute('role', 'row');

      // Date & Time
      const tdDate = createElement('td', 'tx-date');
      const dateText = createElement('div', 'font-medium', parsed.dateFormatted);
      const timeText = createElement('div', 'text-xs text-muted', parsed.timeFormatted);
      tdDate.appendChild(dateText);
      tdDate.appendChild(timeText);

      // Type Badge
      const tdType = createElement('td', 'tx-type');
      const badge  = createElement('span',
        `tx-badge ${isCredit ? 'tx-badge-credit' : 'tx-badge-debit'}`,
        parsed.typeName);
      tdType.appendChild(badge);

      // Counterparty / Party column
      const tdParty = createElement('td', 'tx-party');
      const partyWrap = createElement('div', 'tx-party-wrap');
      const partyName = createElement('span', 'tx-party-name', parsed.party);
      partyWrap.appendChild(partyName);
      tdParty.appendChild(partyWrap);

      // Narration / Remark
      const tdDesc = createElement('td', 'tx-desc');
      const descWrap = createElement('div', 'tx-party-wrap');
      const remarkText = parsed.remark || tx.description || '—';
      const descEl = createElement('span', 'tx-desc-text', remarkText);
      descWrap.appendChild(descEl);
      if (parsed.refId) {
        const refPill = createElement('span', 'tx-party-ref', `Ref: ${parsed.refId}`);
        descWrap.appendChild(refPill);
      }
      tdDesc.appendChild(descWrap);

      // Amount
      const tdAmt = createElement('td',
        `tx-amount ${isCredit ? 'tx-credit' : 'tx-debit'}`,
        `${isCredit ? '+' : '−'}${formatCurrency(tx.amount)}`);

      // Balance After
      const tdBal = createElement('td', 'tx-balance', formatCurrency(tx.balanceAfter));

      // Action: View Receipt Modal
      const tdAction = createElement('td', 'tx-action');
      const receiptBtn = createElement('button', 'btn-receipt-pill');
      receiptBtn.setAttribute('type', 'button');
      receiptBtn.appendChild(createSvgIcon('passbook'));
      receiptBtn.appendChild(createElement('span', '', 'Receipt'));
      receiptBtn.addEventListener('click', () => {
        showUpiReceiptModal({
          amount: tx.amount,
          newBalance: tx.balanceAfter,
          isCredit: parsed.isCredit,
          badgeText: parsed.isCredit ? 'Payment Settled' : 'Payment Debited',
          party: parsed.party,
          fromAccount: parsed.isCredit
            ? parsed.party
            : (currentAccount ? `${currentAccount.accountId} · ${currentAccount.holderName}` : 'Self'),
          toAccount: parsed.isCredit
            ? (currentAccount ? `${currentAccount.accountId} · ${currentAccount.holderName}` : 'Self')
            : parsed.party,
          transactionId: tx.transactionId,
          refId: parsed.refId || tx.transactionId,
          remark: parsed.remark || tx.remark || '',
          timestamp: tx.timestamp,
          dateFormatted: `${parsed.dateFormatted} at ${parsed.timeFormatted}`,
        });
      });
      tdAction.appendChild(receiptBtn);

      row.appendChild(tdDate);
      row.appendChild(tdType);
      row.appendChild(tdParty);
      row.appendChild(tdDesc);
      row.appendChild(tdAmt);
      row.appendChild(tdBal);
      row.appendChild(tdAction);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    return tableWrapper;
  }

  // ── Mobile Cards ─────────────────────────────────────────────────────────────

  renderMobileCards() {
    const { currentAccountId } = getState();
    const currentAccount = this.account || getCurrentAccount();
    const list = createElement('div', 'tx-card-list');

    this.transactions.forEach(tx => {
      const parsed = parseTxDetails(tx);
      const isCredit = parsed.isCredit;

      const card = createElement('div', 'tx-card-mobile');

      // Top row: Type badge & Date/Time
      const top = createElement('div', 'tx-card-top');
      const badge = createElement('span',
        `tx-badge ${isCredit ? 'tx-badge-credit' : 'tx-badge-debit'}`,
        parsed.typeName);
      const dateEl = createElement('span', 'tx-card-date', `${parsed.dateFormatted}, ${parsed.timeFormatted}`);
      top.appendChild(badge);
      top.appendChild(dateEl);

      // Middle row: Counterparty, Remark & Amount
      const middle = createElement('div', 'tx-card-middle');
      const infoWrap = createElement('div', 'tx-card-info-wrap');
      const partyEl = createElement('p', 'tx-party-name font-semibold', parsed.party);
      infoWrap.appendChild(partyEl);

      const remarkText = parsed.remark || tx.description;
      if (remarkText) {
        const descEl = createElement('p', 'tx-card-desc text-muted text-xs', `“${remarkText}”`);
        infoWrap.appendChild(descEl);
      }
      if (parsed.refId) {
        const refEl = createElement('p', 'tx-party-ref text-xs', `Ref: ${parsed.refId}`);
        infoWrap.appendChild(refEl);
      }

      const amount = createElement('p',
        `tx-card-amount ${isCredit ? 'tx-credit' : 'tx-debit'}`,
        `${isCredit ? '+' : '−'}${formatCurrency(tx.amount)}`);

      middle.appendChild(infoWrap);
      middle.appendChild(amount);

      // Bottom row: Balance & Receipt button
      const bottom = createElement('div', 'tx-card-bottom');
      const balWrap = createElement('div', 'tx-card-bal-wrap');
      const balLabel = createElement('span', 'tx-card-bal-label', 'Balance: ');
      const balValue = createElement('span', 'tx-card-bal-value', formatCurrency(tx.balanceAfter));
      balWrap.appendChild(balLabel);
      balWrap.appendChild(balValue);

      const receiptBtn = createElement('button', 'btn-receipt-pill');
      receiptBtn.setAttribute('type', 'button');
      receiptBtn.appendChild(createSvgIcon('passbook'));
      receiptBtn.appendChild(createElement('span', '', 'View Receipt'));
      receiptBtn.addEventListener('click', () => {
        showUpiReceiptModal({
          amount: tx.amount,
          newBalance: tx.balanceAfter,
          isCredit: parsed.isCredit,
          badgeText: parsed.isCredit ? 'Payment Settled' : 'Payment Debited',
          party: parsed.party,
          fromAccount: parsed.isCredit
            ? parsed.party
            : (currentAccount ? `${currentAccount.accountId} · ${currentAccount.holderName}` : 'Self'),
          toAccount: parsed.isCredit
            ? (currentAccount ? `${currentAccount.accountId} · ${currentAccount.holderName}` : 'Self')
            : parsed.party,
          transactionId: tx.transactionId,
          refId: parsed.refId || tx.transactionId,
          remark: parsed.remark || tx.remark || '',
          timestamp: tx.timestamp,
          dateFormatted: `${parsed.dateFormatted} at ${parsed.timeFormatted}`,
        });
      });

      bottom.appendChild(balWrap);
      bottom.appendChild(receiptBtn);

      card.appendChild(top);
      card.appendChild(middle);
      card.appendChild(bottom);
      list.appendChild(card);
    });
    return list;
  }

  // ── Pagination ───────────────────────────────────────────────────────────────

  renderPagination() {
    const { currentAccountId } = getState();
    const pag = createElement('div', 'pagination');

    const info = createElement('span', 'pagination-info');
    const start = this.currentPage * CONFIG.PAGE_SIZE + 1;
    const end   = Math.min((this.currentPage + 1) * CONFIG.PAGE_SIZE, this.totalCount);
    info.textContent = this.totalCount > 0
      ? `Showing ${start}–${end} of ${this.totalCount} transactions`
      : 'No transactions';
    pag.appendChild(info);

    const controls = createElement('div', 'pagination-controls');

    const prevBtn = createElement('button', 'btn btn-secondary btn-sm');
    prevBtn.textContent = '← Prev';
    prevBtn.disabled = this.currentPage === 0;
    if (this.currentPage === 0) prevBtn.classList.add('btn-disabled');
    prevBtn.addEventListener('click', async () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.renderSkeleton();
        await this.loadData();
        this.render();
      }
    });

    const pageLabel = createElement('span', 'pagination-page-label',
      `Page ${this.currentPage + 1} of ${this.totalPages}`);

    const nextBtn = createElement('button', 'btn btn-secondary btn-sm');
    nextBtn.textContent = 'Next →';
    const isLastPage = this.currentPage >= this.totalPages - 1;
    nextBtn.disabled = isLastPage;
    if (isLastPage) nextBtn.classList.add('btn-disabled');
    nextBtn.addEventListener('click', async () => {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
        this.renderSkeleton();
        await this.loadData();
        this.render();
      }
    });

    controls.appendChild(prevBtn);
    controls.appendChild(pageLabel);
    controls.appendChild(nextBtn);
    pag.appendChild(controls);

    return pag;
  }

  // ── CSV Export (Structured Audit-Grade Bank Statement) ────────────────────────

  downloadCsv() {
    const { currentAccountId } = getState();
    const account = this.account || getCurrentAccount() || {
      accountId: currentAccountId,
      holderName: 'Account Holder',
      accountType: 'SavingsAccount',
      availableBalance: 0,
    };

    let totalCredits = 0;
    let totalDebits = 0;

    const dataRows = this.transactions.map((tx, i) => {
      const parsed = parseTxDetails(tx);
      const amtNum = parseFloat(tx.amount) || 0;
      if (parsed.isCredit) {
        totalCredits += amtNum;
      } else {
        totalDebits += amtNum;
      }

      const debitStr = !parsed.isCredit ? amtNum.toFixed(2) : '';
      const creditStr = parsed.isCredit ? amtNum.toFixed(2) : '';
      const balStr = (parseFloat(tx.balanceAfter) || 0).toFixed(2);
      const remarkClean = (parsed.remark || tx.description || '').replace(/"/g, '""');
      const partyClean = (parsed.party || '').replace(/"/g, '""');

      return [
        i + 1,
        `"${tx.transactionId || ''}"`,
        `"${parsed.dateFormatted}"`,
        `"${parsed.timeFormatted}"`,
        `"${tx.type}"`,
        `"${partyClean}"`,
        `"${remarkClean}"`,
        `"${parsed.refId || ''}"`,
        `"${debitStr}"`,
        `"${creditStr}"`,
        `"${balStr}"`,
      ].join(',');
    });

    const netMovement = totalCredits - totalDebits;
    const closingBalance = this.transactions.length > 0
      ? (parseFloat(this.transactions[0].balanceAfter) || 0).toFixed(2)
      : '0.00';

    // Official Bank Statement Header
    const headerLines = [
      '========================================================================================',
      'NEXGEN CORE DIGITAL BANK - OFFICIAL ACCOUNT STATEMENT',
      '========================================================================================',
      `Account Number,"${account.accountId}"`,
      `Account Holder,"${account.holderName || 'Account Holder'}"`,
      `Account Type,"${account.accountType || 'Savings Account'}"`,
      `Statement Period,"${this.startDate} to ${this.endDate}"`,
      `Generated At,"${new Date().toLocaleString('en-IN')}"`,
      'Currency,"INR (INR)"',
      '========================================================================================',
      '',
      '#,"Transaction ID","Date","Time","Type","Counterparty / Party","Narration / Remark","Reference ID","Withdrawal (Debit INR)","Deposit (Credit INR)","Balance (INR)"',
    ];

    // Summary Block
    const footerLines = [
      '',
      '========================================================================================',
      'STATEMENT SUMMARY',
      '========================================================================================',
      `Total Transactions,${this.transactions.length}`,
      `Total Credits (INR),${totalCredits.toFixed(2)}`,
      `Total Debits (INR),${totalDebits.toFixed(2)}`,
      `Net Inflow/Outflow (INR),${(netMovement >= 0 ? '+' : '') + netMovement.toFixed(2)}`,
      `Closing Balance (INR),${closingBalance}`,
      '========================================================================================',
    ];

    const fullCsv = [...headerLines, ...dataRows, ...footerLines].join('\r\n');

    // Prepend UTF-8 BOM (\uFEFF) for immediate Excel compatibility
    const blob = new Blob(['\uFEFF' + fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `NexGen_Statement_${account.accountId}_${this.startDate}_to_${this.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  formatTxType(type) {
    const map = {
      DEPOSIT: 'Deposit',
      WITHDRAWAL: 'Withdrawal',
      TRANSFER_OUT: 'Transfer Out',
      TRANSFER_IN: 'Transfer In',
      OVERDRAFT_FEE: 'Overdraft Fee',
      VAULT_LOCK: 'Vault Lock',
      VAULT_UNLOCK: 'Vault Release',
    };
    return map[type] || type;
  }

  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  getMonthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
}

export const passbookView = new PassbookView();
