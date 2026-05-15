// =====================================================================
// Expense & Budget Visualizer — app.js
// =====================================================================

// ── Storage keys ──────────────────────────────────────────────────────
const STORAGE_KEY_TRANSACTIONS    = 'ebv_transactions';
const STORAGE_KEY_THEME           = 'ebv_theme';
const STORAGE_KEY_LIMIT           = 'ebv_spending_limit';
const STORAGE_KEY_CUSTOM_EXP_CATS = 'ebv_custom_expense_cats';
const STORAGE_KEY_CUSTOM_INC_CATS = 'ebv_custom_income_cats';

// ── In-memory state ───────────────────────────────────────────────────
let transactions       = [];   // [{ id, name, amount, type, category, date }]
let spendingLimit      = null; // number | null
let customExpenseCats  = [];   // string[]
let customIncomeCats   = [];   // string[]
let activeFormType     = 'expense'; // 'expense' | 'income'

// ── Default categories ────────────────────────────────────────────────
const DEFAULT_EXPENSE_CATS = [
  { value: 'Food',      label: '🍔 Food'      },
  { value: 'Transport', label: '🚌 Transport'  },
  { value: 'Fun',       label: '🎉 Fun'        },
];

const DEFAULT_INCOME_CATS = [
  { value: 'Work',           label: '💼 Work'           },
  { value: 'Passive Income', label: '📈 Passive Income'  },
  { value: 'Business',       label: '🏢 Business'        },
];

// ── DOM references ────────────────────────────────────────────────────
const balanceDisplay   = document.getElementById('balance-display');
const balanceLimitNote = document.getElementById('balance-limit-note');
const incomeDisplay    = document.getElementById('income-display');
const expenseDisplay   = document.getElementById('expense-display');
const transactionList  = document.getElementById('transaction-list');
const transactionForm  = document.getElementById('transaction-form');
const itemNameInput    = document.getElementById('item-name');
const amountInput      = document.getElementById('amount');
const categorySelect   = document.getElementById('category');
const btnSubmit        = document.getElementById('btn-submit');
const chartCanvas      = document.getElementById('spending-chart');
const themeToggleBtn   = document.getElementById('theme-toggle');
const themeLabel       = document.getElementById('theme-label');
const themeIcon        = document.getElementById('theme-icon');

// Form tabs
const tabExpense = document.getElementById('tab-expense');
const tabIncome  = document.getElementById('tab-income');

// Strip buttons
const btnOpenLimit    = document.getElementById('btn-open-limit');
const btnOpenSummary  = document.getElementById('btn-open-summary');
const btnOpenCategory = document.getElementById('btn-open-category');

// Limit modal
const modalLimit        = document.getElementById('modal-limit');
const modalLimitInput   = document.getElementById('modal-limit-input');
const modalLimitCurrent = document.getElementById('modal-limit-current');
const btnModalSetLimit  = document.getElementById('btn-modal-set-limit');
const btnModalRemLimit  = document.getElementById('btn-modal-remove-limit');

// Summary modal
const modalSummary   = document.getElementById('modal-summary');
const summaryContent = document.getElementById('summary-content');

// Category modal
const modalCategory       = document.getElementById('modal-category');
const catTabExpense       = document.getElementById('cat-tab-expense');
const catTabIncome        = document.getElementById('cat-tab-income');
const catPanelExpense     = document.getElementById('cat-panel-expense');
const catPanelIncome      = document.getElementById('cat-panel-income');
const newExpCatInput      = document.getElementById('new-expense-cat-input');
const btnAddExpCat        = document.getElementById('btn-add-expense-cat');
const customExpCatList    = document.getElementById('custom-expense-cat-list');
const customExpCatEmpty   = document.getElementById('custom-expense-cat-empty');
const errorExpCat         = document.getElementById('error-expense-cat');
const newIncCatInput      = document.getElementById('new-income-cat-input');
const btnAddIncCat        = document.getElementById('btn-add-income-cat');
const customIncCatList    = document.getElementById('custom-income-cat-list');
const customIncCatEmpty   = document.getElementById('custom-income-cat-empty');
const errorIncCat         = document.getElementById('error-income-cat');

