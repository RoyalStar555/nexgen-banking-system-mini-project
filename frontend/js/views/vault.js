import { api } from '../api.js';
import { getState, setState } from '../state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  showToast,
  setButtonLoading,
} from '../utils.js';

/**
 * Vault View — Goal-Based Savings Manager
 *
 * Features:
 *   - Create new GoalVaults with name, target, and deadline
 *   - Lock funds from available balance into a vault
 *   - Unlock (break) a vault to release all funds
 *   - Animated progress bars showing % of goal reached
 *   - Real-time balance refresh after every action
 */
class VaultView {
  constructor() {
    this.container = null;
    this.vaults    = [];
    this.account   = null;
  }

  async mount(outlet) {
    this.container = createElement('div', 'vault-view animate-fade-in');
    outlet.appendChild(this.container);

    this.renderSkeleton();
    await this.loadData();
    this.render();
  }

  unmount() {
    this.container = null;
  }

  // ── Data Loading ─────────────────────────────────────────────────────────────

  async loadData() {
    const { currentAccountId } = getState();
    try {
      const [accountData, vaultsData] = await Promise.allSettled([
        api.getAccount(currentAccountId),
        api.getVaults(currentAccountId),
      ]);

      if (accountData.status === 'fulfilled') {
        this.account = accountData.value;
        setState({ currentAccount: accountData.value });
      }
      if (vaultsData.status === 'fulfilled') {
        this.vaults = Array.isArray(vaultsData.value) ? vaultsData.value : [];
        setState({ vaults: this.vaults });
      }
    } catch (err) {
      console.error('Vault loadData error:', err);
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  renderSkeleton() {
    if (!this.container) return;
    this.container.textContent = '';

    const grid = createElement('div', 'vault-grid');
    for (let i = 0; i < 3; i++) {
      const card = createElement('div', 'card');
      card.appendChild(Object.assign(createElement('div', 'skeleton skeleton-text'), {
        style: 'width:60%;margin-bottom:12px',
      }));
      card.appendChild(Object.assign(createElement('div', 'skeleton'), {
        style: 'height:8px;border-radius:4px;margin-bottom:16px',
      }));
      for (let j = 0; j < 3; j++) {
        const line = createElement('div', 'skeleton skeleton-text');
        line.style.width = j % 2 === 0 ? '80%' : '50%';
        line.style.marginBottom = '8px';
        card.appendChild(line);
      }
      grid.appendChild(card);
    }
    this.container.appendChild(grid);
  }

  // ── Main Render ──────────────────────────────────────────────────────────────

  render() {
    if (!this.container) return;
    this.container.textContent = '';

    // ── Page Header ─────────────────────────────────────────────────────────
    const header = createElement('div', 'page-header');
    const titleRow = createElement('div', 'page-title-row');
    const iconWrap = createElement('span', 'page-title-icon');
    iconWrap.appendChild(createSvgIcon('vault'));
    const h1 = createElement('h1', 'page-title', 'Goal Vaults');
    titleRow.appendChild(iconWrap);
    titleRow.appendChild(h1);
    const subtitle = createElement('p', 'page-subtitle',
      'Lock funds towards a savings goal. Locked funds reduce your available balance.');
    header.appendChild(titleRow);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    // ── Available Balance Banner ─────────────────────────────────────────────
    if (this.account) {
      const banner = createElement('div', 'vault-balance-banner');
      const avail  = createElement('div', 'vault-banner-item');
      const aLabel = createElement('span', 'vault-banner-label', 'Available Balance');
      const aValue = createElement('span', 'vault-banner-value',
        formatCurrency(this.account.availableBalance));
      avail.appendChild(aLabel);
      avail.appendChild(aValue);

      const locked = createElement('div', 'vault-banner-item');
      const lLabel = createElement('span', 'vault-banner-label', 'Locked in Vaults');
      const lValue = createElement('span', 'vault-banner-value vault-locked',
        formatCurrency(this.account.lockedBalance));
      locked.appendChild(lLabel);
      locked.appendChild(lValue);

      const total  = createElement('div', 'vault-banner-item');
      const tLabel = createElement('span', 'vault-banner-label', 'Total Balance');
      const tValue = createElement('span', 'vault-banner-value',
        formatCurrency(this.account.totalBalance));
      total.appendChild(tLabel);
      total.appendChild(tValue);

      banner.appendChild(avail);
      banner.appendChild(locked);
      banner.appendChild(total);
      this.container.appendChild(banner);
    }

    // ── Create Vault Form ────────────────────────────────────────────────────
    this.container.appendChild(this.renderCreateVaultForm());

    // ── Vault Cards Grid ─────────────────────────────────────────────────────
    const sectionTitle = createElement('h2', 'section-title',
      `My Vaults (${this.vaults.length})`);
    this.container.appendChild(sectionTitle);

    if (this.vaults.length === 0) {
      const empty = createElement('div', 'empty-state card');
      const emptyIcon = createElement('div', 'empty-state-icon');
      emptyIcon.appendChild(createSvgIcon('vault'));
      const emptyMsg = createElement('p', 'empty-state-text',
        'No goal vaults yet.');
      const emptyHint = createElement('p', 'empty-state-hint',
        'Create your first vault above to start saving towards a goal.');
      empty.appendChild(emptyIcon);
      empty.appendChild(emptyMsg);
      empty.appendChild(emptyHint);
      this.container.appendChild(empty);
    } else {
      const grid = createElement('div', 'vault-grid');
      this.vaults.forEach(vault => {
        grid.appendChild(this.renderVaultCard(vault));
      });
      this.container.appendChild(grid);
    }
  }

  // ── Create Vault Form ─────────────────────────────────────────────────────────

  renderCreateVaultForm() {
    const { currentAccountId } = getState();
    const card = createElement('div', 'card create-vault-card');

    const cardTitle = createElement('h3', 'card-section-title', '+ Create New Goal Vault');
    card.appendChild(cardTitle);

    const formGrid = createElement('div', 'vault-form-grid');

    // Goal Name
    const nameGroup = createElement('div', 'form-group');
    const nameLabel = createElement('label', 'form-label', 'Goal Name');
    const nameInput = createElement('input', 'form-input');
    nameInput.id = 'vault-name';
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g. iPhone 16, Europe Trip, Emergency Fund';
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);

    // Target Amount
    const targetGroup = createElement('div', 'form-group');
    const targetLabel = createElement('label', 'form-label', 'Target Amount (₹)');
    const targetInput = createElement('input', 'form-input');
    targetInput.id = 'vault-target';
    targetInput.type = 'number';
    targetInput.placeholder = 'e.g. 85000';
    targetInput.min = '100';
    targetGroup.appendChild(targetLabel);
    targetGroup.appendChild(targetInput);

    // Target Date
    const dateGroup = createElement('div', 'form-group');
    const dateLabel = createElement('label', 'form-label', 'Target Date (optional)');
    const dateInput = createElement('input', 'form-input');
    dateInput.id = 'vault-date';
    dateInput.type = 'date';
    dateInput.min = new Date().toISOString().split('T')[0];
    dateGroup.appendChild(dateLabel);
    dateGroup.appendChild(dateInput);

    formGrid.appendChild(nameGroup);
    formGrid.appendChild(targetGroup);
    formGrid.appendChild(dateGroup);
    card.appendChild(formGrid);

    // Create Button
    const createBtn = createElement('button', 'btn btn-primary');
    createBtn.id = 'btn-create-vault';
    createBtn.textContent = 'Create Vault';

    createBtn.addEventListener('click', async () => {
      const goalName    = nameInput.value.trim();
      const targetAmt   = targetInput.value.trim();
      const targetDate  = dateInput.value;

      if (!goalName) {
        showToast('Please enter a goal name.', 'warning');
        nameInput.focus();
        return;
      }
      if (!targetAmt || parseFloat(targetAmt) <= 0) {
        showToast('Please enter a valid target amount.', 'warning');
        targetInput.focus();
        return;
      }

      try {
        setButtonLoading(createBtn, true);
        await api.createVault(currentAccountId, {
          goalName,
          targetAmount: targetAmt,
          targetDate: targetDate || null,
        });
        showToast(`Vault "${goalName}" created!`, 'success');

        nameInput.value   = '';
        targetInput.value = '';
        dateInput.value   = '';

        await this.loadData();
        this.render();
      } catch (err) {
        // Toast shown by api.js
      } finally {
        setButtonLoading(createBtn, false);
      }
    });

    card.appendChild(createBtn);
    return card;
  }

  // ── Individual Vault Card ────────────────────────────────────────────────────

  renderVaultCard(vault) {
    const { currentAccountId } = getState();
    const progress = Math.min(parseFloat(vault.progressPercent) || 0, 100);

    const card = createElement('div', 'card vault-card');

    // Header row: name + badge
    const headerRow = createElement('div', 'vault-card-header');
    const vaultIcon = createElement('div', 'vault-icon');
    vaultIcon.appendChild(createSvgIcon('vault'));
    const nameEl = createElement('h3', 'vault-card-name', vault.goalName);
    const progressBadge = createElement('span', 'vault-progress-badge',
      `${progress.toFixed(1)}%`);
    headerRow.appendChild(vaultIcon);
    headerRow.appendChild(nameEl);
    headerRow.appendChild(progressBadge);
    card.appendChild(headerRow);

    // Progress bar
    const track = createElement('div', 'progress-track');
    const fill  = createElement('div', 'progress-fill');
    fill.style.width = '0%'; // Will animate via JS
    fill.dataset.target = `${progress}%`;
    track.appendChild(fill);
    card.appendChild(track);

    // Amounts row
    const amtsRow = createElement('div', 'vault-amounts-row');
    const saved = createElement('div', 'vault-amount-item');
    const savedLabel = createElement('span', 'vault-amount-label', 'Saved');
    const savedValue = createElement('span', 'vault-amount-value vault-saved',
      formatCurrency(vault.lockedAmount));
    saved.appendChild(savedLabel);
    saved.appendChild(savedValue);

    const target = createElement('div', 'vault-amount-item');
    const targetLabel = createElement('span', 'vault-amount-label', 'Target');
    const targetValue = createElement('span', 'vault-amount-value',
      formatCurrency(vault.targetAmount));
    target.appendChild(targetLabel);
    target.appendChild(targetValue);

    amtsRow.appendChild(saved);
    amtsRow.appendChild(target);
    card.appendChild(amtsRow);

    // Target date
    if (vault.targetDate) {
      const dateRow = createElement('div', 'vault-date-row');
      const dateLabel = createElement('span', 'vault-date-label', '🎯 Target: ');
      const dateValue = createElement('span', 'vault-date-value', vault.targetDate);
      dateRow.appendChild(dateLabel);
      dateRow.appendChild(dateValue);
      card.appendChild(dateRow);
    }

    // Warning
    const warning = createElement('p', 'vault-warning',
      '⚠ Locked funds cannot be used until unlocked.');
    card.appendChild(warning);

    // Action buttons row
    const actionsRow = createElement('div', 'vault-actions');

    // Lock more funds
    const lockAmtInput = createElement('input', 'form-input vault-lock-input');
    lockAmtInput.type = 'number';
    lockAmtInput.placeholder = 'Amount to lock';
    lockAmtInput.min = '1';

    const lockBtn = createElement('button', 'btn btn-primary btn-sm');
    lockBtn.textContent = 'Lock';

    lockBtn.addEventListener('click', async () => {
      const amount = lockAmtInput.value.trim();
      if (!amount || parseFloat(amount) <= 0) {
        showToast('Enter an amount to lock.', 'warning');
        lockAmtInput.focus();
        return;
      }
      try {
        setButtonLoading(lockBtn, true);
        await api.lockVault(currentAccountId, vault.vaultId, amount);
        showToast(`₹${parseFloat(amount).toFixed(2)} locked into "${vault.goalName}".`, 'success');
        lockAmtInput.value = '';
        await this.loadData();
        this.render();
      } catch (err) {
        // Toast shown by api.js
      } finally {
        setButtonLoading(lockBtn, false);
      }
    });

    // Unlock vault
    const unlockBtn = createElement('button', 'btn btn-secondary btn-sm vault-unlock-btn');
    unlockBtn.textContent = 'Break Vault';

    unlockBtn.addEventListener('click', async () => {
      const lockedAmt = parseFloat(vault.lockedAmount);
      if (lockedAmt <= 0) {
        showToast('No funds locked in this vault.', 'info');
        return;
      }

      // Simple confirm via button text toggle (no alert/confirm — pure UI pattern)
      if (unlockBtn.dataset.confirming !== 'true') {
        unlockBtn.dataset.confirming = 'true';
        unlockBtn.textContent = `Confirm Release ₹${lockedAmt.toFixed(2)}?`;
        unlockBtn.classList.add('btn-danger');
        setTimeout(() => {
          if (unlockBtn.dataset.confirming === 'true') {
            unlockBtn.dataset.confirming = 'false';
            unlockBtn.textContent = 'Break Vault';
            unlockBtn.classList.remove('btn-danger');
          }
        }, 4000);
        return;
      }

      try {
        unlockBtn.dataset.confirming = 'false';
        setButtonLoading(unlockBtn, true);
        await api.unlockVault(currentAccountId, vault.vaultId);
        showToast(`₹${lockedAmt.toFixed(2)} released from "${vault.goalName}".`, 'success');
        await this.loadData();
        this.render();
      } catch (err) {
        // Toast shown by api.js
      } finally {
        setButtonLoading(unlockBtn, false);
      }
    });

    const lockRow = createElement('div', 'vault-lock-row');
    lockRow.appendChild(lockAmtInput);
    lockRow.appendChild(lockBtn);
    actionsRow.appendChild(lockRow);
    actionsRow.appendChild(unlockBtn);
    card.appendChild(actionsRow);

    // Animate progress bar after DOM insertion
    requestAnimationFrame(() => {
      setTimeout(() => {
        fill.style.width = `${progress}%`;
      }, 150);
    });

    return card;
  }
}

export const vaultView = new VaultView();
