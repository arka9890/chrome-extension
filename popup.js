// popup.js - Logic popup extension

function parseNumber(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

function formatRupiah(num) {
  return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

let allData = [];
let pageUrl = '';
let pageTitle = '';
let dateFrom = '';
let dateTo = '';

function getFilteredData() {
  const search = document.getElementById('search').value.trim().toLowerCase();
  let filtered = allData;

  // Filter by date range
  if (dateFrom) {
    filtered = filtered.filter(d => d.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(d => d.date <= dateTo);
  }

  // Filter by search
  if (search) {
    filtered = filtered.filter(d => d.store.toLowerCase().includes(search));
  }

  return filtered;
}

function renderDateSummary() {
  const summaryDiv = document.getElementById('dateSummary');
  const listDiv = document.getElementById('dateSummaryList');
  if (allData.length === 0) {
    summaryDiv.style.display = 'none';
    return;
  }
  summaryDiv.style.display = 'block';
  listDiv.innerHTML = '';

  // Group by date
  const byDate = {};
  allData.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = { total: 0, count: 0, kurang: 0 };
    byDate[d.date].total += d.total || 0;
    byDate[d.date].kurang += d.kurang || 0;
    byDate[d.date].count++;
  });

  Object.keys(byDate).sort().reverse().forEach(date => {
    const info = byDate[date];
    const item = document.createElement('div');
    item.className = 'date-summary-item';
    item.innerHTML = `
      <span class="date-label">${escapeHtml(date)}</span>
      <span>
        <span class="date-total">${formatRupiah(info.total)}</span>
        <span class="date-count">(${info.count} data)</span>
      </span>
    `;
    listDiv.appendChild(item);
  });
}

function render() {
  const filtered = getFilteredData();

  const totalAll = filtered.reduce((sum, d) => sum + (d.total || 0), 0);
  const totalKurang = filtered.reduce((sum, d) => sum + (d.kurang || 0), 0);

  document.getElementById('totalAll').textContent = formatRupiah(totalAll);
  document.getElementById('totalKurang').textContent = formatRupiah(totalKurang);
  document.getElementById('count').textContent = filtered.length + ' data';

  const list = document.getElementById('list');
  list.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    if (allData.length === 0) {
      empty.innerHTML = 'Belum ada data.<br>Buka halaman target lalu klik ÃÂ°ÃÂÃÂÃÂ Refresh';
    } else {
      empty.innerHTML = 'Tidak ada data yang cocok dengan filter.';
    }
    list.appendChild(empty);
    return;
  }

  // Sort by date descending, then by id descending
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function exportToExcel() {
  const filtered = getFilteredData();
  if (filtered.length === 0) {
    alert('Tidak ada data untuk di-export.');
    return;
  }

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  });

  // Build CSV with BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const headers = ['ID Order', 'Tanggal', 'Nama Toko', 'Total (Rp)', 'Kurang (Rp)', 'Status'];
  const rows = sorted.map(d => [
    '#' + d.id,
    d.date,
    '"' + (d.store || '').replace(/"/g, '""') + '"',
    d.total || 0,
    d.kurang || 0,
    d.status || ''
  ]);

  const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = 'data-toko-' + dateStr + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  document.getElementById('statusText').textContent = 'Export berhasil! ' + filtered.length + ' data di-export ke CSV (buka di Excel).';
}

async function loadData() {
  try {
    const result = await chrome.storage.local.get(['scrapedData', 'lastScraped', 'pageUrl', 'pageTitle', 'dateFrom', 'dateTo']);
    allData = result.scrapedData || [];
    pageUrl = result.pageUrl || '';
    pageTitle = result.pageTitle || '';
    dateFrom = result.dateFrom || '';
    dateTo = result.dateTo || '';
    // Restore date filter inputs
    document.getElementById('dateFrom').value = dateFrom;
    document.getElementById('dateTo').value = dateTo;
    renderDateSummary();
    render();

    if (result.lastScraped) {
      const date = new Date(result.lastScraped);
      let statusText = 'Terakhir diambil: ' + date.toLocaleString('id-ID');
      if (pageTitle) statusText += ' ÃÂ¢ÃÂÃÂ¢ ' + pageTitle;
      if (allData.length > 0) statusText += ' ÃÂ¢ÃÂÃÂ¢ ' + allData.length + ' data';
      document.getElementById('statusText').textContent = statusText;
    } else {
      document.getElementById('statusText').textContent = 'Belum ada data. Buka halaman target lalu klik Refresh.';
    }
  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('statusText').textContent = 'Error: ' + e.message;
  }
}

async function refresh() {
  const btn = document.getElementById('refresh');
  btn.disabled = true;
  btn.textContent = 'ÃÂ¢ÃÂÃÂ³';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('Tidak ada tab aktif');
    }

    chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
      btn.disabled = false;
      btn.textContent = 'ÃÂ°ÃÂÃÂÃÂ';

      if (chrome.runtime.lastError) {
        document.getElementById('statusText').textContent = 'Error: ' + chrome.runtime.lastError.message + '. Reload halaman (F5) lalu coba lagi.';
        return;
      }

      if (response && response.data) {
        if (response.data.length > 0) {
          allData = response.data;
          pageUrl = response.url || '';
          pageTitle = response.title || '';
          renderDateSummary();
          render();
          document.getElementById('statusText').textContent = 'Berhasil! ' + response.data.length + ' data baru ditambahkan. Total: ' + allData.length + ' data (terakumulasi)';
        } else {
          document.getElementById('statusText').textContent = 'Tidak ada data ditemukan di halaman ini. Coba reload halaman (F5).';
        }
      } else {
        document.getElementById('statusText').textContent = 'Tidak ada respons dari content script. Reload halaman (F5).';
      }
    });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'ÃÂ°ÃÂÃÂÃÂ';
    document.getElementById('statusText').textContent = 'Error: ' + e.message;
  }
}

async function clearData() {
  if (!confirm('Hapus semua data yang tersimpan?')) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'clear' }, () => {});
    }
    await chrome.storage.local.remove(['scrapedData', 'lastScraped', 'pageUrl', 'pageTitle']);
    allData = [];
    renderDateSummary();
    render();
    document.getElementById('statusText').textContent = 'Data dihapus.';
  } catch (e) {
    console.error('Clear error:', e);
  }
}

// Event listeners
document.getElementById('search').addEventListener('input', render);
document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('clear').addEventListener('click', clearData);
document.getElementById('export').addEventListener('click', exportToExcel);
document.getElementById('dateFrom').addEventListener('change', (e) => {
  dateFrom = e.target.value;
  chrome.storage.local.set({ dateFrom: dateFrom });
  render();
});
document.getElementById('dateTo').addEventListener('change', (e) => {
  dateTo = e.target.value;
  chrome.storage.local.set({ dateTo: dateTo });
  render();
});
document.getElementById('clearDate').addEventListener('click', () => {
  dateFrom = '';
  dateTo = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  chrome.storage.local.set({ dateFrom: '', dateTo: '' });
  render();
});

// Load data saat popup dibuka
loadData();

// Auto-refresh jika belum ada data
chrome.storage.local.get(['scrapedData'], (result) => {
  if (!result.scrapedData || result.scrapedData.length === 0) {
    refresh();
  }
});