// ── Utilities ─────────────────────────────────────────────────────────

function formatIDR(amount) {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('id-ID');
  return amount < 0 ? 'Rp -' + formatted : 'Rp ' + formatted;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── LocalStorage helpers ──────────────────────────────────────────────

function saveTransactions() {
  try { localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions)); }
  catch (e) { console.warn('Save transactions failed:', e); }
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Migrate old records that have no 'type' field — treat as expense
    return data.map(t => ({ type: 'expense', ...t }));
  } catch (e) { return []; }
}

function saveLimit(value) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY_LIMIT);
    else localStorage.setItem(STORAGE_KEY_LIMIT, String(value));
  } catch (e) { console.warn('Save limit failed:', e); }
}

function loadLimit() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMIT);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  } catch (e) { return null; }
}

function saveCustomCats(type, arr) {
  const key = type === 'expense' ? STORAGE_KEY_CUSTOM_EXP_CATS : STORAGE_KEY_CUSTOM_INC_CATS;
  try { localStorage.setItem(key, JSON.stringify(arr)); }
  catch (e) { console.warn('Save custom cats failed:', e); }
}

function loadCustomCats(type) {
  const key = type === 'expense' ? STORAGE_KEY_CUSTOM_EXP_CATS : STORAGE_KEY_CUSTOM_INC_CATS;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

// ── Category helpers ──────────────────────────────────────────────────

function getCategoryEmoji(name, type) {
  const expMap = { Food: '🍔', Transport: '🚌', Fun: '🎉' };
  const incMap = { Work: '💼', 'Passive Income': '📈', Business: '🏢' };
  if (type === 'income') return incMap[name] || '💰';
  return expMap[name] || '💸';
}

/** Rebuild the category <select> based on the active form type */
function renderCategoryDropdown() {
  const current = categorySelect.value;
  categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';

  const defaults = activeFormType === 'expense' ? DEFAULT_EXPENSE_CATS : DEFAULT_INCOME_CATS;
  const customs  = activeFormType === 'expense' ? customExpenseCats    : customIncomeCats;
  const customEmoji = activeFormType === 'expense' ? '💸' : '💰';

  defaults.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    categorySelect.appendChild(opt);
  });

  customs.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${customEmoji} ${name}`;
    categorySelect.appendChild(opt);
  });

  if (current) categorySelect.value = current;
}

// ── Form tab switching ────────────────────────────────────────────────

function switchFormTab(type) {
  activeFormType = type;

  tabExpense.classList.toggle('form-tab--active', type === 'expense');
  tabIncome.classList.toggle('form-tab--active',  type === 'income');

  if (type === 'expense') {
    btnSubmit.textContent = 'Add Expense';
    btnSubmit.className   = 'btn-submit btn-submit--expense';
    itemNameInput.placeholder = 'e.g. Lunch, Bus ticket';
    amountInput.placeholder   = 'e.g. 25000';
  } else {
    btnSubmit.textContent = 'Add Income';
    btnSubmit.className   = 'btn-submit btn-submit--income';
    itemNameInput.placeholder = 'e.g. Monthly salary, Freelance';
    amountInput.placeholder   = 'e.g. 5000000';
  }

  // Reset category selection and rebuild dropdown
  categorySelect.value = '';
  renderCategoryDropdown();
}

tabExpense.addEventListener('click', () => switchFormTab('expense'));
tabIncome.addEventListener('click',  () => switchFormTab('income'));

// ── Render: Balance ───────────────────────────────────────────────────

function renderBalance() {
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  incomeDisplay.textContent  = formatIDR(totalIncome);
  expenseDisplay.textContent = formatIDR(totalExpense);
  balanceDisplay.textContent = formatIDR(balance);

  // Colour priority: red (minus) > yellow (over limit) > green (safe)
  if (balance < 0) {
    balanceDisplay.className = 'balance-amount balance--minus';
    balanceLimitNote.textContent = '⛔ Balance is negative';
  } else if (spendingLimit !== null && totalExpense > spendingLimit) {
    balanceDisplay.className = 'balance-amount balance--over';
    balanceLimitNote.textContent = `⚠️ Expenses over limit of ${formatIDR(spendingLimit)}`;
  } else {
    balanceDisplay.className = 'balance-amount balance--ok';
    balanceLimitNote.textContent = spendingLimit !== null
      ? `Expense limit: ${formatIDR(spendingLimit)}`
      : '';
  }
}

// ── Render: Transaction list ──────────────────────────────────────────

function renderTransactionList() {
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'transaction-empty';
    empty.textContent = 'No transactions yet';
    transactionList.appendChild(empty);
    return;
  }

  [...transactions].reverse().forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    // Highlight expense items that exceed the spending limit
    if (t.type === 'expense' && spendingLimit !== null && t.amount > spendingLimit) {
      li.classList.add('transaction-item--over');
    }

    li.dataset.id = t.id;

    const emoji      = getCategoryEmoji(t.category, t.type);
    const sign       = t.type === 'income' ? '+' : '−';
    const amtClass   = t.type === 'income'
      ? 'transaction-amount transaction-amount--income'
      : 'transaction-amount transaction-amount--expense';

    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHtml(t.name)}</span>
        <span class="transaction-category">${emoji} ${escapeHtml(t.category)}</span>
      </div>
      <div class="transaction-right">
        <span class="${amtClass}">${sign} ${formatIDR(t.amount)}</span>
        <button class="btn-delete" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
      </div>
    `;
    li.querySelector('.btn-delete').addEventListener('click', () => deleteTransaction(t.id));
    transactionList.appendChild(li);
  });
}

