import { CONFIG } from './config.js';

/**
 * Currency Formatter (INR / Indian Rupee)
 * Zero-state principle: formatting is display-only
 */
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return inrFormatter.format(numericAmount);
}

/**
 * Date and Time Formatter (Indian Standard Format)
 */
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateOnlyFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
});

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return dateTimeFormatter.format(d);
  } catch {
    return String(isoString);
  }
}

export function formatDateOnly(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return dateOnlyFormatter.format(d);
  } catch {
    return String(isoString);
  }
}

/**
 * Safe DOM Element Creator (Strictly textContent / setAttribute, ZERO innerHTML)
 */
export function createElement(tag, className = '', textContent = '') {
  const element = document.createElement(tag);
  if (className) {
    element.setAttribute('class', className);
  }
  if (textContent !== undefined && textContent !== null && textContent !== '') {
    element.textContent = String(textContent);
  }
  return element;
}

/**
 * SVG Icon Creator (Namespaced DOM elements, ZERO innerHTML)
 */
const SVG_PATHS = {
  dashboard: [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '7', height: '9', rx: '1' } },
    { tag: 'rect', attrs: { x: '14', y: '3', width: '7', height: '5', rx: '1' } },
    { tag: 'rect', attrs: { x: '14', y: '12', width: '7', height: '9', rx: '1' } },
    { tag: 'rect', attrs: { x: '3', y: '16', width: '7', height: '5', rx: '1' } },
  ],
  deposit: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'polyline', attrs: { points: '8 12 12 16 16 12' } },
    { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '16' } },
  ],
  withdraw: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'polyline', attrs: { points: '16 12 12 8 8 12' } },
    { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12', y2: '8' } },
  ],
  transfer: [
    { tag: 'path', attrs: { d: 'M17 1l4 4-4 4' } },
    { tag: 'path', attrs: { d: 'M3 11V9a4 4 0 0 1 4-4h14' } },
    { tag: 'path', attrs: { d: 'M7 23l-4-4 4-4' } },
    { tag: 'path', attrs: { d: 'M21 13v2a4 4 0 0 1-4 4H3' } },
  ],
  passbook: [
    { tag: 'path', attrs: { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' } },
    { tag: 'path', attrs: { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' } },
    { tag: 'line', attrs: { x1: '8', y1: '6', x2: '16', y2: '6' } },
    { tag: 'line', attrs: { x1: '8', y1: '10', x2: '14', y2: '10' } },
  ],
  vault: [
    { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } },
    { tag: 'circle', attrs: { cx: '12', cy: '16', r: '1' } },
  ],
  vaults: [
    { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } },
    { tag: 'circle', attrs: { cx: '12', cy: '16', r: '1' } },
  ],
  credit: [
    { tag: 'line', attrs: { x1: '17', y1: '7', x2: '7', y2: '17' } },
    { tag: 'polyline', attrs: { points: '17 17 7 17 7 7' } },
  ],
  debit: [
    { tag: 'line', attrs: { x1: '7', y1: '17', x2: '17', y2: '7' } },
    { tag: 'polyline', attrs: { points: '7 7 17 7 17 17' } },
  ],
  wallet: [
    { tag: 'path', attrs: { d: 'M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4' } },
    { tag: 'path', attrs: { d: 'M4 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2' } },
    { tag: 'circle', attrs: { cx: '18', cy: '14', r: '1' } },
  ],
  shield: [
    { tag: 'path', attrs: { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' } },
  ],
  user: [
    { tag: 'path', attrs: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', attrs: { cx: '12', cy: '7', r: '4' } },
  ],
  check: [
    { tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } },
  ],
  alert: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '12' } },
    { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12.01', y2: '16' } },
  ],
  info: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12', y2: '12' } },
    { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12.01', y2: '8' } },
  ],
  x: [
    { tag: 'line', attrs: { x1: '18', y1: '6', x2: '6', y2: '18' } },
    { tag: 'line', attrs: { x1: '6', y1: '6', x2: '18', y2: '18' } },
  ],
  spinner: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10', 'stroke-opacity': '0.25' } },
    { tag: 'path', attrs: { d: 'M12 2a10 10 0 0 1 10 10', 'stroke-linecap': 'round' } },
  ],
  download: [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
    { tag: 'polyline', attrs: { points: '7 10 12 15 17 10' } },
    { tag: 'line', attrs: { x1: '12', y1: '15', x2: '12', y2: '3' } },
  ],
  calendar: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' } },
    { tag: 'line', attrs: { x1: '16', y1: '2', x2: '16', y2: '6' } },
    { tag: 'line', attrs: { x1: '8', y1: '2', x2: '8', y2: '6' } },
    { tag: 'line', attrs: { x1: '3', y1: '10', x2: '21', y2: '10' } },
  ],
  plus: [
    { tag: 'line', attrs: { x1: '12', y1: '5', x2: '12', y2: '19' } },
    { tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } },
  ],
  arrowRight: [
    { tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } },
    { tag: 'polyline', attrs: { points: '12 5 19 12 12 19' } },
  ],
  lock: [
    { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } },
  ],
  unlock: [
    { tag: 'rect', attrs: { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 9.9-1' } },
  ],
};

export function createSvgIcon(name, customClass = '') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  const cls = customClass ? `icon ${customClass}`.trim() : 'icon';
  svg.setAttribute('class', cls);

  const shapes = SVG_PATHS[name] || SVG_PATHS.info;
  for (const s of shapes) {
    const el = document.createElementNS(ns, s.tag);
    for (const [k, v] of Object.entries(s.attrs)) {
      el.setAttribute(k, v);
    }
    svg.appendChild(el);
  }
  return svg;
}

