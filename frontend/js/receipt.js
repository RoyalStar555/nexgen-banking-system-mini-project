import {
  createElement,
  createSvgIcon,
  formatCurrency,
  formatDate,
  formatDateOnly,
  showToast,
} from './utils.js';

/**
 * Extracts structured counterparty and reference details from a transaction.
 */
export function parseTxDetails(tx) {
  const isCredit = ['DEPOSIT', 'TRANSFER_IN', 'VAULT_UNLOCK', 'CREDIT'].includes(tx.type);
  const desc = tx.description || '';
  
  let party = '—';
  let refId = tx.referenceId || '';
  let remark = tx.remark || '';

  // Extract reference ID from description if present
  if (!refId && desc.includes('Ref:')) {
    const parts = desc.split('Ref:');
    if (parts.length > 1) {
      refId = parts[1].trim();
    }
  }

  // Extract Party / Counterparty and Remark
  if (desc.startsWith('Transfer to ')) {
    const rawTarget = desc.replace('Transfer to ', '').split('|')[0].trim();
    if (rawTarget.includes(' - ')) {
      const parts = rawTarget.split(' - ');
      party = parts[0].trim();
      if (!remark) remark = parts.slice(1).join(' - ').trim();
    } else {
      party = rawTarget;
    }
  } else if (desc.startsWith('Transfer from ')) {
    const rawSource = desc.replace('Transfer from ', '').split('|')[0].trim();
    if (rawSource.includes(' - ')) {
      const parts = rawSource.split(' - ');
      party = parts[0].trim();
      if (!remark) remark = parts.slice(1).join(' - ').trim();
    } else {
      party = rawSource;
    }
  } else if (desc.includes('vault:')) {
    party = desc.split('vault:')[1].trim();
    if (!remark) remark = 'Goal Vault Savings';
  } else if (tx.type === 'DEPOSIT') {
    party = 'Self / Direct Credit';
    if (!remark && desc && !desc.toLowerCase().startsWith('deposit of')) {
      remark = desc.split('|')[0].trim();
    }
  } else if (tx.type === 'WITHDRAWAL') {
    party = 'Self / Cash Disbursement';
    if (!remark && desc && !desc.toLowerCase().startsWith('withdrawal of')) {
      remark = desc.split('|')[0].trim();
    }
  } else if (tx.type === 'OVERDRAFT_FEE') {
    party = 'NexGen Core Banking System';
    if (!remark) remark = 'Overdraft Protection Charge';
  } else if (desc) {
    party = desc.split('|')[0].trim();
  }

  // Final trim of party if residual '-' exists
  if (party && party.includes(' - ')) {
    party = party.split(' - ')[0].trim();
  }

  // Human friendly type name
  const typeMap = {
    TRANSFER_IN: 'Transfer Received',
    TRANSFER_OUT: 'Transfer Sent',
    DEPOSIT: 'Direct Deposit',
    WITHDRAWAL: 'Disbursement / ATM',
    VAULT_LOCK: 'Vault Allocation',
    VAULT_UNLOCK: 'Vault Release',
    OVERDRAFT_FEE: 'Overdraft Penalty Fee',
  };
  const typeName = typeMap[tx.type] || tx.type || 'Transaction';

  // Format date and time
  let dateFormatted = '—';
  let timeFormatted = '—';
  if (tx.timestamp) {
    try {
      const d = new Date(tx.timestamp);
      if (!isNaN(d.getTime())) {
        dateFormatted = new Intl.DateTimeFormat('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(d);
        timeFormatted = new Intl.DateTimeFormat('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(d);
      }
    } catch {
      dateFormatted = String(tx.timestamp);
    }
  }

  return {
    isCredit,
    party,
    refId,
    remark,
    typeName,
    dateFormatted,
    timeFormatted,
  };
}

/**
 * Creates a rich UPI-style payment receipt element.
 */
export function createUpiReceiptElement(data, onDone = null) {
  const isCredit = data.isCredit !== undefined ? data.isCredit : true;
  const statusColor = isCredit ? 'var(--color-accent)' : 'var(--color-danger)';
  const badgeText = data.badgeText || (isCredit ? 'Payment Settled' : 'Payment Debited');

  const wrapper = createElement('div', 'upi-receipt-card animate-fade-in');

  // 1. Top Decorative Brand Bar
  const brandBar = createElement('div', 'upi-receipt-brand');
  const brandLogo = createElement('div', 'upi-brand-pill');
  const brandIcon = createSvgIcon('shield', 'upi-brand-icon');
  const brandName = createElement('span', 'upi-brand-name', 'NexGen Core UPI Rails');
  brandLogo.appendChild(brandIcon);
  brandLogo.appendChild(brandName);

  const securityPill = createElement('div', 'upi-security-pill');
  securityPill.appendChild(createSvgIcon('check'));
  securityPill.appendChild(document.createTextNode(' Instant Settlement Verified'));

  brandBar.appendChild(brandLogo);
  brandBar.appendChild(securityPill);
  wrapper.appendChild(brandBar);

  // 2. Big Animated Status Icon
  const statusCircle = createElement('div', `upi-status-circle ${isCredit ? 'credit' : 'debit'}`);
  const checkIcon = createSvgIcon('check', 'upi-check-icon');
  statusCircle.appendChild(checkIcon);
  wrapper.appendChild(statusCircle);

  // 3. Status Title & Subtitle
  const statusTitle = createElement('h2', 'upi-status-title', badgeText);
  const statusSub = createElement('p', 'upi-status-time',
    `${data.dateFormatted || formatDate(data.timestamp)}`);
  wrapper.appendChild(statusTitle);
  wrapper.appendChild(statusSub);

  // 4. Hero Amount
  const amountWrap = createElement('div', 'upi-amount-wrap');
  const amountPrefix = createElement('span', 'upi-amount-prefix', isCredit ? '+' : '−');
  const amountVal = createElement('span', 'upi-amount-val', formatCurrency(data.amount));
  amountWrap.appendChild(amountPrefix);
  amountWrap.appendChild(amountVal);
  wrapper.appendChild(amountWrap);

  // 4b. Remark Note Bubble (Prominent PhonePe / GPay style)
  if (data.remark && String(data.remark).trim()) {
    const remarkBubble = createElement('div', 'upi-remark-bubble');
    const quoteL = createElement('span', 'upi-remark-quote', '“');
    const textEl = createElement('span', 'upi-remark-text', String(data.remark).trim());
    const quoteR = createElement('span', 'upi-remark-quote', '”');
    remarkBubble.appendChild(quoteL);
    remarkBubble.appendChild(textEl);
    remarkBubble.appendChild(quoteR);
    wrapper.appendChild(remarkBubble);
  }

  // 5. Counterparty Spotlight
  const partyBox = createElement('div', 'upi-party-spotlight');
  const avatar = createElement('div', 'upi-party-avatar', (data.party || 'NB').substring(0, 2).toUpperCase());
  const partyMeta = createElement('div', 'upi-party-meta');
  const partyLabel = createElement('span', 'upi-party-label', isCredit ? 'Received From' : 'Transferred To');
  const partyName = createElement('span', 'upi-party-name', data.party || 'Account Holder');
  partyMeta.appendChild(partyLabel);
  partyMeta.appendChild(partyName);
  partyBox.appendChild(avatar);
  partyBox.appendChild(partyMeta);
  wrapper.appendChild(partyBox);

  // 6. Notch Divider (Classic Ticket / Receipt style)
  const notchDivider = createElement('div', 'upi-notch-divider');
  const leftNotch = createElement('div', 'upi-notch-cutout left');
  const dashedLine = createElement('div', 'upi-notch-line');
  const rightNotch = createElement('div', 'upi-notch-cutout right');
  notchDivider.appendChild(leftNotch);
  notchDivider.appendChild(dashedLine);
  notchDivider.appendChild(rightNotch);
  wrapper.appendChild(notchDivider);

  // 7. Transaction Breakdown Table
  const detailsTable = createElement('div', 'upi-details-grid');

  const rows = [
    {
      label: 'Transaction Reference ID',
      val: data.transactionId || data.refId || 'TXN-998124',
      copyable: true,
    },
    {
      label: 'Source Account',
      val: data.fromAccount || data.accountNumber || 'ACC001 · Savings',
    },
    {
      label: 'Destination / Beneficiary',
      val: data.toAccount || data.party || 'NexGen Core Ledger',
    },
    {
      label: 'Payment Method',
      val: 'IMPS · 24x7 Core Ledger Rail',
    },
    {
      label: 'Ledger Balance After',
      val: formatCurrency(data.newBalance || data.balanceAfter || 0),
      highlight: true,
    },
  ];

  if (data.remark && String(data.remark).trim()) {
    rows.splice(3, 0, { label: 'Remark / Purpose', val: String(data.remark).trim() });
  }

  for (const r of rows) {
    const rowEl = createElement('div', 'upi-detail-row');
    const labelEl = createElement('span', 'upi-detail-label', r.label);
    const valWrapper = createElement('span', `upi-detail-val ${r.highlight ? 'highlight' : ''}`);

    const textSpan = createElement('span', '', r.val);
    valWrapper.appendChild(textSpan);

    if (r.copyable) {
      const copyBtn = createElement('button', 'upi-copy-btn');
      copyBtn.setAttribute('title', 'Copy ID');
      copyBtn.appendChild(createSvgIcon('passbook'));
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(r.val);
        showToast(`Copied reference ID: ${r.val}`, 'info');
      });
      valWrapper.appendChild(copyBtn);
    }

    rowEl.appendChild(labelEl);
    rowEl.appendChild(valWrapper);
    detailsTable.appendChild(rowEl);
  }
  wrapper.appendChild(detailsTable);

  // 8. Security Footer Seal
  const securitySeal = createElement('div', 'upi-security-seal');
  securitySeal.appendChild(createSvgIcon('shield'));
  securitySeal.appendChild(createElement('span', '', 'Anti-Gravity Framework · Cryptographically Signed & Immutable'));
  wrapper.appendChild(securitySeal);

  // 9. Actions Bar (Share / Print / Done)
  const actionsBar = createElement('div', 'upi-actions-bar');

  const shareBtn = createElement('button', 'btn btn-secondary upi-action-btn');
  shareBtn.appendChild(createSvgIcon('arrowRight'));
  shareBtn.appendChild(createElement('span', '', 'Share Receipt'));
  shareBtn.addEventListener('click', async () => {
    const summaryText = `NexGen Banking Payment Receipt:\nAmount: ${formatCurrency(data.amount)}\nTo/From: ${data.party}\nRef ID: ${data.transactionId || data.refId}\nStatus: Settled (Success)\nDate: ${data.dateFormatted || formatDate(data.timestamp)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: summaryText,
        });
        showToast('Receipt shared!', 'success');
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText(summaryText);
      showToast('Receipt summary copied to clipboard for sharing!', 'success');
    }
  });

  const printBtn = createElement('button', 'btn btn-secondary upi-action-btn');
  printBtn.appendChild(createSvgIcon('download'));
  printBtn.appendChild(createElement('span', '', 'Print'));
  printBtn.addEventListener('click', () => {
    window.print();
  });

  const doneBtn = createElement('button', 'btn btn-primary upi-action-btn');
  doneBtn.textContent = 'Done';
  doneBtn.addEventListener('click', () => {
    if (typeof onDone === 'function') onDone();
  });

  actionsBar.appendChild(shareBtn);
  actionsBar.appendChild(printBtn);
  actionsBar.appendChild(doneBtn);
  wrapper.appendChild(actionsBar);

  return wrapper;
}

/**
 * Displays the UPI receipt in the application modal dialog.
 */
export function showUpiReceiptModal(data) {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (!overlay || !modalContent) return;

  while (modalContent.firstChild) {
    modalContent.removeChild(modalContent.firstChild);
  }

  const closeModal = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  };

  // Close button in top-right of modal
  const closeBtn = createElement('button', 'upi-modal-close');
  closeBtn.appendChild(createSvgIcon('x'));
  closeBtn.addEventListener('click', closeModal);

  // Close on clicking backdrop
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  const receiptEl = createUpiReceiptElement(data, closeModal);

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(receiptEl);

  overlay.removeAttribute('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
}

/**
 * Creates a dedicated Recent Transactions section component.
 */
export function createRecentTransactionsSection({
  title,
  badgeText = 'Recent',
  transactions = [],
  currentAccount = null,
  onViewReceipt = null,
  emptyMessage = 'No recent transactions found.',
}) {
  const section = createElement('div', 'recent-tx-section animate-fade-in');
  const card = createElement('div', 'recent-tx-card');

  // Header
  const header = createElement('div', 'recent-tx-header');
  const titleWrap = createElement('div', 'recent-tx-title-wrap');
  const titleEl = createElement('h3', 'recent-tx-title', title);
  const badge = createElement('span', 'recent-tx-badge', badgeText);
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(badge);

  const passbookLink = createElement('a', 'recent-tx-link', 'View all in Passbook →');
  passbookLink.setAttribute('href', '#passbook');

  header.appendChild(titleWrap);
  header.appendChild(passbookLink);
  card.appendChild(header);

  if (!transactions || transactions.length === 0) {
    const empty = createElement('div', 'empty-state');
    empty.style.padding = 'var(--space-6)';
    const emptyIcon = createElement('div', 'empty-state-icon');
    emptyIcon.appendChild(createSvgIcon('passbook'));
    const msg = createElement('p', 'empty-state-text', emptyMessage);
    empty.appendChild(emptyIcon);
    empty.appendChild(msg);
    card.appendChild(empty);
  } else {
    const list = createElement('div', 'recent-tx-list');
    transactions.slice(0, 5).forEach(tx => {
      const parsed = parseTxDetails(tx);
      const isCredit = parsed.isCredit;

      const item = createElement('div', 'recent-tx-item');

      // Left column
      const left = createElement('div', 'recent-tx-left');
      const icon = createElement('div', `recent-tx-icon ${isCredit ? 'credit' : 'debit'}`);
      icon.appendChild(createSvgIcon(isCredit ? 'credit' : 'debit'));

      const info = createElement('div', 'recent-tx-info');
      const primary = createElement('div', 'recent-tx-primary');

      // Name / Title
      let mainTitle = parsed.party;
      if (tx.type === 'TRANSFER_OUT') {
        mainTitle = `To: ${parsed.party}`;
      } else if (tx.type === 'TRANSFER_IN') {
        mainTitle = `From: ${parsed.party}`;
      } else if (tx.type === 'DEPOSIT') {
        mainTitle = 'Self Deposit';
      } else if (tx.type === 'WITHDRAWAL') {
        mainTitle = 'Disbursement / Cash Withdrawal';
      }
      const titleSpan = createElement('span', '', mainTitle);
      primary.appendChild(titleSpan);

      // Remark badge if present
      const txRemark = parsed.remark || tx.remark;
      if (txRemark && String(txRemark).trim()) {
        const remarkSpan = createElement('span', 'recent-tx-remark', `“${String(txRemark).trim()}”`);
        primary.appendChild(remarkSpan);
      }

      const meta = createElement('div', 'recent-tx-meta');
      const timeSpan = createElement('span', '', `${parsed.dateFormatted}, ${parsed.timeFormatted}`);
      meta.appendChild(timeSpan);
      if (parsed.refId) {
        const refSpan = createElement('span', 'tx-party-ref', `Ref: ${parsed.refId}`);
        meta.appendChild(refSpan);
      }

      info.appendChild(primary);
      info.appendChild(meta);
      left.appendChild(icon);
      left.appendChild(info);

      // Right column
      const right = createElement('div', 'recent-tx-right');
      const amtCol = createElement('div', 'recent-tx-amount-col');
      const amtEl = createElement(
        'span',
        `recent-tx-amount ${isCredit ? 'credit' : 'debit'}`,
        `${isCredit ? '+' : '−'}${formatCurrency(tx.amount)}`
      );
      const balEl = createElement('span', 'recent-tx-balance', `Bal: ${formatCurrency(tx.balanceAfter)}`);
      amtCol.appendChild(amtEl);
      amtCol.appendChild(balEl);

      const receiptBtn = createElement('button', 'btn-receipt-pill');
      receiptBtn.setAttribute('type', 'button');
      receiptBtn.appendChild(createSvgIcon('passbook'));
      receiptBtn.appendChild(createElement('span', '', 'Receipt'));
      receiptBtn.addEventListener('click', () => {
        if (typeof onViewReceipt === 'function') {
          onViewReceipt(tx, parsed);
        } else {
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
            remark: txRemark || '',
            timestamp: tx.timestamp,
            dateFormatted: `${parsed.dateFormatted} at ${parsed.timeFormatted}`,
          });
        }
      });

      right.appendChild(amtCol);
      right.appendChild(receiptBtn);

      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  section.appendChild(card);
  return section;
}
