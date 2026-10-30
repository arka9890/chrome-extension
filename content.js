// content.js - Content script untuk scraping data dari halaman web

(function() {
  'use strict';

  function parseNumber(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
  }

  function scrapeData() {
    const data = [];
    const body = document.body;
    if (!body) return data;

    const text = body.innerText || '';

    const regex = /#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+?)\s*\n\s*Total\s*Rp\s*([\d.,]+)\s*\|?\s*Kurang\s*Rp\s*([\d.,]+)\s*(\S+)?/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      data.push({
        id: match[1],
        date: match[2],
        store: match[3].trim(),
        total: parseNumber(match[4]),
        totalStr: match[4].trim(),
        kurang: parseNumber(match[5]),
        kurangStr: match[5].trim(),
        status: (match[6] || '').trim()
      });
    }

    if (data.length === 0) {
      const lines = text.split(/\n/);
      let current = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const m1 = line.match(/^#(\d+)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.+)$/);
        if (m1) {
          if (current && current.total !== undefined) {
            data.push(current);
          }
          current = { id: m1[1], date: m1[2], store: m1[3].trim() };
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
            data.push(current);
            current = null;
          }
        }
      }
      if (current && current.total !== undefined) {
        data.push(current);
      }
    }

    if (data.length > 0) {
      try {
        chrome.storage.local.set({
          scrapedData: data,
          lastScraped: new Date().toISOString(),
          pageUrl: window.location.href,
          pageTitle: document.title
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