/**
 * Toast Notification System (DOM TextContent Only)
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = createElement('div', `toast toast-${type}`);

  // Icon based on type
  let iconName = 'info';
  if (type === 'success') iconName = 'check';
  if (type === 'error') iconName = 'alert';
  if (type === 'warning') iconName = 'alert';

  const iconEl = createSvgIcon(iconName, 'toast-icon');
  toast.appendChild(iconEl);

  const msgEl = createElement('span', 'toast-message', message);
  toast.appendChild(msgEl);

  const closeBtn = createElement('button', 'toast-close');
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', 'Close toast');
  const xIcon = createSvgIcon('x');
  closeBtn.appendChild(xIcon);

  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 200);
  });

  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode === container) {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 200);
    }
  }, CONFIG.TOAST_DURATION);
}

/**
 * Skeleton Loader Element Generator
 */
export function createSkeleton(lines = 3, type = 'text') {
  const wrapper = createElement('div', 'skeleton-wrapper');
  for (let i = 0; i < lines; i++) {
    let cls = 'skeleton skeleton-text';
    if (type === 'circle') cls = 'skeleton skeleton-circle';
    else if (type === 'card') cls = 'skeleton skeleton-card';
    else if (type === 'row') cls = 'skeleton skeleton-row';
    else {
      if (i === lines - 1) cls += ' short';
      else if (i % 2 === 1) cls += ' medium';
    }
    const skel = createElement('div', cls);
    wrapper.appendChild(skel);
  }
  return wrapper;
}

/**
 * Number Counter Animation (requestAnimationFrame)
 */
export function animateNumber(element, start, end, duration = 1000) {
  if (!element) return;
  const startTime = performance.now();
  const startNum = typeof start === 'number' ? start : 0;
  const endNum = typeof end === 'number' ? end : 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentVal = startNum + (endNum - startNum) * easeOut;

    element.textContent = formatCurrency(currentVal);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatCurrency(endNum);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Debounce Function
 */
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Button Loading State Controller (Stores original text, adds spinner)
 */
export function setButtonLoading(button, isLoading, loadingText = 'Processing...') {
  if (!button) return;

  if (isLoading) {
    button.setAttribute('disabled', 'true');
    button.setAttribute('data-original-text', button.textContent || '');
    
    // Clear children cleanly
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }

    button.classList.add('btn-loading');

    const spinner = createSvgIcon('spinner', 'btn-spinner animate-spin');
    button.appendChild(spinner);

    const textSpan = createElement('span', 'btn-text', loadingText);
    button.appendChild(textSpan);
  } else {
    button.removeAttribute('disabled');
    button.classList.remove('btn-loading');

    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }

    const originalText = button.getAttribute('data-original-text') || 'Submit';
    button.textContent = originalText;
  }
}

/**
 * Global Modal Dialog System (Strict DOM, no innerHTML)
 */
export function showModal({
  title = 'Confirmation',
  message = '',
  details = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClass = 'btn-primary',
  onConfirm = null,
  onCancel = null,
}) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const closeBtn = document.getElementById('modal-close-btn');

  if (!overlay || !bodyEl) return;

  if (titleEl) titleEl.textContent = title;

  // Clean body
  while (bodyEl.firstChild) {
    bodyEl.removeChild(bodyEl.firstChild);
  }

  if (message) {
    const msgP = createElement('p', 'modal-text', message);
    bodyEl.appendChild(msgP);
  }

  if (details) {
    const detailBox = createElement('div', 'modal-confirm-highlight', details);
    bodyEl.appendChild(detailBox);
  }

  // Configure Confirm Button
  if (confirmBtn) {
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${confirmClass}`;
    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }

  // Configure Cancel Button
  const handleCancel = () => {
    closeModal();
    if (typeof onCancel === 'function') onCancel();
  };

  if (cancelBtn) {
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = handleCancel;
  }

  if (closeBtn) {
    closeBtn.onclick = handleCancel;
  }

  // Show
  overlay.removeAttribute('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.setAttribute('hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

/**
 * CSV Exporter (Using Web Blob API, safe file download)
 */
export function exportToCsv(filename, headers, rows) {
  const escapeCsv = (str) => {
    const val = str === null || str === undefined ? '' : String(str);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [];
  lines.push(headers.map(escapeCsv).join(','));

  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
