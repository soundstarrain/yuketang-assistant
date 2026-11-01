// ============ 插件按钮点击处理 ============
chrome.action.onClicked.addListener((tab) => {
  try {
    const url = tab?.url || '';

    // Check for Result Page (Review Mode)
    if (url.includes('examination.xuetangx.com/result/')) {
      // Send message to result_handler.js
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_RESULT_EXTRACT' }).catch(err => {
        console.warn('Is result_handler.js active?', err);
        // Fallback: If not active, maybe inject it? Or alert user to reload.
        // Since it is a content script defined in manifest, strictly it should be there.
        // But if user just installed/reloaded extension, they might need to reload page.
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          function: () => { alert('请刷新此页面以启用插件功能'); }
        });
      });
      return;
    }

    if (url.includes('yuketang.cn') || url.includes('xuetangx.com')) {
      // 先注入页面桥接和主入口（如果还未注入）
      const initializePage = () => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          function: () => {
            if (typeof window.__YKT_INIT__ === 'function') {
              window.__YKT_INIT__();
            } else {
              console.warn('⚠️ 插件初始化函数未找到，请刷新页面后重试');
            }
          }
        });
      };

      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        function: () => typeof window.__YKT_INIT__ === 'function'
      }, results => {
        if (chrome.runtime.lastError) return;
        if (results?.[0]?.result) {
          initializePage();
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          files: ['answer_filler.js', 'content.js']
        }, () => {
          if (!chrome.runtime.lastError) initializePage();
        });
      });
    } else {
      console.log('请在雨课堂页面使用此插件');
    }
  } catch (e) {
    console.error('执行脚本失败:', e);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'YKT_FETCH_ARRAY_BUFFER' || !message.url) return false;
  if (sender?.id !== chrome.runtime.id || String(message.url).length > 2048) {
    sendResponse({ ok: false, error: 'Invalid request' });
    return false;
  }

  let url;
  try {
    url = new URL(message.url);
    const allowedHost = /(^|\.)yuketang\.cn$/.test(url.hostname) || /(^|\.)xuetangx\.com$/.test(url.hostname);
    const allowedFont = /\/exam_font_[^/]+\.(ttf|otf|woff2?|eot)$/i.test(url.pathname);
    const sourceUrl = sender.tab?.url ? new URL(sender.tab.url) : null;
    const sourceAllowed = Boolean(sourceUrl && (
      /(^|\.)yuketang\.cn$/.test(sourceUrl.hostname) ||
      /(^|\.)xuetangx\.com$/.test(sourceUrl.hostname)
    ));
    if (!allowedHost || !allowedFont || !sourceAllowed) throw new Error('URL not allowed');
  } catch (error) {
    sendResponse({ ok: false, error: error.message || String(error) });
    return false;
  }

  fetch(url.href)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const length = Number(response.headers.get('content-length') || 0);
      if (length > 32 * 1024 * 1024) throw new Error('字体文件过大');
      return response.arrayBuffer();
    })
    .then(buffer => {
      if (buffer.byteLength > 32 * 1024 * 1024) throw new Error('字体文件过大');
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      sendResponse({ ok: true, base64: btoa(binary) });
    })
    .catch(error => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });

  return true;
});
