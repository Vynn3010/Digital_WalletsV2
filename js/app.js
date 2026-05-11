const WALLETS = [
  { id: 'dana',      name: 'DANA',       icon: '💙', type: 'E-Wallet' },
  { id: 'gopay',     name: 'GoPay',      icon: '🟢', type: 'E-Wallet' },
  { id: 'ovo',       name: 'OVO',        icon: '💜', type: 'E-Wallet' },
  { id: 'shopeepay', name: 'ShopeePay',  icon: '🟠', type: 'E-Wallet' },
  { id: 'jago',      name: 'Jago',       icon: '🐉', type: 'Bank' },
  { id: 'bri',       name: 'BRI',        icon: '🏦', type: 'Bank' },
  { id: 'cash',      name: 'Cash',       icon: '💵', type: 'Tunai' },
  { id: 'qris',      name: 'QRIS Order', icon: '📱', type: 'QRIS' },
  { id: 'kuota',     name: 'Kuota',      icon: '📡', type: 'Paket Data' },
];

let transactions = [];
let currentFilter = 'all';
let currentModalType = 'income';
let selectedWallet = '';

function load() {
  try {
    const s = localStorage.getItem('vault_txs');
    if (s) transactions = JSON.parse(s);
  } catch(e) { transactions = []; }
}

function save() {
  localStorage.setItem('vault_txs', JSON.stringify(transactions));
}

function fmt(n) {
  return Math.abs(n).toLocaleString('id-ID');
}

function fmtSigned(n) {
  const sign = n < 0 ? '- ' : '';
  return sign + fmt(n);
}

function getWallet(id) {
  return WALLETS.find(w => w.id === id) || { name: id, icon: '💳', type: '' };
}

function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach((t,i) => {
    const pages = ['dashboard','income-page','expense-page','wallets-page'];
    t.classList.toggle('active', pages[i] === id);
  });
  renderAll();
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAll();
}

function renderAll() {
  updateSummary();
  renderList('tx-all', getFiltered(transactions, currentFilter, document.getElementById('search-input')?.value));
  renderList('tx-income', getFiltered(transactions, 'income', document.getElementById('search-income')?.value));
  renderList('tx-expense', getFiltered(transactions, 'expense', document.getElementById('search-expense')?.value));
  updateIncomeExpenseStats();
  renderWalletCards();
  renderWalletTx();
  updateWalletFilterOptions();
}

function getFiltered(txs, type, query) {
  let out = txs;
  if (type !== 'all') out = out.filter(t => t.type === type);
  if (query) {
    const q = query.toLowerCase();
    out = out.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.wallet && getWallet(t.wallet).name.toLowerCase().includes(q))
    );
  }
  return out.slice().reverse();
}

function renderList(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="tx-empty">⚡ Belum ada transaksi</div>';
    return;
  }
  el.innerHTML = items.map(t => {
    const w = t.wallet ? getWallet(t.wallet) : null;
    const sign = t.type === 'income' ? '+' : '−';
    return `<div class="tx-item">
      <div class="tx-icon ${t.type}">${t.type === 'income' ? '↑' : '↓'}</div>
      <div class="tx-info">
        <div class="tx-desc">${t.description}</div>
        <div class="tx-meta">
          <span>${t.date}</span>
          ${w ? `<span class="tx-wallet-badge">${w.icon} ${w.name}</span>` : ''}
        </div>
      </div>
      <div class="tx-amount ${t.type}">${sign} Rp ${fmt(t.amount)}</div>
      <button class="tx-del" onclick="deleteTx(${t.id})" title="Hapus">✕</button>
    </div>`;
  }).join('');
}

function updateSummary() {
  const income = transactions.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0);
  const balance = income - expense;
  document.getElementById('db-balance').textContent = fmtSigned(balance);
  document.getElementById('db-income').textContent = 'Rp ' + fmtSigned(income);
  document.getElementById('db-expense').textContent = 'Rp ' + fmtSigned(expense);
}

function updateIncomeExpenseStats() {
  const incTxs = transactions.filter(t => t.type === 'income');
  const expTxs = transactions.filter(t => t.type === 'expense');
  const incTotal = incTxs.reduce((a,t) => a+t.amount, 0);
  const expTotal = expTxs.reduce((a,t) => a+t.amount, 0);

  const it = document.getElementById('inc-total');
  const ic = document.getElementById('inc-count');
  const et = document.getElementById('exp-total');
  const ec = document.getElementById('exp-count');
  if (it) it.textContent = fmt(incTotal);
  if (ic) ic.textContent = incTxs.length;
  if (et) et.textContent = fmt(expTotal);
  if (ec) ec.textContent = expTxs.length;
}

