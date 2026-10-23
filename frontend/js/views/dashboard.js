import { api } from '../api.js';
import { getState, setState, getCurrentAccount } from '../state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  formatDateOnly,
  animateNumber,
  createSkeleton,
} from '../utils.js';

/**
 * Dashboard View
 * Premium FinTech Overview with Zero-State UI Mandate
 */
class DashboardView {
  constructor() {
    this.container = null;
    this.unsubscribeState = null;
    this.previousBalance = 0;
  }

  async mount(outlet) {
    this.container = createElement('div', 'dashboard-view animate-fade-in');
    outlet.appendChild(this.container);

    // Initial render with loading skeleton
    this.renderSkeleton();

    // Fetch data and update state
    await this.loadData();

    // Render populated dashboard
    this.render();
  }

  unmount() {
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    this.container = null;
  }

  async loadData() {
    const { currentAccountId } = getState();
    try {
      const [accountData, statementData, vaultsData] = await Promise.allSettled([
        api.getAccount(currentAccountId),
        api.getStatement(currentAccountId, { page: 0, size: 5 }),
        api.getVaults(currentAccountId),
      ]);

      const updates = {};
      if (accountData.status === 'fulfilled' && accountData.value) {
        updates.currentAccount = accountData.value;
      }
      if (statementData.status === 'fulfilled' && statementData.value) {
        const txList = Array.isArray(statementData.value)
          ? statementData.value
          : (statementData.value.transactions || statementData.value.content || []);
        updates.transactions = txList.slice(0, 5);
      }
      if (vaultsData.status === 'fulfilled' && vaultsData.value) {
        const vList = Array.isArray(vaultsData.value)
          ? vaultsData.value
          : (vaultsData.value.vaults || []);
        updates.vaults = vList;
      }

      setState(updates);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  renderSkeleton() {
    if (!this.container) return;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const header = createElement('div', 'page-header');
    const title = createElement('h1', 'page-title', 'Portfolio Overview');
    const subtitle = createElement('p', 'page-subtitle', 'Synchronizing with core ledger in real-time...');
    header.appendChild(title);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    const grid = createElement('div', 'grid');

    // Hero skeleton
    const heroCol = createElement('div', 'col-12');
    const heroCard = createElement('div', 'card card-hero');
    heroCard.appendChild(createSkeleton(4, 'text'));
    heroCol.appendChild(heroCard);
    grid.appendChild(heroCol);

    // Stats skeleton
    for (let i = 0; i < 4; i++) {
      const chipCol = createElement('div', 'col-3 col-md-6 col-sm-12');
      const chip = createElement('div', 'quick-stat-chip');
      chip.appendChild(createSkeleton(2, 'text'));
      chipCol.appendChild(chip);
      grid.appendChild(chipCol);
    }

    this.container.appendChild(grid);
  }

  render() {
    if (!this.container) return;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const account = getCurrentAccount() || {
      accountId: getState().currentAccountId,
      holderName: 'Valued Customer',
      accountType: 'SavingsAccount',
      kycStatus: 'VERIFIED',
      availableBalance: 0,
      totalBalance: 0,
      lockedBalance: 0,
      remainingDailyLimit: 50000,
      dailyWithdrawalLimit: 50000,
      overdraftLimit: 0,
      createdAt: new Date().toISOString(),
    };

    const transactions = getState().transactions || [];
    const vaults = getState().vaults || [];

    // 1. Page Header
    const header = createElement('div', 'page-header');
    const headerLeft = createElement('div', 'header-left');
    const title = createElement('h1', 'page-title', 'Portfolio Overview');
    const subtitle = createElement(
      'p',
      'page-subtitle',
      `Welcome back, ${account.holderName || 'Customer'}. Core banking snapshot updated.`
    );
    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);

    const headerActions = createElement('div', 'page-actions');
    const statusPill = createElement('span', 'badge badge-success');
    const statusDot = createElement('span', 'pulse-dot animate-pulse');
    statusPill.appendChild(statusDot);
    statusPill.appendChild(document.createTextNode(' LIVE LEDGER '));
    headerActions.appendChild(statusPill);

    header.appendChild(headerLeft);
    header.appendChild(headerActions);
    this.container.appendChild(header);

    // 2. Main Grid Layout
    const grid = createElement('div', 'grid');

    // ==========================================
    // HERO BALANCE CARD (col-12)
    // ==========================================
    const heroCol = createElement('div', 'col-12');
    const heroCard = createElement('div', 'card card-hero');

    const heroHeader = createElement('div', 'card-header');
    const heroMeta = createElement('div', 'flex items-center gap-3');
    const accBadge = createElement('span', 'badge badge-primary', account.accountType || 'SAVINGS');
    
    // Masked Account: e.g. ACC001 -> ACC••1
    const rawAccNum = account.accountId || account.accountNumber || 'ACC001';
    const maskedNum = rawAccNum.length > 3
      ? `${rawAccNum.substring(0, 3)}••${rawAccNum.slice(-1)}`
      : rawAccNum;
    const accNumberSpan = createElement('span', 'quick-stat-label', maskedNum);
    heroMeta.appendChild(accBadge);
    heroMeta.appendChild(accNumberSpan);

    const holderName = createElement('span', 'card-subtitle', account.holderName || account.accountHolder || 'Account Holder');
    heroHeader.appendChild(heroMeta);
    heroHeader.appendChild(holderName);
    heroCard.appendChild(heroHeader);

    const heroBody = createElement('div', 'card-body flex justify-between items-end flex-wrap gap-6');
    const balanceSection = createElement('div', 'balance-primary-section');
    const balLabel = createElement('div', 'card-subtitle', 'AVAILABLE BALANCE (DISBURSABLE)');
    const balAmount = createElement('div', 'balance-large');
    balAmount.style.fontSize = 'var(--font-size-4xl)';
    balAmount.style.fontWeight = 'var(--font-weight-extrabold)';
    balAmount.style.letterSpacing = '-0.04em';
    balAmount.style.color = 'var(--color-text-white)';
    balAmount.style.margin = '4px 0 12px 0';

    // Count-up animation using requestAnimationFrame
    const targetBalance = Number(account.availableBalance) || 0;
    animateNumber(balAmount, this.previousBalance, targetBalance, 1000);
    this.previousBalance = targetBalance;

    balanceSection.appendChild(balLabel);
    balanceSection.appendChild(balAmount);

    // Sub balances breakdown: Total vs Locked
    const subBalRow = createElement('div', 'flex items-center gap-6');
    const totalBox = createElement('div', 'sub-balance-box');
    const totalLbl = createElement('div', 'card-subtitle', 'TOTAL BALANCE');
    const totalVal = createElement('div', 'font-semibold', formatCurrency(account.totalBalance || targetBalance));
    totalVal.style.color = 'var(--color-text-primary)';
    totalBox.appendChild(totalLbl);
    totalBox.appendChild(totalVal);

    const lockedBox = createElement('div', 'sub-balance-box');
    const lockedLbl = createElement('div', 'card-subtitle', 'LOCKED IN VAULTS');
    const lockedVal = createElement('div', 'font-semibold', formatCurrency(account.lockedBalance || 0));
    lockedVal.style.color = 'var(--color-warning-light)';
    lockedBox.appendChild(lockedLbl);
    lockedBox.appendChild(lockedVal);

    subBalRow.appendChild(totalBox);
    subBalRow.appendChild(lockedBox);
    balanceSection.appendChild(subBalRow);

    heroBody.appendChild(balanceSection);

    // Quick Actions (3 buttons: Deposit, Withdraw, Transfer)
    const actionsGroup = createElement('div', 'flex items-center gap-3');
    
    const depositBtn = createElement('a', 'btn btn-primary', 'Deposit');
    depositBtn.setAttribute('href', '#/deposit');
    const depIcon = createSvgIcon('deposit');
    depositBtn.prepend(depIcon);

    const withdrawBtn = createElement('a', 'btn btn-secondary', 'Withdraw');
    withdrawBtn.setAttribute('href', '#/withdraw');
    const withIcon = createSvgIcon('withdraw');
    withdrawBtn.prepend(withIcon);

    const transferBtn = createElement('a', 'btn btn-accent', 'Transfer');
    transferBtn.setAttribute('href', '#/transfer');
    const transIcon = createSvgIcon('transfer');
    transferBtn.prepend(transIcon);

    actionsGroup.appendChild(depositBtn);
    actionsGroup.appendChild(withdrawBtn);
    actionsGroup.appendChild(transferBtn);
    heroBody.appendChild(actionsGroup);

    heroCard.appendChild(heroBody);
    heroCol.appendChild(heroCard);
    grid.appendChild(heroCol);

    // ==========================================
    // 4 QUICK-STAT CHIPS
    // ==========================================
    // Chip 1: Account Type
    const chip1Col = createElement('div', 'col-3 col-md-6 col-sm-12');
    const chip1 = createElement('div', 'quick-stat-chip');
    const c1Icon = createElement('div', 'quick-stat-icon-wrap', '');
    c1Icon.appendChild(createSvgIcon('wallet'));
    const c1Meta = createElement('div', 'quick-stat-meta');
    const isCurrent = account.accountType === 'CurrentAccount' || account.accountType === 'CURRENT';
    c1Meta.appendChild(createElement('span', 'quick-stat-label', 'Account Tier'));
    c1Meta.appendChild(createElement('span', 'quick-stat-value', isCurrent ? 'Corporate Current' : 'Premium Savings'));
    chip1.appendChild(c1Icon);
    chip1.appendChild(c1Meta);
    chip1Col.appendChild(chip1);
    grid.appendChild(chip1Col);

    // Chip 2: KYC Status
    const chip2Col = createElement('div', 'col-3 col-md-6 col-sm-12');
    const chip2 = createElement('div', 'quick-stat-chip');
    const c2Icon = createElement('div', 'quick-stat-icon-wrap accent', '');
    c2Icon.appendChild(createSvgIcon('shield'));
    const c2Meta = createElement('div', 'quick-stat-meta');
    c2Meta.appendChild(createElement('span', 'quick-stat-label', 'KYC Compliance'));
    c2Meta.appendChild(createElement('span', 'quick-stat-value', account.kycStatus === 'VERIFIED' ? 'Verified (Full Access)' : (account.kycStatus || 'Active')));
    chip2.appendChild(c2Icon);
    chip2.appendChild(c2Meta);
    chip2Col.appendChild(chip2);
    grid.appendChild(chip2Col);

    // Chip 3: Daily Limit or Overdraft
    const chip3Col = createElement('div', 'col-3 col-md-6 col-sm-12');
    const chip3 = createElement('div', 'quick-stat-chip');
    const c3Icon = createElement('div', 'quick-stat-icon-wrap warning', '');
    c3Icon.appendChild(createSvgIcon('calendar'));
    const c3Meta = createElement('div', 'quick-stat-meta');
    if (isCurrent) {
      c3Meta.appendChild(createElement('span', 'quick-stat-label', 'Overdraft Facility'));
      c3Meta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(account.overdraftLimit || 25000)));
    } else {
      c3Meta.appendChild(createElement('span', 'quick-stat-label', 'Daily Limit Left'));
      const limitRemaining = account.remainingDailyLimit !== undefined 
        ? account.remainingDailyLimit 
        : (account.dailyLimitRemaining !== undefined ? account.dailyLimitRemaining : (account.dailyWithdrawalLimit || 50000));
      c3Meta.appendChild(createElement('span', 'quick-stat-value', formatCurrency(limitRemaining)));
    }
    chip3.appendChild(c3Icon);
    chip3.appendChild(c3Meta);
    chip3Col.appendChild(chip3);
    grid.appendChild(chip3Col);

