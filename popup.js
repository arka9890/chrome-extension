// popup.js - Logic popup extension (Master + Compare + Perbandingan)

function parseNumber(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

function formatRupiah(num) {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

let masterData = [];
let compareData = [];
let pageUrl = '';
let pageTitle = '';
let dateFromMaster = '';
let dateToMaster = '';
let dateFromCompare = '';
let dateToCompare = '';
let dateFromComp = '';
let dateToComp = '';
let currentTab = 'master';
let comparisonFilter = 'all';
let searchComp = '';

// ===== Tab switching =====
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('.tab[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  renderAll();
}

// ===== Filtering =====
function getFilteredMaster() {
  const search = document.getElementById('searchMaster').value.trim().toLowerCase();
  let filtered = masterData;
  if (dateFromMaster) filtered = filtered.filter(d => d.date >= dateFromMaster);
  if (dateToMaster) filtered = filtered.filter(d => d.date <= dateToMaster);
  if (search) filtered = filtered.filter(d => d.store.toLowerCase().includes(search));
  return filtered;
}

function getFilteredCompare() {
  const search = document.getElementById('searchCompare').value.trim().toLowerCase();
  let filtered = compareData;
  if (dateFromCompare) filtered = filtered.filter(d => d.date >= dateFromCompare);
  if (dateToCompare) filtered = filtered.filter(d => d.date <= dateToCompare);
  if (search) filtered = filtered.filter(d => (d.invoiceId || '').includes(search) || (d.txnId || '').includes(search));
  return filtered;
}

// ===== Master rendering =====
function renderMasterDateSummary() {
  const summaryDiv = document.getElementById('dateSummaryMaster');
  const select = document.getElementById('dateSummarySelectMaster');
  const detail = document.getElementById('dateSummaryDetailMaster');
  if (masterData.length === 0) {
    summaryDiv.style.display = 'none';
    return;
  }
  summaryDiv.style.display = 'block';

  const byDate = {};
  masterData.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = { total: 0, count: 0, kurang: 0 };
    byDate[d.date].total += d.total || 0;
    byDate[d.date].kurang += d.kurang || 0;
    byDate[d.date].count++;
  });

  const dates = Object.keys(byDate).sort().reverse();
  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
  dates.forEach(date => {
    const info = byDate[date];
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = date + '  (' + info.count + ' data, ' + formatRupiah(info.total) + ')';
    select.appendChild(opt);
  });

  if (currentValue && dates.includes(currentValue)) {
    select.value = currentValue;
    showMasterDateDetail(currentValue, byDate);
  } else {
    detail.classList.remove('show');
    detail.innerHTML = '';
  }
}

function showMasterDateDetail(date, byDate) {
  const detail = document.getElementById('dateSummaryDetailMaster');
  if (!date || !byDate[date]) {
    detail.classList.remove('show');
    detail.innerHTML = '';
    return;
  }
  const info = byDate[date];
  detail.classList.add('show');
  detail.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Total Uang</span>
      <span class="detail-value">${formatRupiah(info.total)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Total Kurang</span>
      <span class="detail-value" style="color:#c62828;">${formatRupiah(info.kurang)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Jumlah Data</span>
      <span class="detail-value" style="color:#1976d2;">${info.count} data</span>
    </div>
  `;
}

function renderMaster() {
  const filtered = getFilteredMaster();

  const totalAll = filtered.reduce((sum, d) => sum + (d.total || 0), 0);
  const totalKurang = filtered.reduce((sum, d) => sum + (d.kurang || 0), 0);

  document.getElementById('totalMaster').textContent = formatRupiah(totalAll);
  document.getElementById('totalKurangMaster').textContent = formatRupiah(totalKurang);
  document.getElementById('countMaster').textContent = filtered.length + ' data';

  const list = document.getElementById('listMaster');
  list.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    if (masterData.length === 0) {
      empty.innerHTML = 'Belum ada data master.<br>Buka website master lalu klik Refresh';
    } else {
      empty.innerHTML = 'Tidak ada data yang cocok dengan filter.';
    }
    list.appendChild(empty);
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  });

  sorted.forEach(d => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="item-header">
        <span class="id">#${escapeHtml(d.id)}</span>
        <span class="date">${escapeHtml(d.date)}</span>
        <span class="status-badge ${d.status || ''}">${escapeHtml(d.status || '-')}</span>
      </div>
      <div class="store">${escapeHtml(d.store)}</div>
      <div class="amounts">
        <span class="total-amt">Total: ${formatRupiah(d.total)}</span>
        <span class="kurang-amt">Kurang: ${formatRupiah(d.kurang)}</span>
      </div>
    `;
    list.appendChild(item);
  });
}