// ── Render: Chart ─────────────────────────────────────────────────────

let spendingChart  = null;
let activeChartTab = 'expense'; // 'expense' | 'income'

const chartTabExpense = document.getElementById('chart-tab-expense');
const chartTabIncome  = document.getElementById('chart-tab-income');
const chartTitle      = document.getElementById('chart-title');
const doughnutLabel   = document.getElementById('doughnut-label');
const doughnutValue   = document.getElementById('doughnut-value');
const chartLegend     = document.getElementById('chart-legend');
const chartEmptyMsg   = document.getElementById('chart-empty-msg');
const doughnutWrap    = document.querySelector('.doughnut-wrap');

const EXPENSE_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981',
  '#f43f5e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

const INCOME_PALETTE = [
  '#16a34a', '#0ea5e9', '#8b5cf6',
  '#f59e0b', '#10b981', '#6366f1',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

const EXPENSE_FIXED_COLORS = { Food: '#6366f1', Transport: '#f59e0b', Fun: '#10b981' };
const INCOME_FIXED_COLORS  = { Work: '#16a34a', 'Passive Income': '#0ea5e9', Business: '#8b5cf6' };

function getCategoryColor(name, type, index) {
  if (type === 'expense') return EXPENSE_FIXED_COLORS[name] || EXPENSE_PALETTE[index % EXPENSE_PALETTE.length];
  return INCOME_FIXED_COLORS[name] || INCOME_PALETTE[index % INCOME_PALETTE.length];
}

function initChart() {
  spendingChart = new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 0,          // no segment borders — cleaner look
        hoverOffset: 8,          // segments lift on hover
        borderRadius: 4,         // rounded segment ends
      }],
    },
    options: {
      responsive: false,         // we control size via CSS
      cutout: '68%',             // doughnut hole size
      plugins: {
        legend: { display: false },   // we use our own HTML legend
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${formatIDR(value)} (${pct}%)`;
            },
          },
          backgroundColor: 'rgba(0,0,0,0.75)',
          padding: 10,
          cornerRadius: 8,
        },
      },
      animation: {
        animateRotate: true,
        duration: 400,
      },
    },
  });

  // Start with empty state visible
  showChartEmpty(true);
}

function showChartEmpty(isEmpty) {
  if (isEmpty) {
    doughnutWrap.style.display    = 'none';
    chartLegend.style.display     = 'none';
    chartEmptyMsg.classList.add('is-visible');
  } else {
    doughnutWrap.style.display    = 'block';
    chartLegend.style.display     = 'flex';
    chartEmptyMsg.classList.remove('is-visible');
  }
}

function renderChart() {
  if (!spendingChart) return;

  const filtered = transactions.filter(t => t.type === activeChartTab);
  const totals   = {};
  filtered.forEach(({ category, amount }) => {
    totals[category] = (totals[category] || 0) + amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map((l, i) => getCategoryColor(l, activeChartTab, i));
  const total  = data.reduce((a, b) => a + b, 0);

  if (labels.length === 0) {
    showChartEmpty(true);
    doughnutValue.textContent = formatIDR(0);
    chartLegend.innerHTML = '';
    spendingChart.data.labels                      = [];
    spendingChart.data.datasets[0].data            = [];
    spendingChart.data.datasets[0].backgroundColor = [];
    spendingChart.update();
    return;
  }

  showChartEmpty(false);

  // Update centre label
  doughnutLabel.textContent = activeChartTab === 'expense' ? 'Expenses' : 'Income';
  doughnutValue.textContent = formatIDR(total);

  // Update chart data
  spendingChart.data.labels                      = labels;
  spendingChart.data.datasets[0].data            = data;
  spendingChart.data.datasets[0].backgroundColor = colors;
  spendingChart.update();

  // Rebuild HTML legend
  chartLegend.innerHTML = '';
  labels.forEach((label, i) => {
    const pct  = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${colors[i]}"></span>
      <span class="legend-name">${escapeHtml(label)}</span>
      <span class="legend-pct">${pct}%</span>
      <span class="legend-amt">${formatIDR(data[i])}</span>
    `;
    chartLegend.appendChild(item);
  });
}