    // Chip 4: Member Since
    const chip4Col = createElement('div', 'col-3 col-md-6 col-sm-12');
    const chip4 = createElement('div', 'quick-stat-chip');
    const c4Icon = createElement('div', 'quick-stat-icon-wrap info', '');
    c4Icon.appendChild(createSvgIcon('user'));
    const c4Meta = createElement('div', 'quick-stat-meta');
    c4Meta.appendChild(createElement('span', 'quick-stat-label', 'Member Since'));
    c4Meta.appendChild(createElement('span', 'quick-stat-value', formatDateOnly(account.createdAt || account.memberSince || '2024-01-01')));
    chip4.appendChild(c4Icon);
    chip4.appendChild(c4Meta);
    chip4Col.appendChild(chip4);
    grid.appendChild(chip4Col);

    // ==========================================
    // RECENT TRANSACTIONS (col-8)
    // ==========================================
    const txCol = createElement('div', 'col-8 col-md-12');
    const txCard = createElement('div', 'card card-hover');

    const txHeader = createElement('div', 'card-header');
    const txTitle = createElement('h2', 'card-title', 'Recent Activity');
    txTitle.prepend(createSvgIcon('passbook'));
    const viewAllLink = createElement('a', 'btn btn-ghost btn-sm', 'View Passbook');
    viewAllLink.setAttribute('href', '#/passbook');
    const rightArrow = createSvgIcon('arrowRight');
    viewAllLink.appendChild(rightArrow);
    txHeader.appendChild(txTitle);
    txHeader.appendChild(viewAllLink);
    txCard.appendChild(txHeader);

