// =====================================================================
// Expense & Budget Visualizer — app.js
// =====================================================================

// ── Storage keys ──────────────────────────────────────────────────────
const STORAGE_KEY_TRANSACTIONS = 'ebv_transactions';
const STORAGE_KEY_THEME        = 'ebv_theme';
const STORAGE_KEY_LIMIT        = 'ebv_spending_limit';

// ── In-memory state ───────────────────────────────────────────────────
let transactions  = [];   // [{ id, name, amount, category, date }]
let spendingLimit = null; // number | null

// ── DOM references ────────────────────────────────────────────────────
const balanceDisplay   = document.getElementById('balance-display');
const balanceLimitNote = document.getElementById('balance-limit-note');
const transactionList  = document.getElementById('transaction-list');
const transactionForm  = document.getElementById('transaction-form');
const itemNameInput    = document.getElementById('item-name');
const amountInput      = document.getElementById('amount');
const categoryInput    = document.getElementById('category');
const chartCanvas      = document.getElementById('spending-chart');
const chartEmptyMsg    = document.getElementById('chart-empty-msg');
const themeToggleBtn   = document.getElementById('theme-toggle');
const themeLabel       = document.getElementById('theme-label');
const themeIcon        = document.getElementById('theme-icon');
const limitInput       = document.getElementById('limit-input');
const btnSetLimit      = document.getElementById('btn-set-limit');
const btnRemoveLimit   = document.getElementById('btn-remove-limit');
const limitCurrent     = document.getElementById('limit-current');

// ── Utilities ─────────────────────────────────────────────────────────