function updateChartTheme(theme) {
  // No Chart.js legend to update — our HTML legend inherits CSS variables automatically
  if (!spendingChart) return;
  spendingChart.update();
}

// Chart tab switching
function switchChartTab(type) {
  activeChartTab = type;
  chartTabExpense.classList.toggle('chart-tab--active', type === 'expense');
  chartTabIncome.classList.toggle('chart-tab--active',  type === 'income');
  chartTitle.textContent = type === 'expense' ? 'Spending by Category' : 'Income by Category';
  renderChart();
}

chartTabExpense.addEventListener('click', () => switchChartTab('expense'));
chartTabIncome.addEventListener('click',  () => switchChartTab('income'));

// ── Master render ─────────────────────────────────────────────────────

function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

// ── Data operations ───────────────────────────────────────────────────

function addTransaction(name, amount, category, type) {
  transactions.push({
    id:       generateId(),
    name:     name.trim(),
    amount:   Math.round(amount),
    type,
    category,
    date:     new Date().toISOString(),
  });
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
  const el = document.getElementById('error-' + fieldId);
  if (el) el.textContent = message;
}

function clearErrors() {
  ['item-name', 'amount', 'category'].forEach(id => setError(id, ''));
}

transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearErrors();

  const name      = itemNameInput.value;
  const amountRaw = amountInput.value;
  const category  = categorySelect.value;
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

  addTransaction(name, amountNum, category, activeFormType);
  transactionForm.reset();
  categorySelect.value = '';
  itemNameInput.focus();
});

// ── Theme ─────────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  themeLabel.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  themeIcon.textContent  = theme === 'dark' ? '🌙'        : '☀️';
  updateChartTheme(theme);
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Modal helpers ─────────────────────────────────────────────────────

function openModal(modalEl) {
  modalEl.classList.add('is-open');
  const focusable = modalEl.querySelector('input, button, select, textarea');
  if (focusable) setTimeout(() => focusable.focus(), 50);
}

function closeModal(modalEl) {
  modalEl.classList.remove('is-open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(document.getElementById(btn.dataset.close));
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.is-open').forEach(closeModal);
  }
});