    const txBody = createElement('div', 'card-body');
    if (transactions.length === 0) {
      const emptyState = createElement('div', 'text-center p-6');
      emptyState.style.padding = 'var(--space-8) var(--space-4)';
      emptyState.style.textAlign = 'center';
      const emptyIcon = createSvgIcon('info');
      emptyIcon.style.width = '36px';
      emptyIcon.style.height = '36px';
      emptyIcon.style.color = 'var(--color-text-muted)';
      emptyIcon.style.margin = '0 auto var(--space-3) auto';
      const emptyText = createElement('p', 'quick-stat-label', 'No transaction activity recorded yet.');
      emptyState.appendChild(emptyIcon);
      emptyState.appendChild(emptyText);
      txBody.appendChild(emptyState);
    } else {
      const txList = createElement('div', 'mobile-tx-list');
      for (const tx of transactions) {
        const item = createElement('div', 'mobile-tx-card');

        const left = createElement('div', 'mobile-tx-left');
        const isCredit = (tx.type === 'CREDIT' || tx.type === 'DEPOSIT');
        const iconWrap = createElement(
          'div',
          `quick-stat-icon-wrap ${isCredit ? 'accent' : 'warning'}`
        );
        iconWrap.style.width = '36px';
        iconWrap.style.height = '36px';
        iconWrap.appendChild(createSvgIcon(isCredit ? 'credit' : 'debit'));
        left.appendChild(iconWrap);

        const meta = createElement('div', 'mobile-tx-meta');
        const desc = createElement('span', 'mobile-tx-desc', tx.description || `${tx.type || 'Transaction'}`);
        const date = createElement('span', 'mobile-tx-date', formatDate(tx.timestamp || tx.date || tx.createdAt));
        meta.appendChild(desc);
        meta.appendChild(date);
        left.appendChild(meta);

        const right = createElement('div', 'mobile-tx-right');
        const amountSpan = createElement(
          'span',
          isCredit ? 'tx-amount-credit' : 'tx-amount-debit',
          `${isCredit ? '+' : '-'} ${formatCurrency(tx.amount || 0)}`
        );
        right.appendChild(amountSpan);

        if (tx.runningBalance !== undefined || tx.balance !== undefined) {
          const balVal = tx.runningBalance !== undefined ? tx.runningBalance : tx.balance;
          const balSpan = createElement('span', 'mobile-tx-bal', `Bal: ${formatCurrency(balVal)}`);
          right.appendChild(balSpan);
        }

        item.appendChild(left);
        item.appendChild(right);
        txList.appendChild(item);
      }
      txBody.appendChild(txList);
    }