function renderWalletCards() {
  const el = document.getElementById('wallet-cards');
  if (!el) return;

  let totalAll = 0;
  const cards = WALLETS.map(w => {
    const income = transactions.filter(t => t.wallet === w.id && t.type === 'income').reduce((a,t) => a+t.amount, 0);
    const expense = transactions.filter(t => t.wallet === w.id && t.type === 'expense').reduce((a,t) => a+t.amount, 0);
    const balance = income - expense;
    totalAll += balance;
    return { w, income, expense, balance };
  });

  document.getElementById('wallet-total').textContent = fmtSigned(totalAll);

  el.innerHTML = cards.map(({ w, income, expense, balance }) => `
    <div class="wallet-card">
      <div class="wc-header">
        <div class="wc-icon">${w.icon}</div>
        <div>
          <div class="wc-name">${w.name}</div>
          <div class="wc-type">${w.type}</div>
        </div>
      </div>
      <div class="wc-balance">
        <span class="wc-currency">Rp</span>${fmtSigned(balance)}
      </div>
      <div class="wc-footer">
        <span class="wc-in">↑ ${fmt(income)}</span>
        <span class="wc-out">↓ ${fmt(expense)}</span>
      </div>
    </div>
  `).join('');
}

function updateWalletFilterOptions() {
  const sel = document.getElementById('wallet-filter');
  if (!sel) return;
  const usedWallets = [...new Set(transactions.map(t => t.wallet).filter(Boolean))];
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua Platform</option>' +
    usedWallets.map(id => {
      const w = getWallet(id);
      return `<option value="${id}" ${id === current ? 'selected' : ''}>${w.icon} ${w.name}</option>`;
    }).join('');
}

function renderWalletTx() {
  const sel = document.getElementById('wallet-filter');
  const walletId = sel ? sel.value : '';
  let txs = walletId
    ? transactions.filter(t => t.wallet === walletId)
    : transactions.filter(t => t.wallet);
  renderList('wallet-tx-list', txs.slice().reverse());
}

function openModal(type) {
  currentModalType = type;
  selectedWallet = '';
  document.getElementById('f-desc').value = '';
  document.getElementById('f-amount').value = '';
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];

  const isIncome = type === 'income';
  document.getElementById('modal-title').textContent = isIncome ? 'TAMBAH PEMASUKAN' : 'CATAT PENGELUARAN';
  document.getElementById('modal-sub').textContent = isIncome
    ? 'Masukkan detail pemasukan kamu' : 'Masukkan detail pengeluaran kamu';
  const btn = document.getElementById('modal-btn');
  btn.textContent = isIncome ? 'Simpan Pemasukan' : 'Simpan Pengeluaran';
  btn.className = 'btn-primary ' + (isIncome ? 'green' : 'danger');

  document.getElementById('wallet-selector').innerHTML = WALLETS.map(w => `
    <div class="wallet-opt" id="wopt-${w.id}" onclick="selectWallet('${w.id}')">
      <span class="wo-icon">${w.icon}</span>
      <span class="wo-name">${w.name}</span>
    </div>
  `).join('');

  document.getElementById('modal').classList.add('open');
  document.getElementById('f-desc').focus();
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function selectWallet(id) {
  selectedWallet = selectedWallet === id ? '' : id;
  document.querySelectorAll('.wallet-opt').forEach(el => el.classList.remove('selected'));
  if (selectedWallet) document.getElementById('wopt-' + selectedWallet)?.classList.add('selected');
}

function submitTransaction() {
  const desc = document.getElementById('f-desc').value.trim();
  const amount = parseInt(document.getElementById('f-amount').value);
  const date = document.getElementById('f-date').value;

  if (!desc) { alert('Isi deskripsi dulu!'); return; }
  if (!amount || amount <= 0) { alert('Jumlah harus lebih dari 0!'); return; }
  if (!date) { alert('Pilih tanggal!'); return; }

  transactions.push({
    id: Date.now(),
    date,
    description: desc,
    amount,
    type: currentModalType,
    wallet: selectedWallet || null,
  });

  save();
  closeModal();
  renderAll();
  showNotif(currentModalType === 'income' ? '✅ Pemasukan tersimpan!' : '✅ Pengeluaran tersimpan!');
}

function deleteTx(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  renderAll();
  showNotif('🗑 Transaksi dihapus');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'vault-transactions.json'; a.click();
  showNotif('📁 File JSON berhasil diexport!');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      transactions = data.map(t => ({
        id: t.id || Date.now() + Math.random(),
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || '',
        amount: parseInt(t.amount) || 0,
        type: t.type || 'expense',
        wallet: t.wallet || null,
      }));
      save(); renderAll();
      showNotif('📂 ' + transactions.length + ' transaksi berhasil diimport!');
    } catch { alert('File JSON tidak valid!'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function showNotif(msg) {
  const n = document.createElement('div');
  n.className = 'notif'; n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2800);
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

load();
renderAll();