/** Format a number as IDR, e.g. 50000 → "Rp 50.000" */
function formatIDR(amount) {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/** Generate a simple unique ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── LocalStorage helpers ──────────────────────────────────────────────

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.warn('Could not save transactions to localStorage:', e);
  }
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Could not load transactions from localStorage:', e);
    return [];
  }
}

function saveLimit(value) {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY_LIMIT);
    } else {
      localStorage.setItem(STORAGE_KEY_LIMIT, String(value));
    }
  } catch (e) {
    console.warn('Could not save limit to localStorage:', e);
  }
}

function loadLimit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMIT);
    if (raw === null) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (e) {
    return null;
  }
}

// ── Render: Balance ───────────────────────────────────────────────────

function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  balanceDisplay.textContent = formatIDR(total);

  // Colour logic
  if (spendingLimit !== null && total > spendingLimit) {
    balanceDisplay.className = 'balance-amount balance--over';
    balanceLimitNote.textContent = `⚠️ Over limit of ${formatIDR(spendingLimit)}`;
  } else {
    balanceDisplay.className = 'balance-amount balance--ok';
    balanceLimitNote.textContent = spendingLimit !== null
      ? `Limit: ${formatIDR(spendingLimit)}`
      : '';
  }
}

// ── Render: Transaction list ──────────────────────────────────────────

const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚌', Fun: '🎉' };

function renderTransactionList() {
  // Clear existing items (keep nothing — rebuild from state)
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'transaction-empty';
    empty.textContent = 'No transactions yet';
    transactionList.appendChild(empty);
    return;
  }

  // Render newest first
  [...transactions].reverse().forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    // Highlight if this single transaction exceeds the limit
    if (spendingLimit !== null && t.amount > spendingLimit) {
      li.classList.add('transaction-item--over');
    }

    li.dataset.id = t.id;

    const emoji = CATEGORY_EMOJI[t.category] || '💸';

    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHtml(t.name)}</span>
        <span class="transaction-category">${emoji} ${escapeHtml(t.category)}</span>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount">${formatIDR(t.amount)}</span>
        <button class="btn-delete" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
      </div>
    `;

    // Delete handler
    li.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTransaction(t.id);
    });

    transactionList.appendChild(li);
  });
}

/** Minimal HTML escape to prevent XSS from user input */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render: Chart ─────────────────────────────────────────────────────

let spendingChart = null;

const CATEGORY_COLORS = {
  Food:      '#6366f1',
  Transport: '#f59e0b',
  Fun:       '#10b981',
};

function initChart() {
  chartCanvas.style.display = 'none';
  chartEmptyMsg.style.display = 'block';

  spendingChart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
            padding: 16,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${formatIDR(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderChart() {
  if (!spendingChart) return;

  const totals = {};
  transactions.forEach(({ category, amount }) => {
    totals[category] = (totals[category] || 0) + amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#a78bfa');

  if (labels.length === 0) {
    chartCanvas.style.display = 'none';
    chartEmptyMsg.style.display = 'block';
  } else {
    chartCanvas.style.display = 'block';
    chartEmptyMsg.style.display = 'none';
  }

  spendingChart.data.labels                      = labels;
  spendingChart.data.datasets[0].data            = data;
  spendingChart.data.datasets[0].backgroundColor = colors;
  spendingChart.update();
}

function updateChartTheme(theme) {
  if (!spendingChart) return;
  spendingChart.options.plugins.legend.labels.color =
    theme === 'dark' ? '#cbd5e1' : '#374151';
  spendingChart.data.datasets[0].borderColor =
    theme === 'dark' ? '#1e293b' : '#ffffff';
  spendingChart.update();
}

// ── Master render ─────────────────────────────────────────────────────

/** Call after any state change to keep all UI in sync */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

// ── Data operations ───────────────────────────────────────────────────

function addTransaction(name, amount, category) {
  const t = {
    id:       generateId(),
    name:     name.trim(),
    amount:   Math.round(amount),
    category,
    date:     new Date().toISOString(),
  };
  transactions.push(t);
  saveTransactions();
  renderAll();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderAll();
}

// ── Form validation & submission ──────────────────────────────────────

function setError(fieldId, message) {
  document.getElementById('error-' + fieldId).textContent = message;
}

function clearErrors() {
  ['item-name', 'amount', 'category'].forEach(id => setError(id, ''));
}

transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearErrors();

  const name     = itemNameInput.value;
  const amountRaw = amountInput.value;
  const category = categoryInput.value;
  let valid = true;

  if (!name.trim()) {
    setError('item-name', 'Item name is required.');
    valid = false;
  } else if (name.trim().length > 100) {
    setError('item-name', 'Maximum 100 characters.');
    valid = false;
  }

  const amountNum = parseInt(amountRaw, 10);
  if (!amountRaw.trim() || isNaN(amountNum)) {
    setError('amount', 'Please enter a valid amount.');
    valid = false;
  } else if (amountNum < 1) {
    setError('amount', 'Amount must be at least Rp 1.');
    valid = false;
  }

  if (!category) {
    setError('category', 'Please select a category.');
    valid = false;
  }

  if (!valid) return;

  addTransaction(name, amountNum, category);

  // Reset form
  transactionForm.reset();
  itemNameInput.focus();
});

// ── Theme ─────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);

  themeLabel.textContent = theme === 'dark' ? 'Dark Mode'  : 'Light Mode';
  themeIcon.textContent  = theme === 'dark' ? '🌙'         : '☀️';

  updateChartTheme(theme);
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Spending limit ────────────────────────────────────────────────────

function applyLimit(value) {
  spendingLimit = value;
  saveLimit(value);
  updateLimitUI();
  renderAll();   // re-colour balance + re-highlight list items
}

function updateLimitUI() {
  if (spendingLimit !== null) {
    limitInput.value = spendingLimit;
    limitCurrent.textContent = `Active: ${formatIDR(spendingLimit)}`;
    btnRemoveLimit.style.display = 'inline-flex';
  } else {
    limitInput.value = '';
    limitCurrent.textContent = 'No limit set';
    btnRemoveLimit.style.display = 'none';
  }
}

btnSetLimit.addEventListener('click', () => {
  const raw = parseInt(limitInput.value, 10);
  if (isNaN(raw) || raw < 1) {
    limitInput.focus();
    limitInput.style.outline = '2px solid #ef4444';
    setTimeout(() => { limitInput.style.outline = ''; }, 1200);
    return;
  }
  applyLimit(raw);
});

// Allow pressing Enter in the limit input to set the limit
limitInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSetLimit.click();
});

btnRemoveLimit.addEventListener('click', () => {
  applyLimit(null);
});

// ── Initialisation ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme (before render to avoid flash)
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  applyTheme(savedTheme);

  // 2. Load persisted data
  transactions  = loadTransactions();
  spendingLimit = loadLimit();

  // 3. Chart (must exist before renderAll)
  initChart();

  // 4. Limit UI
  updateLimitUI();

  // 5. Render everything
  renderAll();
});
