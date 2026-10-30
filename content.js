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

    // Pendekatan 1: Regex pada full text (fleksibel untuk tab/spasi)
    // Cari pola: System Invoice #ID ... Rp AMOUNT ... STATUS
    const regex1 = /System\s+Invoice\s+#(\d+)/g;
    let m1;
    while ((m1 = regex1.exec(text)) !== null) {
      const invoiceId = m1[1];
      if (seen.has(invoiceId)) continue;

      // Cari konteks di sekitar invoice ID (200 karakter sebelum dan sesudah)
      const idx = m1.index;
      const start = Math.max(0, idx - 200);
      const end = Math.min(text.length, idx + 200);
      const context = text.substring(start, end);

      // Cari tanggal di konteks (sebelum System Invoice)
      const beforeInv = text.substring(Math.max(0, idx - 200), idx);
      const dateMatch = beforeInv.match(/(\d{4}-\d{2}-\d{2})/);
      const timeMatch = beforeInv.match(/(\d{2}:\d{2}:\d{2})/);

      // Cari txnId (angka di awal baris/konteks)
      const txnMatch = beforeInv.match(/(\d{4,})/);

      // Cari amount: Rp diikuti angka (dengan atau tanpa spasi)
      const amtMatch = context.match(/Rp\s*([\d.,]+)/);

      // Cari status
      const statMatch = context.match(/(Completed|Pending|Failed|Cancelled|Success|Processing|Done)/i);

      if (dateMatch) {
        seen.add(invoiceId);
        data.push({
          source: 'compare',
          txnId: txnMatch ? txnMatch[1] : '',
          date: dateMatch[1],
          time: timeMatch ? timeMatch[1] : '',
          invoiceId: invoiceId,
          amount: amtMatch ? parseNumber(amtMatch[1]) : 0,
          amountStr: amtMatch ? amtMatch[1].trim() : '',
          status: statMatch ? statMatch[1] : ''
        });
      }
    }

    // Pendekatan 2: Line-by-line (jika pendekatan 1 kosong)
    if (data.length === 0) {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.includes('System Invoice')) continue;

        const inv = trimmed.match(/System\s+Invoice\s+#(\d+)/);
        if (!inv) continue;
        const invoiceId = inv[1];
        if (seen.has(invoiceId)) continue;

        const dateM = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
        const timeM = trimmed.match(/(\d{2}:\d{2}:\d{2})/);
        const amtM = trimmed.match(/Rp\s*([\d.,]+)/);
        const statM = trimmed.match(/(Completed|Pending|Failed|Cancelled|Success|Processing|Done)/i);

        // txnId: angka pertama di line (sebelum tanggal)
        const txnM = trimmed.match(/^(\d+)/);

        if (dateM) {
          seen.add(invoiceId);
          data.push({
            source: 'compare',
            txnId: txnM ? txnM[1] : '',
            date: dateM[1],
            time: timeM ? timeM[1] : '',
            invoiceId: invoiceId,
            amount: amtM ? parseNumber(amtM[1]) : 0,
            amountStr: amtM ? amtM[1].trim() : '',
            status: statM ? statM[1] : ''
          });
        }
      }
    }

    // Pendekatan 3: DOM-based (cari elemen tabel/baris yang mengandung System Invoice)
    if (data.length === 0) {
      const allElements = document.querySelectorAll('tr, div, span, td, li');
      const processed = new Set();
      allElements.forEach(el => {
        const elText = (el.innerText || el.textContent || '').trim();
        if (!elText || elText.length > 300 || elText.length < 20) return;
        if (!elText.includes('System Invoice')) return;
        if (processed.has(elText)) return;
        processed.add(elText);

        const inv = elText.match(/System\s+Invoice\s+#(\d+)/);
        if (!inv) return;
        const invoiceId = inv[1];
        if (seen.has(invoiceId)) return;

        const dateM = elText.match(/(\d{4}-\d{2}-\d{2})/);
        const timeM = elText.match(/(\d{2}:\d{2}:\d{2})/);
        const amtM = elText.match(/Rp\s*([\d.,]+)/);
        const statM = elText.match(/(Completed|Pending|Failed|Cancelled|Success|Processing|Done)/i);
        const txnM = elText.match(/^(\d+)/);

        if (dateM) {
          seen.add(invoiceId);
          data.push({
            source: 'compare',
            txnId: txnM ? txnM[1] : '',
            date: dateM[1],
            time: timeM ? timeM[1] : '',
            invoiceId: invoiceId,
            amount: amtM ? parseNumber(amtM[1]) : 0,
            amountStr: amtM ? amtM[1].trim() : '',
            status: statM ? statM[1] : ''
          });
        }
      });
    }

    console.log('[Scraper Compare] Ditemukan:', data.length, 'data');
    if (data.length > 0) {
      console.log('[Scraper Compare] Contoh:', JSON.stringify(data[0]));
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