// ── Spending Limit modal ──────────────────────────────────────────────

function applyLimit(value) {
  spendingLimit = value;
  saveLimit(value);
  updateLimitModalUI();
  renderAll();
}

function updateLimitModalUI() {
  if (spendingLimit !== null) {
    modalLimitInput.value = spendingLimit;
    modalLimitCurrent.textContent = `Active limit: ${formatIDR(spendingLimit)}`;
    btnModalRemLimit.style.display = 'inline-flex';
  } else {
    modalLimitInput.value = '';
    modalLimitCurrent.textContent = 'No limit currently set.';
    btnModalRemLimit.style.display = 'none';
  }
}

btnOpenLimit.addEventListener('click', () => {
  updateLimitModalUI();
  openModal(modalLimit);
});

btnModalSetLimit.addEventListener('click', () => {
  const raw = parseInt(modalLimitInput.value, 10);
  if (isNaN(raw) || raw < 1) {
    modalLimitInput.style.outline = '2px solid #ef4444';
    setTimeout(() => { modalLimitInput.style.outline = ''; }, 1200);
    modalLimitInput.focus();
    return;
  }
  applyLimit(raw);
  closeModal(modalLimit);
});

modalLimitInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnModalSetLimit.click();
});

btnModalRemLimit.addEventListener('click', () => {
  applyLimit(null);
  closeModal(modalLimit);
});

// ── Monthly Summary modal ─────────────────────────────────────────────

function renderMonthlySummary() {
  if (transactions.length === 0) {
    summaryContent.innerHTML = '<p class="summary-empty">No transactions to summarise yet.</p>';
    return;
  }

  const byMonth = {};
  transactions.forEach(t => {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  });

  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  const monthNames   = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

  summaryContent.innerHTML = '';

  sortedMonths.forEach(key => {
    const [year, month] = key.split('-');
    const monthLabel    = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    const items         = byMonth[key];

    const totalIncome  = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net          = totalIncome - totalExpense;

    // Expense breakdown by category
    const expCatTotals = {};
    items.filter(t => t.type === 'expense').forEach(({ category, amount }) => {
      expCatTotals[category] = (expCatTotals[category] || 0) + amount;
    });

    // Income breakdown by category
    const incCatTotals = {};
    items.filter(t => t.type === 'income').forEach(({ category, amount }) => {
      incCatTotals[category] = (incCatTotals[category] || 0) + amount;
    });

    const section = document.createElement('div');
    section.className = 'summary-month';

    const incRows = Object.entries(incCatTotals).map(([cat, amt]) => `
      <div class="summary-row summary-row--income">
        <span class="summary-row__label">${getCategoryEmoji(cat, 'income')} ${escapeHtml(cat)}</span>
        <span class="summary-row__amount">+ ${formatIDR(amt)}</span>
      </div>`).join('');

    const expRows = Object.entries(expCatTotals).map(([cat, amt]) => `
      <div class="summary-row summary-row--expense">
        <span class="summary-row__label">${getCategoryEmoji(cat, 'expense')} ${escapeHtml(cat)}</span>
        <span class="summary-row__amount">− ${formatIDR(amt)}</span>
      </div>`).join('');

    const netColor = net < 0 ? 'var(--balance-minus)' : net > 0 ? 'var(--balance-ok)' : 'var(--text-primary)';

    section.innerHTML = `
      <p class="summary-month-title">${escapeHtml(monthLabel)}</p>
      ${incRows || '<div class="summary-row"><span class="summary-row__label" style="color:var(--text-muted)">No income</span></div>'}
      ${expRows || '<div class="summary-row"><span class="summary-row__label" style="color:var(--text-muted)">No expenses</span></div>'}
      <div class="summary-row summary-row--net" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">
        <span class="summary-row__label" style="font-weight:700">Net</span>
        <span class="summary-row__amount" style="color:${netColor}">${formatIDR(net)}</span>
      </div>
    `;

    summaryContent.appendChild(section);
  });
}

btnOpenSummary.addEventListener('click', () => {
  renderMonthlySummary();
  openModal(modalSummary);
});

