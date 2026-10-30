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

function render() {
  const search = document.getElementById('search').value.trim().toLowerCase();
  const filtered = search
    ? allData.filter(d => d.store.toLowerCase().includes(search))
    : allData;

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
      empty.innerHTML = 'Belum ada data.<br>Buka halaman target lalu klik 🔄 Refresh';
    } else {
      empty.innerHTML = 'Tidak ada data yang cocok dengan pencarian.';
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadData() {
  try {
    const result = await chrome.storage.local.get(['scrapedData', 'lastScraped', 'pageUrl', 'pageTitle']);
    allData = result.scrapedData || [];
    pageUrl = result.pageUrl || '';
    pageTitle = result.pageTitle || '';
    render();

    if (result.lastScraped) {
      const date = new Date(result.lastScraped);
      let statusText = 'Terakhir diambil: ' + date.toLocaleString('id-ID');
      if (pageTitle) statusText += ' • ' + pageTitle;
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
  btn.textContent = '⏳';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('Tidak ada tab aktif');
    }

    chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
      btn.disabled = false;
      btn.textContent = '🔄';

      if (chrome.runtime.lastError) {
        document.getElementById('statusText').textContent = 'Error: ' + chrome.runtime.lastError.message + '. Reload halaman (F5) lalu coba lagi.';
        return;
      }

      if (response && response.data) {
        if (response.data.length > 0) {
          allData = response.data;
          pageUrl = response.url || '';
          pageTitle = response.title || '';
          render();
          document.getElementById('statusText').textContent = 'Berhasil! ' + response.data.length + ' data dari ' + (response.title || response.url);
        } else {
          document.getElementById('statusText').textContent = 'Tidak ada data ditemukan di halaman ini.';
        }
      } else {
        document.getElementById('statusText').textContent = 'Tidak ada respons dari content script.';
      }
    });
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '🔄';
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
    render();
    document.getElementById('statusText').textContent = 'Data dihapus.';
  } catch (e) {
    console.error('Clear error:', e);
  }
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('clear').addEventListener('click', clearData);

loadData();

chrome.storage.local.get(['scrapedData'], (result) => {
  if (!result.scrapedData || result.scrapedData.length === 0) {
    refresh();
  }
});