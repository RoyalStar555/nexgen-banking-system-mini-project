import { api } from './api.js';
import { getState, setState, getCurrentAccount } from './state.js';
import {
  createElement,
  createSvgIcon,
  formatCurrency,
  showToast,
  setButtonLoading,
} from './utils.js';
import { router } from './router.js';

/**
 * Switches the active banking session to a new account ID.
 */
export async function switchAccount(newAccountId) {
  if (!newAccountId) return;
  const { currentAccountId } = getState();

  // Update storage session
  localStorage.setItem('nexgen_active_account', newAccountId);

  // Update state and clear cached account snapshots
  setState({
    currentAccountId: newAccountId,
    currentAccount: null,
    transactions: [],
    vaults: [],
    beneficiaries: [],
  });

  // Re-fetch fresh account snapshot
  try {
    const acc = await api.getAccount(newAccountId);
    if (acc) {
      setState({ currentAccount: acc });
    }
  } catch (err) {
    console.warn('Could not refresh account after switch:', err);
  }

  // Close modal if open
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  }

  showToast(`Active account switched to ${newAccountId}`, 'success');

  // Trigger app UI refresh
  if (window.refreshAppHeaderAndSidebar) {
    window.refreshAppHeaderAndSidebar();
  }

  // Re-navigate current route
  await router.navigate(window.location.hash || '#/dashboard');
}

/**
 * Displays the comprehensive Multi-User Authentication, Switching & Registration Modal.
 */