// ── Custom Category modal ─────────────────────────────────────────────

// Tab switching inside category modal
function switchCatTab(type) {
  catTabExpense.classList.toggle('cat-tab--active', type === 'expense');
  catTabIncome.classList.toggle('cat-tab--active',  type === 'income');
  catPanelExpense.classList.toggle('cat-panel--hidden', type !== 'expense');
  catPanelIncome.classList.toggle('cat-panel--hidden',  type !== 'income');
}

catTabExpense.addEventListener('click', () => switchCatTab('expense'));
catTabIncome.addEventListener('click',  () => switchCatTab('income'));

function renderCustomCatList(type) {
  const list    = type === 'expense' ? customExpCatList  : customIncCatList;
  const empty   = type === 'expense' ? customExpCatEmpty : customIncCatEmpty;
  const customs = type === 'expense' ? customExpenseCats : customIncomeCats;
  const emoji   = type === 'expense' ? '💸' : '💰';

  list.innerHTML = '';

  if (customs.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  customs.forEach((name, index) => {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.innerHTML = `
      <span>${emoji} ${escapeHtml(name)}</span>
      <button class="btn-cat-delete" aria-label="Remove ${escapeHtml(name)}">✕ Remove</button>
    `;
    li.querySelector('.btn-cat-delete').addEventListener('click', () => {
      removeCustomCat(type, index);
    });
    list.appendChild(li);
  });
}

function addCustomCat(type, name) {
  const trimmed = name.trim();
  const errorEl = type === 'expense' ? errorExpCat : errorIncCat;
  const defaults = type === 'expense'
    ? DEFAULT_EXPENSE_CATS.map(c => c.value.toLowerCase())
    : DEFAULT_INCOME_CATS.map(c => c.value.toLowerCase());
  const customs = type === 'expense' ? customExpenseCats : customIncomeCats;

  if (!trimmed) {
    errorEl.textContent = 'Category name cannot be empty.';
    return;
  }
  if (trimmed.length > 50) {
    errorEl.textContent = 'Maximum 50 characters.';
    return;
  }
  const allNames = [...defaults, ...customs.map(c => c.toLowerCase())];
  if (allNames.includes(trimmed.toLowerCase())) {
    errorEl.textContent = 'This category already exists.';
    return;
  }

  errorEl.textContent = '';
  customs.push(trimmed);
  saveCustomCats(type, customs);
  renderCustomCatList(type);
  renderCategoryDropdown(); // update form dropdown if same type is active
  if (type === 'expense') {
    newExpCatInput.value = '';
    newExpCatInput.focus();
  } else {
    newIncCatInput.value = '';
    newIncCatInput.focus();
  }
}

function removeCustomCat(type, index) {
  const customs = type === 'expense' ? customExpenseCats : customIncomeCats;
  customs.splice(index, 1);
  saveCustomCats(type, customs);
  renderCustomCatList(type);
  renderCategoryDropdown();
}

btnOpenCategory.addEventListener('click', () => {
  errorExpCat.textContent = '';
  errorIncCat.textContent = '';
  switchCatTab('expense');
  renderCustomCatList('expense');
  renderCustomCatList('income');
  openModal(modalCategory);
});

btnAddExpCat.addEventListener('click', () => addCustomCat('expense', newExpCatInput.value));
btnAddIncCat.addEventListener('click', () => addCustomCat('income',  newIncCatInput.value));

newExpCatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomCat('expense', newExpCatInput.value); }
});
newIncCatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomCat('income', newIncCatInput.value); }
});

// ── Initialisation ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme first (prevents flash)
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  applyTheme(savedTheme);

  // 2. Load persisted state
  transactions      = loadTransactions();
  spendingLimit     = loadLimit();
  customExpenseCats = loadCustomCats('expense');
  customIncomeCats  = loadCustomCats('income');

  // 3. Build category dropdown (expense tab is default)
  switchFormTab('expense');

  // 4. Init chart
  initChart();

  // 5. Render everything
  renderAll();
});
