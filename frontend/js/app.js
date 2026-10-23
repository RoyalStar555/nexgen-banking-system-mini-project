/**
 * app.js — NexGen Banking SPA Entry Point
 *
 * This is the ONLY script imported by public/index.html.
 *
 * Responsibilities:
 *   1. Bootstrap: inject sidebar icons, wire mobile menu, account switcher
 *   2. Register all routes with the Router
 *   3. Pre-fetch accounts list into state
 *   4. Trigger initial navigation based on current URL hash
 *
 * Route Map:
 *   #/dashboard → DashboardView
 *   #/deposit   → DepositView
 *   #/withdraw  → WithdrawView
 *   #/transfer  → TransferView
 *   #/passbook  → PassbookView
 *   #/vaults    → VaultView
 */

import { router }        from './router.js';
import { api }           from './api.js';
import { getState, setState, getCurrentAccount } from './state.js';
import { createElement, createSvgIcon, showToast } from './utils.js';
import { CONFIG }        from './config.js';
import { showAuthModal, switchAccount } from './authModal.js';

// ── View Imports ────────────────────────────────────────────────────────────────
import { dashboardView } from './views/dashboard.js';
import { depositView }   from './views/deposit.js';
import { withdrawView }  from './views/withdraw.js';
import { transferView }  from './views/transfer.js';
import { passbookView }  from './views/passbook.js';
import { vaultView }     from './views/vault.js';

// =========================================================================
// 1. Register Routes
// =========================================================================
router
  .register('#/dashboard', dashboardView)
  .register('#/deposit',   depositView)
  .register('#/withdraw',  withdrawView)
  .register('#/transfer',  transferView)
  .register('#/passbook',  passbookView)
  .register('#/vaults',    vaultView)
  .register('#/login',     {
    mount: () => {
      showAuthModal('profiles');
    },
    unmount: () => {},
  });

// =========================================================================
// 2. Sidebar SVG Icon Injection
//    Uses createSvgIcon (createElementNS) — zero innerHTML
// =========================================================================
function injectSidebarIcons() {
  const iconMap = {
    'icon-dashboard': 'dashboard',
    'icon-deposit':   'deposit',
    'icon-withdraw':  'withdraw',
    'icon-transfer':  'transfer',
    'icon-passbook':  'passbook',
    'icon-vaults':    'vault',
  };

  Object.entries(iconMap).forEach(([elementId, iconName]) => {
    const el = document.getElementById(elementId);
    if (el) {
      while (el.firstChild) el.removeChild(el.firstChild); // Clear
      el.appendChild(createSvgIcon(iconName));
    }
  });
}

// Fix nav link hrefs to use #/ prefix (router expects '#/dashboard' format)
function fixNavHrefs() {
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    const view = link.getAttribute('data-view');
    if (view) {
      link.setAttribute('href', `#/${view}`);
      link.setAttribute('data-route', `#/${view}`);
    }
  });
}

// =========================================================================
// 3. Mobile Sidebar Toggle
// =========================================================================
function initMobileSidebar() {
  const menuToggle    = document.getElementById('menu-toggle');
  const sidebar       = document.getElementById('sidebar');
  const overlay       = document.getElementById('sidebar-overlay');

  const openSidebar  = () => document.body.classList.add('sidebar-open');
  const closeSidebar = () => document.body.classList.remove('sidebar-open');

  menuToggle?.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });

  overlay?.addEventListener('click', closeSidebar);

  // Close sidebar when a nav link is clicked on mobile
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