export async function showAuthModal(initialTab = 'profiles') {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (!overlay || !modalContent) return;

  while (modalContent.firstChild) {
    modalContent.removeChild(modalContent.firstChild);
  }

  // Fetch all accounts
  let accountsList = [];
  try {
    const res = await api.getAccounts();
    if (Array.isArray(res)) {
      accountsList = res;
      setState({ accounts: res });
    }
  } catch (e) {
    accountsList = getState().accounts || [];
  }

  const { currentAccountId } = getState();

  // Close helper
  const closeModal = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  };

  // Close button
  const closeBtn = createElement('button', 'upi-modal-close');
  closeBtn.appendChild(createSvgIcon('x'));
  closeBtn.addEventListener('click', closeModal);

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  // Wrapper
  const wrapper = createElement('div', 'auth-modal-card animate-fade-in');

  // Header
  const header = createElement('div', 'auth-modal-header');
  const brandPill = createElement('div', 'auth-brand-pill');
  brandPill.appendChild(createSvgIcon('shield'));
  brandPill.appendChild(createElement('span', '', 'NexGen Multi-User Core Security'));
  const title = createElement('h2', 'auth-modal-title', 'Account Portal & Login');
  const subtitle = createElement(
    'p',
    'auth-modal-subtitle',
    'Switch between individual/business accounts, log in with an Account ID, or open a new account.'
  );
  header.appendChild(brandPill);
  header.appendChild(title);
  header.appendChild(subtitle);
  wrapper.appendChild(header);

  // Tab buttons row
  const tabsRow = createElement('div', 'auth-tabs-row');
  const tabs = [
    { id: 'profiles', label: 'Saved Accounts' },
    { id: 'login',    label: 'Sign In by ID' },
    { id: 'register', label: '+ Open New Account' },
  ];

  const panels = {};

  tabs.forEach(t => {
    const tabBtn = createElement('button', `auth-tab-btn ${t.id === initialTab ? 'active' : ''}`, t.label);
    tabBtn.dataset.tab = t.id;
    tabBtn.addEventListener('click', () => {
      tabsRow.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      Object.keys(panels).forEach(k => {
        panels[k].classList.toggle('hidden', k !== t.id);
      });
    });
    tabsRow.appendChild(tabBtn);
  });
  wrapper.appendChild(tabsRow);

  // ── Panel 1: Saved Profiles List ──────────────────────────────────────────
  const panelProfiles = createElement('div', `auth-tab-panel ${initialTab === 'profiles' ? '' : 'hidden'}`);
  panels['profiles'] = panelProfiles;

  const profList = createElement('div', 'profile-card-list');
  accountsList.forEach(acc => {
    const isActive = acc.accountId === currentAccountId;
    const item = createElement('div', `profile-card-item ${isActive ? 'active' : ''}`);

    const left = createElement('div', 'profile-item-left');
    const avatar = createElement('div', 'profile-avatar', (acc.holderName || 'NB').substring(0, 2).toUpperCase());
    const meta = createElement('div', 'profile-meta');
    const nameRow = createElement('div', 'profile-name-row');
    const name = createElement('span', 'profile-name', acc.holderName);
    const badge = createElement('span', `tx-badge ${acc.accountType === 'CurrentAccount' ? 'tx-badge-debit' : 'tx-badge-credit'}`,
      acc.accountType === 'CurrentAccount' ? 'Corporate Current' : 'Personal Savings');
    nameRow.appendChild(name);
    nameRow.appendChild(badge);

    const sub = createElement('span', 'profile-sub', `${acc.accountId} · ${acc.accountNumber || ''}`);
    meta.appendChild(nameRow);
    meta.appendChild(sub);
    left.appendChild(avatar);
    left.appendChild(meta);

    const right = createElement('div', 'profile-item-right');
    if (acc.availableBalance !== undefined || acc.totalBalance !== undefined) {
      const bal = createElement('span', 'profile-bal', formatCurrency(acc.availableBalance ?? acc.totalBalance ?? 0));
      right.appendChild(bal);
    }

    const actionBtn = createElement('button', `btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`);
    actionBtn.textContent = isActive ? 'Active Now' : 'Access';
    actionBtn.disabled = isActive;
    actionBtn.addEventListener('click', () => {
      switchAccount(acc.accountId);
    });
    right.appendChild(actionBtn);

    item.appendChild(left);
    item.appendChild(right);
    profList.appendChild(item);
  });
  panelProfiles.appendChild(profList);
  wrapper.appendChild(panelProfiles);

  // ── Panel 2: Login by Account ID ──────────────────────────────────────────
  const panelLogin = createElement('div', `auth-tab-panel ${initialTab === 'login' ? '' : 'hidden'}`);
  panels['login'] = panelLogin;

  const loginForm = createElement('div', 'auth-form-body');

  const idGroup = createElement('div', 'form-group');
  const idLabel = createElement('label', 'form-label', 'Account ID');
  const idInput = createElement('input', 'form-input');
  idInput.placeholder = 'e.g. ACC001, ACC002, ACC003';
  idInput.value = currentAccountId;
  idGroup.appendChild(idLabel);
  idGroup.appendChild(idInput);
  loginForm.appendChild(idGroup);

  const pinGroup = createElement('div', 'form-group');
  const pinLabel = createElement('label', 'form-label', '4-Digit Security PIN');
  const pinInput = createElement('input', 'form-input');
  pinInput.type = 'password';
  pinInput.maxLength = 4;
  pinInput.placeholder = '•••• (Default demo: 1234)';
  pinInput.value = '1234';
  pinGroup.appendChild(pinLabel);
  pinGroup.appendChild(pinInput);
  loginForm.appendChild(pinGroup);

  const loginBtn = createElement('button', 'btn btn-primary btn-block', 'Sign In to Account');
  loginBtn.addEventListener('click', async () => {
    const val = idInput.value.trim().toUpperCase();
    if (!val) {
      showToast('Please enter an Account ID.', 'warning');
      idInput.focus();
      return;
    }

    try {
      setButtonLoading(loginBtn, true, 'Authenticating...');
      // Validate account exists
      const acc = await api.getAccount(val);
      if (!acc || !acc.accountId) {
        showToast(`Account ID ${val} not found on core ledger.`, 'error');
        return;
      }
      await switchAccount(val);
    } catch (err) {
      showToast(`Invalid account: ${val}`, 'error');
    } finally {
      setButtonLoading(loginBtn, false);
    }
  });

  loginForm.appendChild(loginBtn);
  panelLogin.appendChild(loginForm);
  wrapper.appendChild(panelLogin);

  // ── Panel 3: Open New Account (Register Person) ───────────────────────────
  const panelReg = createElement('div', `auth-tab-panel ${initialTab === 'register' ? '' : 'hidden'}`);
  panels['register'] = panelReg;

  const regForm = createElement('div', 'auth-form-body');

  const nameGroup = createElement('div', 'form-group');
  const nameLabel = createElement('label', 'form-label', 'Full Customer / Business Name');
  const nameInput = createElement('input', 'form-input');
  nameInput.placeholder = 'e.g. Aditi Verma or Apex Enterprises';
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  regForm.appendChild(nameGroup);

  const typeGroup = createElement('div', 'form-group');
  const typeLabel = createElement('label', 'form-label', 'Account Scheme');
  const typeSelect = createElement('select', 'form-input');
  const optSav = createElement('option', '', 'Personal Savings Account (Zero Balance)');
  optSav.value = 'SavingsAccount';
  const optCur = createElement('option', '', 'Corporate Current Account (with ₹25k Overdraft Buffer)');
  optCur.value = 'CurrentAccount';
  typeSelect.appendChild(optSav);
  typeSelect.appendChild(optCur);
  typeGroup.appendChild(typeLabel);
  typeGroup.appendChild(typeSelect);
  regForm.appendChild(typeGroup);

  const depGroup = createElement('div', 'form-group');
  const depLabel = createElement('label', 'form-label', 'Initial Opening Deposit (INR)');
  const depInput = createElement('input', 'form-input');
  depInput.type = 'number';
  depInput.placeholder = '10000.00';
  depInput.value = '5000';
  depInput.min = '0';
  depGroup.appendChild(depLabel);
  depGroup.appendChild(depInput);
  regForm.appendChild(depGroup);

  const kycNote = createElement('div', 'modal-confirm-highlight');
  const kycTitle = createElement('div', 'font-semibold mb-1 text-xs', 'Instant Simulated e-KYC Verification');
  kycTitle.style.color = 'var(--color-accent)';
  const kycText = createElement('p', 'text-xs text-muted',
    'A unique Core Banking Account Number will be instantly minted and credited via the ledger simulation.');
  kycNote.appendChild(kycTitle);
  kycNote.appendChild(kycText);
  regForm.appendChild(kycNote);

  const regBtn = createElement('button', 'btn btn-primary btn-block', 'Open Account & Access Instantly');
  regBtn.addEventListener('click', async () => {
    const nameVal = nameInput.value.trim();
    const typeVal = typeSelect.value;
    const depVal = parseFloat(depInput.value) || 0;

    if (!nameVal) {
      showToast('Please enter the account holder name.', 'warning');
      nameInput.focus();
      return;
    }

    try {
      setButtonLoading(regBtn, true, 'Registering & Minting Ledger...');
      const created = await api.createAccount({
        holderName: nameVal,
        accountType: typeVal,
        initialDeposit: depVal,
      });

      showToast(`Account ${created.accountId} successfully opened for ${nameVal}!`, 'success');

      // Refresh accounts cache and switch
      const updatedAccounts = await api.getAccounts();
      setState({ accounts: updatedAccounts });

      await switchAccount(created.accountId);
    } catch (err) {
      showToast(`Account creation failed: ${err.message}`, 'error');
    } finally {
      setButtonLoading(regBtn, false);
    }
  });

  regForm.appendChild(regBtn);
  panelReg.appendChild(regForm);
  wrapper.appendChild(panelReg);

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(wrapper);

  overlay.removeAttribute('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
}
