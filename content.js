// content.js - Content script untuk scraping data dari halaman web

(function() {
  'use strict';

  function parseNumber(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
  }

  function scrapeData() {
    const data = [];
    const seen = new Set();
    const body = document.body;
    if (!body) return data;

    const text = body.innerText || body.textContent || '';

    // --- Pendekatan 1: Block regex (fleksibel) ---
    // Match: #ID DATE | STORE ... Total Rp X | Kurang Rp Y STATUS
    const blockRegex = /#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+?)(?:\s*\n|\s{2,})\s*Total\s*Rp\s*([\d.,]+)(?:\s*\|?\s*Kurang\s*Rp\s*([\d.,]+))?(?:\s*)(\S+)?/g;

    let match;
    while ((match = blockRegex.exec(text)) !== null) {
      const key = match[1] + '|' + match[2];
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({
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

    // --- Pendekatan 2: Line-by-line (jika pendekatan 1 kosong) ---
    if (data.length === 0) {
      const lines = text.split(/\r?\n/);
      let current = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Cari header: #ID DATE | STORE
        const m1 = line.match(/^#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+)$/);
        if (m1) {
          if (current && current.total !== undefined) {
            const key = current.id + '|' + current.date;
            if (!seen.has(key)) {
              seen.add(key);
              data.push(current);
            }
          }
          current = { id: m1[1], date: m1[2], store: m1[3].trim().replace(/\s+/g, ' ') };
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
            if (!seen.has(key)) {
              seen.add(key);
              data.push(current);
            }
            current = null;
          }
        }
      }
      if (current && current.total !== undefined) {
        const key = current.id + '|' + current.date;
        if (!seen.has(key)) {
          seen.add(key);
          data.push(current);
        }
      }
    }

    // --- Pendekatan 3: Cari #ID DATE dan Total Rp secara independen ---
    if (data.length === 0) {
      // Cari semua header
      const headerRegex = /#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+)/g;
      const headers = [];
      let hm;
      while ((hm = headerRegex.exec(text)) !== null) {
        headers.push({ id: hm[1], date: hm[2], store: hm[3].trim().replace(/\s+/g, ' '), index: hm.index });
      }

      // Untuk setiap header, cari Total Rp terdekat setelahnya
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        const nextIndex = (i < headers.length - 1) ? headers[i + 1].index : text.length;
        const block = text.substring(h.index, nextIndex);

        const totalMatch = block.match(/Total\s*Rp\s*([\d.,]+)/);
        if (totalMatch) {
          const key = h.id + '|' + h.date;
          if (seen.has(key)) continue;
          seen.add(key);

          const kurangMatch = block.match(/Kurang\s*Rp\s*([\d.,]+)/);
          const statusMatch = block.match(/(?:ready|pending|selesai|lunas|belum|diproses|dikirim|batal|sukses|gagal)/i);

          data.push({
            id: h.id,
            date: h.date,
            store: h.store.split(/\n/)[0].trim(),
            total: parseNumber(totalMatch[1]),
            totalStr: totalMatch[1].trim(),
            kurang: kurangMatch ? parseNumber(kurangMatch[1]) : 0,
            kurangStr: kurangMatch ? kurangMatch[1].trim() : '',
            status: statusMatch ? statusMatch[0] : ''
          });
        }
      }
    }

    // --- Pendekatan 4: DOM-based (cari elemen yang mengandung #ID dan Total Rp) ---
    if (data.length === 0) {
      // Cari semua elemen yang mengandung pola #ID DATE
      const allElements = document.querySelectorAll('*');
      const processed = new Set();
      allElements.forEach(el => {
        const elText = (el.innerText || el.textContent || '').trim();
        if (!elText || elText.length > 500) return;
        if (!elText.match(/#\d+/) || !elText.match(/Total\s*Rp/i)) return;
        // Hindari duplikat dari parent/child
        if (processed.has(elText)) return;
        processed.add(elText);

        const m = elText.match(/#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+?)(?:\s*\n|\s{2,})\s*Total\s*Rp\s*([\d.,]+)(?:\s*\|?\s*Kurang\s*Rp\s*([\d.,]+))?(?:\s*)(\S+)?/);
        if (m) {
          const key = m[1] + '|' + m[2];
          if (seen.has(key)) return;
          seen.add(key);
          data.push({
            id: m[1],
            date: m[2],
            store: m[3].trim().replace(/\s+/g, ' '),
            total: parseNumber(m[4]),
            totalStr: m[4].trim(),
            kurang: m[5] ? parseNumber(m[5]) : 0,
            kurangStr: m[5] ? m[5].trim() : '',
            status: (m[6] || '').trim()
          });
        }
      });
    }

    // Merge data dengan yang sudah ada (akumulasi dari multiple halaman)
    if (data.length > 0) {
      try {
        chrome.storage.local.get(['scrapedData'], (result) => {
          const existing = result.scrapedData || [];
          const seen = new Set(existing.map(d => d.id + '|' + d.date));
          const merged = [...existing];
          data.forEach(d => {
            const key = d.id + '|' + d.date;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(d);
            }
          });
          chrome.storage.local.set({
            scrapedData: merged,
            lastScraped: new Date().toISOString(),
            pageUrl: window.location.href,
            pageTitle: document.title
          });
          console.log('[Scraper] Total data tersimpan:', merged.length, '(baru:', data.length, ')');
        });
      } catch (e) {
        console.error('[Scraper] Storage error:', e);
      }
    }

    console.log('[Scraper] Ditemukan', data.length, 'data');
    return data;
  }

  setTimeout(scrapeData, 1500);

  let debounceTimer = null;
  let lastTextLength = 0;
  const observer = new MutationObserver(() => {
    const currentLength = (document.body && document.body.innerText) ? document.body.innerText.length : 0;
    if (currentLength === lastTextLength) return;
    lastTextLength = currentLength;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scrapeData, 2000);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    lastTextLength = document.body.innerText ? document.body.innerText.length : 0;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeData();
      sendResponse({ data: data, url: window.location.href, title: document.title });
    } else if (request.action === 'clear') {
      chrome.storage.local.remove(['scrapedData', 'lastScraped', 'pageUrl', 'pageTitle']);
      sendResponse({ success: true });
    }
    return true;
  });
})();