    txCard.appendChild(txBody);
    txCol.appendChild(txCard);
    grid.appendChild(txCol);

    // ==========================================
    // VAULTS OVERVIEW (col-4)
    // ==========================================
    const vCol = createElement('div', 'col-4 col-md-12');
    const vCard = createElement('div', 'card card-hover');

    const vHeader = createElement('div', 'card-header');
    const vTitle = createElement('h2', 'card-title', 'Goal Vaults');
    vTitle.prepend(createSvgIcon('vaults'));
    const manageVaultsLink = createElement('a', 'btn btn-ghost btn-sm', 'Manage');
    manageVaultsLink.setAttribute('href', '#/vaults');
    manageVaultsLink.appendChild(createSvgIcon('arrowRight'));
    vHeader.appendChild(vTitle);
    vHeader.appendChild(manageVaultsLink);
    vCard.appendChild(vHeader);

    const vBody = createElement('div', 'card-body');
    if (vaults.length === 0) {
      const emptyVault = createElement('div', 'text-center p-6');
      emptyVault.style.padding = 'var(--space-8) var(--space-4)';
      emptyVault.style.textAlign = 'center';
      const emptyIcon = createSvgIcon('vaults');
      emptyIcon.style.width = '36px';
      emptyIcon.style.height = '36px';
      emptyIcon.style.color = 'var(--color-text-muted)';
      emptyIcon.style.margin = '0 auto var(--space-3) auto';
      const emptyText = createElement('p', 'quick-stat-label', 'No active goal vaults.');
      const createVaultBtn = createElement('a', 'btn btn-secondary btn-sm', 'Create a Goal');
      createVaultBtn.style.marginTop = 'var(--space-3)';
      createVaultBtn.setAttribute('href', '#/vaults');
      emptyVault.appendChild(emptyIcon);
      emptyVault.appendChild(emptyText);
      emptyVault.appendChild(createVaultBtn);
      vBody.appendChild(emptyVault);
    } else {
      const vList = createElement('div', 'flex flex-col gap-4');
      for (const v of vaults) {
        const item = createElement('div', 'vault-summary-item');

        const topRow = createElement('div', 'flex justify-between items-center');
        const vName = createElement('span', 'font-semibold', v.goalName || 'Goal');
        vName.style.fontSize = 'var(--font-size-sm)';
        
        // Zero-state rule: percent comes from backend or calculate strictly for width
        const pct = v.progressPercent !== undefined
          ? Math.min(100, Math.max(0, Number(v.progressPercent)))
          : (v.targetAmount ? Math.min(100, Math.round(((v.lockedAmount || 0) / v.targetAmount) * 100)) : 0);

        const vPct = createElement('span', 'badge badge-info', `${pct}%`);
        topRow.appendChild(vName);
        topRow.appendChild(vPct);
        item.appendChild(topRow);

        // Progress bar
        const track = createElement('div', 'progress-bar-track');
        track.style.marginTop = '6px';
        track.style.marginBottom = '6px';
        const fill = createElement('div', 'progress-bar-fill');
        fill.style.width = `${pct}%`;
        track.appendChild(fill);
        item.appendChild(track);

        // Target amount info
        const bottomRow = createElement('div', 'flex justify-between text-xs');
        bottomRow.style.fontSize = 'var(--font-size-xs)';
        bottomRow.style.color = 'var(--color-text-secondary)';
        const lockedText = createElement('span', '', `${formatCurrency(v.lockedAmount || 0)} saved`);
        const targetText = createElement('span', '', `Goal: ${formatCurrency(v.targetAmount || 0)}`);
        bottomRow.appendChild(lockedText);
        bottomRow.appendChild(targetText);
        item.appendChild(bottomRow);

        vList.appendChild(item);
      }
      vBody.appendChild(vList);
    }

    vCard.appendChild(vBody);
    vCol.appendChild(vCard);
    grid.appendChild(vCol);

    this.container.appendChild(grid);
  }
}

export const dashboardView = new DashboardView();