// =========================================================================
// 4. Dynamic Multi-Account Switcher & Profile Bar
// =========================================================================
function renderAccountSwitcher() {
  const container = document.getElementById('account-switcher');
  if (!container) return;

  const { currentAccountId, accounts } = getState();
  const currentAcc = getCurrentAccount() || (accounts && accounts.find(a => a.accountId === currentAccountId)) || {
    accountId: currentAccountId,
    holderName: 'Rahul Sharma',
    accountType: 'SavingsAccount',
  };

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Header row with "Active Profile" + Switch Link
  const topRow = createElement('div', 'switcher-top-row');
  const label = createElement('div', 'switcher-label', 'Active Profile');
  const manageLink = createElement('button', 'switcher-manage-btn', 'Switch / Login');
  manageLink.setAttribute('type', 'button');
  manageLink.addEventListener('click', () => showAuthModal('profiles'));
  topRow.appendChild(label);
  topRow.appendChild(manageLink);
  container.appendChild(topRow);

  // Active User Spotlight Card
  const profileCard = createElement('div', 'sidebar-profile-card');
  profileCard.setAttribute('title', 'Click to switch or manage user accounts');
  const avatar = createElement('div', 'profile-card-avatar', (currentAcc.holderName || 'NB').substring(0, 2).toUpperCase());
  const meta = createElement('div', 'profile-card-meta');
  const nameEl = createElement('span', 'profile-card-name', currentAcc.holderName);
  const acctEl = createElement('span', 'profile-card-acct',
    `${currentAcc.accountId} · ${currentAcc.accountType === 'CurrentAccount' ? 'Current' : 'Savings'}`);
  meta.appendChild(nameEl);
  meta.appendChild(acctEl);
  profileCard.appendChild(avatar);
  profileCard.appendChild(meta);
  profileCard.addEventListener('click', () => showAuthModal('profiles'));
  container.appendChild(profileCard);

  // Quick Switch List (All accounts)
  if (accounts && accounts.length > 0) {
    const listWrap = createElement('div', 'switcher-btn-list');
    accounts.forEach(acc => {
      const isCur = acc.accountId === currentAccountId;
      const btn = createElement('button', `switcher-btn ${isCur ? 'active' : ''}`);
      btn.dataset.account = acc.accountId;

      const dot = createElement('span', `acc-dot ${acc.accountType === 'CurrentAccount' ? 'current' : 'savings'}`);
      const text = createElement('span', '', `${acc.accountId} · ${acc.holderName.split(' ')[0]}`);
      btn.appendChild(dot);
      btn.appendChild(text);

      btn.addEventListener('click', () => {
        if (!isCur) switchAccount(acc.accountId);
      });
      listWrap.appendChild(btn);
    });
    container.appendChild(listWrap);
  }

  // Open New Account / Register Person button
  const newAccBtn = createElement('button', 'btn-add-account-pill');
  newAccBtn.setAttribute('type', 'button');
  newAccBtn.appendChild(createSvgIcon('plus'));
  newAccBtn.appendChild(createElement('span', '', 'Open New Account'));
  newAccBtn.addEventListener('click', () => showAuthModal('register'));
  container.appendChild(newAccBtn);

  // Also update Mobile Header user pill
  updateMobileHeaderUser(currentAcc);
}

function updateMobileHeaderUser(currentAcc) {
  const mobileHeader = document.getElementById('mobile-header');
  if (!mobileHeader) return;

  let pill = document.getElementById('mobile-user-pill');
  if (!pill) {
    pill = createElement('div', 'mobile-user-pill');
    pill.id = 'mobile-user-pill';
    mobileHeader.appendChild(pill);
  }

  while (pill.firstChild) pill.removeChild(pill.firstChild);

  const avatar = createElement('span', 'mobile-user-avatar', (currentAcc.holderName || 'NB').substring(0, 2).toUpperCase());
  const name = createElement('span', 'mobile-user-name', currentAcc.accountId);
  const switchBtn = createElement('button', 'btn btn-xs btn-secondary', 'Switch');
  switchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showAuthModal('profiles');
  });

  pill.appendChild(avatar);
  pill.appendChild(name);
  pill.appendChild(switchBtn);
}

window.refreshAppHeaderAndSidebar = renderAccountSwitcher;

// =========================================================================
// 5. Pre-fetch Accounts List
// =========================================================================
async function prefetchAccounts() {
  try {
    const accounts = await api.getAccounts();
    if (Array.isArray(accounts)) {
      setState({ accounts });
      renderAccountSwitcher();

      // Pre-fetch active account details
      const { currentAccountId } = getState();
      const currentAccount = await api.getAccount(currentAccountId);
      if (currentAccount) {
        setState({ currentAccount });
        renderAccountSwitcher();
      }
    }
  } catch (err) {
    console.warn('Could not pre-fetch accounts list:', err.message);
  }
}

// =========================================================================
// 6. Bootstrap — App Initialization
// =========================================================================
async function init() {
  // Read saved session from localStorage
  const savedAcc = localStorage.getItem('nexgen_active_account');
  if (savedAcc) {
    setState({ currentAccountId: savedAcc });
  }

  // Patch nav hrefs to match router hash format
  fixNavHrefs();

  // Inject SVG icons into sidebar
  injectSidebarIcons();

  // Wire up mobile sidebar
  initMobileSidebar();

  // Initial account switcher render
  renderAccountSwitcher();

  // Pre-fetch accounts (populates dynamic list & active account)
  await prefetchAccounts();

  // Start router — navigate to initial hash or default dashboard
  router.init();

  console.log(
    `%c NexGen Banking `,
    'background:#4f46e5;color:#fff;font-weight:700;padding:4px 8px;border-radius:4px;',
    `| ENV: ${CONFIG.API_BASE_URL}`
  );
}

// ── Entry Point: DOMContentLoaded ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
