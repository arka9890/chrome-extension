// content.js - Content script untuk scraping data dari halaman web
// Mendukung 2 format: Master (website 1) dan Compare (website 2)

(function() {
  'use strict';

  function parseNumber(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
  }

  // Deteksi format halaman
  function detectFormat(text) {
    if (text.includes('System Invoice')) return 'compare';
    if (text.match(/#\d+\s+\d{4}-\d{2}-\d{2}\s*\|/)) return 'master';
    if (text.match(/Total\s*Rp/)) return 'master';
    return 'unknown';
  }

  // Scrape format Master (website 1)
  // #84032 2026-10-29 | Azfar Jaya Abadi H.Unub
  // Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
  function scrapeMaster(text) {
    const data = [];
    const seen = new Set();

    const blockRegex = /#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+?)(?:\s*\n|\s{2,})\s*Total\s*Rp\s*([\d.,]+)(?:\s*\|?\s*Kurang\s*Rp\s*([\d.,]+))?(?:\s*)(\S+)?/g;
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
      const key = match[1] + '|' + match[2];
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({
        source: 'master',
        id: match[1],
        date: match[2],
        store: match[3].trim().replace(/\s+/g, ' '),
        total: parseNumber(match[4]),
        totalStr: match[4].trim(),
        kurang: match[5] ? parseNumber(match[5]) : 0,
        kurangStr: match[5] ? match[5].trim() : '',
        status: (match[6] || '').trim()
      });
    }

    if (data.length === 0) {
      const lines = text.split(/\r?\n/);
      let current = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const m1 = line.match(/^#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+)$/);
        if (m1) {
          if (current && current.total !== undefined) {
            const key = current.id + '|' + current.date;
            if (!seen.has(key)) { seen.add(key); data.push(current); }
          }
          current = { source: 'master', id: m1[1], date: m1[2], store: m1[3].trim().replace(/\s+/g, ' ') };
          continue;
        }
        if (current) {
          const m2 = line.match(/Total\s*Rp\s*([\d.,]+)\s*\|?\s*Kurang\s*Rp\s*([\d.,]+)\s*(\S+)?/);
          if (m2) {
            current.total = parseNumber(m2[1]);
            current.totalStr = m2[1].trim();
            current.kurang = parseNumber(m2[2]);
            current.kurangStr = m2[2].trim();
            current.status = m2[3] ? m2[3].trim() : '';
            const key = current.id + '|' + current.date;
            if (!seen.has(key)) { seen.add(key); data.push(current); }
            current = null;
          }
        }
      }
      if (current && current.total !== undefined) {
        const key = current.id + '|' + current.date;
        if (!seen.has(key)) { seen.add(key); data.push(current); }
      }
    }

    return data;
  }

  // Scrape format Compare (website 2)
  // 10906  2026-10-29 21:32:05   System Invoice #84030  Rp1,239,580  Completed
  function scrapeCompare(text) {
    const data = [];
    const seen = new Set();

    // Regex: txnId  date time  ... System Invoice #invoiceId  Rp amount  status
    const regex = /(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+.*?System\s+Invoice\s+#(\d+)\s+Rp([\d.,]+)\s+(\w+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const invoiceId = match[4];
      if (seen.has(invoiceId)) continue;
      seen.add(invoiceId);
      data.push({
        source: 'compare',
        txnId: match[1],
        date: match[2],
        time: match[3],
        invoiceId: invoiceId,
        amount: parseNumber(match[5]),
        amountStr: match[5].trim(),
        status: match[6].trim()
      });
    }

    // Fallback: line-by-line
    if (data.length === 0) {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.includes('System Invoice')) continue;
        const m = trimmed.match(/(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
        const inv = trimmed.match(/System\s+Invoice\s+#(\d+)/);
        const amt = trimmed.match(/Rp([\d.,]+)/);
        const stat = trimmed.match(/(Completed|Pending|Failed|Cancelled|Success)/i);
        if (m && inv) {
          const invoiceId = inv[1];
          if (seen.has(invoiceId)) continue;
          seen.add(invoiceId);
          data.push({
            source: 'compare',
            txnId: m[1],
            date: m[2],
            time: m[3],
            invoiceId: invoiceId,
            amount: amt ? parseNumber(amt[1]) : 0,
            amountStr: amt ? amt[1].trim() : '',
            status: stat ? stat[1] : ''
          });
        }
      }
    }

    return data;
  }

  // Fungsi utama scraping
  function scrapeData() {
    const body = document.body;
    if (!body) return [];
    const text = body.innerText || body.textContent || '';
    const format = detectFormat(text);

    let data = [];
    if (format === 'compare') {
      data = scrapeCompare(text);
    } else {
      data = scrapeMaster(text);
    }

    console.log('[Scraper] Format:', format, '| Ditemukan:', data.length, 'data');

    // Simpan ke storage berdasarkan source
    if (data.length > 0) {
      try {
        const storageKey = format === 'compare' ? 'compareData' : 'masterData';
        chrome.storage.local.get([storageKey], (result) => {
          const existing = result[storageKey] || [];
          const seen = new Set();
          if (format === 'compare') {
            existing.forEach(d => seen.add(d.invoiceId));
          } else {
            existing.forEach(d => seen.add(d.id + '|' + d.date));
          }
          const merged = [...existing];
          data.forEach(d => {
            const key = format === 'compare' ? d.invoiceId : (d.id + '|' + d.date);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(d);
            }
          });
          const update = {};
          update[storageKey] = merged;
          update.lastScraped = new Date().toISOString();
          update.pageUrl = window.location.href;
          update.pageTitle = document.title;
          update.lastFormat = format;
          chrome.storage.local.set(update);
          console.log('[Scraper] Total', storageKey, 'tersimpan:', merged.length);
        });
      } catch (e) {
        console.error('[Scraper] Storage error:', e);
      }
    }

    return data;
  }

  // Retry scrape
  let scrapeAttempts = 0;
  const maxAttempts = 5;
  function tryScrape() {
    scrapeAttempts++;
    const data = scrapeData();
    if (data.length === 0 && scrapeAttempts < maxAttempts) {
      setTimeout(tryScrape, 2000);
    }
  }
  setTimeout(tryScrape, 1500);

  // Deteksi perubahan URL
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      scrapeAttempts = 0;
      setTimeout(tryScrape, 1500);
    }
  });
  if (document.body) urlObserver.observe(document.body, { childList: true, subtree: true });

  // Re-scrape saat DOM berubah
  let debounceTimer = null;
  let lastTextLength = 0;
  const observer = new MutationObserver(() => {
    const currentLength = (document.body && document.body.innerText) ? document.body.innerText.length : 0;
    if (currentLength === lastTextLength) return;
    lastTextLength = currentLength;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { scrapeData(); }, 2000);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    lastTextLength = document.body.innerText ? document.body.innerText.length : 0;
  }

  // Periodic re-scrape
  setInterval(() => { scrapeData(); }, 10000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeData();
      sendResponse({ data: data, url: window.location.href, title: document.title, format: detectFormat(document.body ? (document.body.innerText || '') : '') });
    } else if (request.action === 'clear') {
      chrome.storage.local.remove(['masterData', 'compareData', 'lastScraped', 'pageUrl', 'pageTitle', 'lastFormat']);
      sendResponse({ success: true });
    } else if (request.action === 'clearMaster') {
      chrome.storage.local.remove(['masterData']);
      sendResponse({ success: true });
    } else if (request.action === 'clearCompare') {
      chrome.storage.local.remove(['compareData']);
      sendResponse({ success: true });
    }
    return true;
  });
})();