// ===== Website 2 rendering =====
function renderCompare() {
  const filtered = getFilteredCompare();

  const totalAll = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);

  document.getElementById('totalCompare').textContent = formatRupiah(totalAll);
  document.getElementById('countCompare').textContent = filtered.length + ' data';

  const list = document.getElementById('listCompare');
  list.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    if (compareData.length === 0) {
      empty.innerHTML = 'Belum ada data website 2.<br>Buka website 2 lalu klik Refresh';
    } else {
      empty.innerHTML = 'Tidak ada data yang cocok dengan filter.';
    }
    list.appendChild(empty);
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.invoiceId || '').localeCompare(a.invoiceId || '', undefined, { numeric: true });
  });

  sorted.forEach(d => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="item-header">
        <span class="id">Inv #${escapeHtml(d.invoiceId)}</span>
        <span class="date">${escapeHtml(d.date)} ${escapeHtml(d.time || '')}</span>
        <span class="status-badge ${d.status || ''}">${escapeHtml(d.status || '-')}</span>
      </div>
      <div class="store">Txn ID: ${escapeHtml(d.txnId || '-')}</div>
      <div class="amounts">
        <span class="total-amt">Amount: ${formatRupiah(d.amount)}</span>
      </div>
    `;
    list.appendChild(item);
  });
}

// ===== Comparison logic =====
function getComparisonData() {
  // Build map of invoice ID -> master entry
  const masterMap = {};
  masterData.forEach(d => {
    masterMap[d.id] = d;
  });

  // Build map of invoice ID -> compare entry
  const compareMap = {};
  compareData.forEach(d => {
    compareMap[d.invoiceId] = d;
  });

  // Get all unique invoice IDs
  const allIds = new Set([...Object.keys(masterMap), ...Object.keys(compareMap)]);

  const results = [];
  allIds.forEach(invId => {
    const m = masterMap[invId];
    const c = compareMap[invId];

    let status = '';
    if (m && c) {
      if (m.total === c.amount) {
        status = 'match';
      } else {
        status = 'mismatch';
      }
    } else if (m && !c) {
      status = 'only-master';
    } else if (!m && c) {
      status = 'only-compare';
    }

    results.push({
      invoiceId: invId,
      master: m || null,
      compare: c || null,
      status: status,
      diff: (m && c) ? (m.total - c.amount) : 0
    });
  });

  // Sort by invoice ID descending
  results.sort((a, b) => b.invoiceId.localeCompare(a.invoiceId, undefined, { numeric: true }));

  // Apply filter
  if (comparisonFilter !== 'all') {
    return results.filter(r => r.status === comparisonFilter);
  }
  return results;
}

function renderComparison() {
  const results = getComparisonData();

  // Update summary counts (filtered by search + date, tapi TANPA filter status)
  const filteredAll = getComparisonData_all().filter(r => {
    // Apply search filter
    if (searchComp) {
      const term = searchComp.toLowerCase();
      const storeName = r.master ? r.master.store.toLowerCase() : '';
      const invoiceId = r.invoiceId.toLowerCase();
      if (!storeName.includes(term) && !invoiceId.includes(term)) return false;
    }
    // Apply date filter
    if (dateFromComp && r.filterDate && r.filterDate < dateFromComp) return false;
    if (dateToComp && r.filterDate && r.filterDate > dateToComp) return false;
    return true;
  });
  document.getElementById('compMatch').textContent = filteredAll.filter(r => r.status === 'match').length;
  document.getElementById('compOnlyMaster').textContent = filteredAll.filter(r => r.status === 'only-master').length;
  document.getElementById('compOnlyCompare').textContent = filteredAll.filter(r => r.status === 'only-compare').length;
  document.getElementById('compMismatch').textContent = filteredAll.filter(r => r.status === 'mismatch').length;

  const list = document.getElementById('listComparison');
  list.innerHTML = '';

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    if (masterData.length === 0 && compareData.length === 0) {
      empty.innerHTML = 'Belum ada data. Scrape data master dan website 2 terlebih dahulu.';
    } else {
      empty.innerHTML = 'Tidak ada data yang cocok dengan filter.';
    }
    list.appendChild(empty);
    return;
  }

  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'comp-item ' + r.status;

    let badgeText = '';
    let badgeClass = r.status;
    if (r.status === 'match') badgeText = 'Cocok';
    else if (r.status === 'mismatch') badgeText = 'Beda Nominal';
    else if (r.status === 'only-master') badgeText = 'Hanya Master';
    else if (r.status === 'only-compare') badgeText = 'Hanya Web2';

    let detailsHtml = '';
    if (r.master) {
      detailsHtml += `
        <div class="comp-detail-row">
          <span class="comp-detail-label">Master Total</span>
          <span class="comp-detail-value">${formatRupiah(r.master.total)}</span>
        </div>
        <div class="comp-detail-row">
          <span class="comp-detail-label">Master Toko</span>
          <span class="comp-detail-value">${escapeHtml(r.master.store)}</span>
        </div>
        <div class="comp-detail-row">
          <span class="comp-detail-label">Master Tanggal</span>
          <span class="comp-detail-value">${escapeHtml(r.master.date)}</span>
        </div>
      `;
    }
    if (r.compare) {
      detailsHtml += `
        <div class="comp-detail-row">
          <span class="comp-detail-label">Web2 Amount</span>
          <span class="comp-detail-value">${formatRupiah(r.compare.amount)}</span>
        </div>
        <div class="comp-detail-row">
          <span class="comp-detail-label">Web2 Tanggal</span>
          <span class="comp-detail-value">${escapeHtml(r.compare.date)}</span>
        </div>
        <div class="comp-detail-row">
          <span class="comp-detail-label">Web2 Status</span>
          <span class="comp-detail-value">${escapeHtml(r.compare.status)}</span>
        </div>
      `;
    }
    if (r.master && r.compare) {
      const diffClass = r.diff === 0 ? 'diff-zero' : (r.diff > 0 ? 'diff-positive' : 'diff-negative');
      detailsHtml += `
        <div class="comp-detail-row" style="border-top:1px solid #eee;margin-top:4px;padding-top:4px;">
          <span class="comp-detail-label">Selisih (Master - Web2)</span>
          <span class="comp-detail-value ${diffClass}">${formatRupiah(Math.abs(r.diff))} ${r.diff > 0 ? '(Master lebih besar)' : r.diff < 0 ? '(Web2 lebih besar)' : ''}</span>
        </div>
      `;
    }

    // Store name subtitle
    const storeName = r.master ? r.master.store : (r.compare ? '' : '');
    const storeSubtitle = storeName ? '<div class="comp-store-name">' + escapeHtml(storeName) + '</div>' : '';

    item.innerHTML = `
      <div class="comp-item-header">
        <div>
          <span class="comp-invoice-id">Invoice #${escapeHtml(r.invoiceId)}</span>
          ${storeSubtitle}
        </div>
        <span class="comp-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="comp-details">${detailsHtml}</div>
    `;
    list.appendChild(item);
  });
}

function getComparisonData_all() {
  const masterMap = {};
  masterData.forEach(d => { masterMap[d.id] = d; });
  const compareMap = {};
  compareData.forEach(d => { compareMap[d.invoiceId] = d; });
  const allIds = new Set([...Object.keys(masterMap), ...Object.keys(compareMap)]);
  const results = [];
  allIds.forEach(invId => {
    const m = masterMap[invId];
    const c = compareMap[invId];
    let status = '';
    if (m && c) status = m.total === c.amount ? 'match' : 'mismatch';
    else if (m && !c) status = 'only-master';
    else if (!m && c) status = 'only-compare';
    // Date for filtering: use master date if available, else compare date
    const filterDate = m ? m.date : (c ? c.date : '');
    // Apply date range filter
    if (dateFromComp && filterDate < dateFromComp) return;
    if (dateToComp && filterDate > dateToComp) return;
    results.push({ invoiceId: invId, master: m || null, compare: c || null, status: status, diff: (m && c) ? (m.total - c.amount) : 0, filterDate: filterDate });
  });
  return results;
}

function getComparisonData() {
  let all = getComparisonData_all();
  // Filter by comparison status
  if (comparisonFilter !== 'all') {
    all = all.filter(r => r.status === comparisonFilter);
  }
  // Filter by search (nama toko / invoice ID)
  if (searchComp) {
    const term = searchComp.toLowerCase();
    all = all.filter(r => {
      const storeName = r.master ? r.master.store.toLowerCase() : '';
      const invoiceId = r.invoiceId.toLowerCase();
      return storeName.includes(term) || invoiceId.includes(term);
    });
  }
  return all;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Data loading =====
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['masterData', 'compareData', 'lastScraped', 'pageUrl', 'pageTitle', 'dateFromMaster', 'dateToMaster', 'dateFromCompare', 'dateToCompare', 'dateFromComp', 'dateToComp']);
    masterData = result.masterData || [];
    compareData = result.compareData || [];
    pageUrl = result.pageUrl || '';
    pageTitle = result.pageTitle || '';
    dateFromMaster = result.dateFromMaster || '';
    dateToMaster = result.dateToMaster || '';
    dateFromCompare = result.dateFromCompare || '';
    dateToCompare = result.dateToCompare || '';
    dateFromComp = result.dateFromComp || '';
    dateToComp = result.dateToComp || '';

    document.getElementById('dateFromMaster').value = dateFromMaster;
    document.getElementById('dateToMaster').value = dateToMaster;
    document.getElementById('dateFromCompare').value = dateFromCompare;
    document.getElementById('dateToCompare').value = dateToCompare;
    document.getElementById('dateFromComp').value = dateFromComp;
    document.getElementById('dateToComp').value = dateToComp;

    renderAll();

    if (result.lastScraped) {
      const date = new Date(result.lastScraped);
      let statusText = 'Terakhir diambil: ' + date.toLocaleString('id-ID');
      if (pageTitle) statusText += ' - ' + pageTitle;
      statusText += ' - Master: ' + masterData.length + ', Web2: ' + compareData.length;
      document.getElementById('statusText').textContent = statusText;
    } else {
      document.getElementById('statusText').textContent = 'Belum ada data. Buka halaman target lalu klik Refresh.';
    }
  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('statusText').textContent = 'Error: ' + e.message;
  }
}

function renderAll() {
  if (currentTab === 'master') {
    renderMasterDateSummary();
    renderMaster();
  } else if (currentTab === 'compare') {
    renderCompare();
  } else if (currentTab === 'comparison') {
    renderComparison();
  }
}

// ===== Refresh =====
async function refresh() {
  const btn = currentTab === 'master' ? document.getElementById('refreshMaster') : document.getElementById('refreshCompare');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('Tidak ada tab aktif');

    chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
      btn.disabled = false;
      btn.textContent = 'Refresh';

      if (chrome.runtime.lastError) {
        document.getElementById('statusText').textContent = 'Error: ' + chrome.runtime.lastError.message + '. Reload halaman (F5) lalu coba lagi.';
        return;
      }

      if (response && response.data) {
        if (response.data.length > 0) {
          const format = response.format || 'master';
          const storageKey = format === 'compare' ? 'compareData' : 'masterData';

          chrome.storage.local.get([storageKey], (res) => {
            const existing = res[storageKey] || [];
            const seen = new Set();
            const keyFn = format === 'compare' ? (d) => d.invoiceId : (d) => d.id + '|' + d.date;
            existing.forEach(d => seen.add(keyFn(d)));
            const merged = [...existing];
            response.data.forEach(d => {
              const key = keyFn(d);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(d);
              }
            });

            const update = {};
            update[storageKey] = merged;
            chrome.storage.local.set(update);

            if (format === 'compare') {
              compareData = merged;
            } else {
              masterData = merged;
            }

            pageUrl = response.url || '';
            pageTitle = response.title || '';
            renderAll();
            document.getElementById('statusText').textContent = 'Berhasil! ' + response.data.length + ' data baru. Total ' + (format === 'compare' ? 'Web2' : 'Master') + ': ' + merged.length;
          });
        } else {
          document.getElementById('statusText').textContent = 'Tidak ada data ditemukan di halaman ini. Coba reload halaman (F5).';
        }
      } else {
        document.getElementById('statusText').textContent = 'Tidak ada respons dari content script. Reload halaman (F5).';
      }
    });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Refresh';
    document.getElementById('statusText').textContent = 'Error: ' + e.message;
  }
}

// ===== Clear =====
async function clearData() {
  let target = '';
  let storageKey = '';
  let confirmMsg = '';

  if (currentTab === 'master') {
    target = 'Master';
    storageKey = 'masterData';
    confirmMsg = 'Hapus semua data Master?';
  } else if (currentTab === 'compare') {
    target = 'Website 2';
    storageKey = 'compareData';
    confirmMsg = 'Hapus semua data Website 2?';
  } else {
    // Tab Perbandingan: tanya user
    const choice = confirm('Hapus data Master? (OK = Master, Cancel = Website 2)');
    if (choice) {
      target = 'Master';
      storageKey = 'masterData';
      confirmMsg = 'Hapus semua data Master?';
    } else {
      target = 'Website 2';
      storageKey = 'compareData';
      confirmMsg = 'Hapus semua data Website 2?';
    }
  }

  if (!confirm(confirmMsg)) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'clear' }, () => {});
    }
    await chrome.storage.local.remove([storageKey]);
    if (storageKey === 'masterData') {
      masterData = [];
    } else {
      compareData = [];
    }
    renderAll();
    document.getElementById('statusText').textContent = 'Data ' + target + ' dihapus. Data lain tidak terpengaruh.';
  } catch (e) {
    console.error('Clear error:', e);
  }
}

// ===== Export =====
function exportToExcel() {
  let dataToExport = [];
  let headers = [];
  let filename = '';

  if (currentTab === 'master') {
    const filtered = getFilteredMaster();
    if (filtered.length === 0) { alert('Tidak ada data master untuk di-export.'); return; }
    const sorted = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
    });
    headers = ['ID Order', 'Tanggal', 'Nama Toko', 'Total (Rp)', 'Kurang (Rp)', 'Status'];
    dataToExport = sorted.map(d => ['#' + d.id, d.date, '"' + (d.store || '').replace(/"/g, '""') + '"', d.total || 0, d.kurang || 0, d.status || '']);
    filename = 'data-master';
  } else if (currentTab === 'compare') {
    const filtered = getFilteredCompare();
    if (filtered.length === 0) { alert('Tidak ada data website 2 untuk di-export.'); return; }
    const sorted = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.invoiceId || '').localeCompare(a.invoiceId || '', undefined, { numeric: true });
    });
    headers = ['Txn ID', 'Tanggal', 'Waktu', 'Invoice ID', 'Amount (Rp)', 'Status'];
    dataToExport = sorted.map(d => [d.txnId || '', d.date, d.time || '', '#' + (d.invoiceId || ''), d.amount || 0, d.status || '']);
    filename = 'data-website2';
  } else {
    // Comparison export
    const results = getComparisonData();
    if (results.length === 0) { alert('Tidak ada data perbandingan untuk di-export.'); return; }
    headers = ['Invoice ID', 'Status', 'Master Total', 'Master Toko', 'Master Tanggal', 'Web2 Amount', 'Web2 Tanggal', 'Selisih'];
    dataToExport = results.map(r => [
      '#' + r.invoiceId,
      r.status,
      r.master ? (r.master.total || 0) : '',
      r.master ? '"' + (r.master.store || '').replace(/"/g, '""') + '"' : '',
      r.master ? r.master.date : '',
      r.compare ? (r.compare.amount || 0) : '',
      r.compare ? r.compare.date : '',
      r.diff || 0
    ]);
    filename = 'perbandingan';
  }

  const BOM = '\uFEFF';
  const sep = ';';
  const csvContent = BOM + [headers.join(sep), ...dataToExport.map(r => r.join(sep))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = filename + '-' + dateStr + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  document.getElementById('statusText').textContent = 'Export berhasil! ' + dataToExport.length + ' data di-export ke CSV.';
}

// ===== Event listeners =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.getElementById('searchMaster').addEventListener('input', () => { if (currentTab === 'master') renderMaster(); });
document.getElementById('searchCompare').addEventListener('input', () => { if (currentTab === 'compare') renderCompare(); });

document.getElementById('refreshMaster').addEventListener('click', refresh);
document.getElementById('refreshCompare').addEventListener('click', refresh);

document.getElementById('clear').addEventListener('click', clearData);
document.getElementById('export').addEventListener('click', exportToExcel);

// Master date filters
document.getElementById('dateFromMaster').addEventListener('change', (e) => {
  dateFromMaster = e.target.value;
  chrome.storage.local.set({ dateFromMaster: dateFromMaster });
  renderMaster();
  renderMasterDateSummary();
});
document.getElementById('dateToMaster').addEventListener('change', (e) => {
  dateToMaster = e.target.value;
  chrome.storage.local.set({ dateToMaster: dateToMaster });
  renderMaster();
  renderMasterDateSummary();
});
document.getElementById('clearDateMaster').addEventListener('click', () => {
  dateFromMaster = '';
  dateToMaster = '';
  document.getElementById('dateFromMaster').value = '';
  document.getElementById('dateToMaster').value = '';
  chrome.storage.local.set({ dateFromMaster: '', dateToMaster: '' });
  renderMaster();
  renderMasterDateSummary();
});

// Compare date filters
document.getElementById('dateFromCompare').addEventListener('change', (e) => {
  dateFromCompare = e.target.value;
  chrome.storage.local.set({ dateFromCompare: dateFromCompare });
  renderCompare();
});
document.getElementById('dateToCompare').addEventListener('change', (e) => {
  dateToCompare = e.target.value;
  chrome.storage.local.set({ dateToCompare: dateToCompare });
  renderCompare();
});
document.getElementById('clearDateCompare').addEventListener('click', () => {
  dateFromCompare = '';
  dateToCompare = '';
  document.getElementById('dateFromCompare').value = '';
  document.getElementById('dateToCompare').value = '';
  chrome.storage.local.set({ dateFromCompare: '', dateToCompare: '' });
  renderCompare();
});

// Date summary dropdown
document.getElementById('dateSummarySelectMaster').addEventListener('change', (e) => {
  const date = e.target.value;
  if (!date) {
    document.getElementById('dateSummaryDetailMaster').classList.remove('show');
    document.getElementById('dateSummaryDetailMaster').innerHTML = '';
    return;
  }
  const byDate = {};
  masterData.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = { total: 0, count: 0, kurang: 0 };
    byDate[d.date].total += d.total || 0;
    byDate[d.date].kurang += d.kurang || 0;
    byDate[d.date].count++;
  });
  const detail = document.getElementById('dateSummaryDetailMaster');
  const info = byDate[date];
  detail.classList.add('show');
  detail.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Total Uang</span>
      <span class="detail-value">${formatRupiah(info.total)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Total Kurang</span>
      <span class="detail-value" style="color:#c62828;">${formatRupiah(info.kurang)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Jumlah Data</span>
      <span class="detail-value" style="color:#1976d2;">${info.count} data</span>
    </div>
  `;
});

// Comparison filter
document.getElementById('dateFromComp').addEventListener('change', (e) => {
  dateFromComp = e.target.value;
  chrome.storage.local.set({ dateFromComp: dateFromComp });
  renderComparison();
});
document.getElementById('dateToComp').addEventListener('change', (e) => {
  dateToComp = e.target.value;
  chrome.storage.local.set({ dateToComp: dateToComp });
  renderComparison();
});
document.getElementById('clearDateComp').addEventListener('click', () => {
  dateFromComp = '';
  dateToComp = '';
  document.getElementById('dateFromComp').value = '';
  document.getElementById('dateToComp').value = '';
  chrome.storage.local.set({ dateFromComp: '', dateToComp: '' });
  renderComparison();
});

document.getElementById('searchComp').addEventListener('input', (e) => {
  searchComp = e.target.value.trim();
  renderComparison();
});

document.getElementById('comparisonFilter').addEventListener('change', (e) => {
  comparisonFilter = e.target.value;
  renderComparison();
});

// ===== Init =====
loadData();

chrome.storage.local.get(['masterData'], (result) => {
  if (!result.masterData || result.masterData.length === 0) {
    // Auto-refresh if no master data
  }
});