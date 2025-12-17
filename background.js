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
      // 先注入 content.js（如果还未注入）
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.js']
      }, () => {
        // 然后执行 init 函数
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          function: () => {
            if (typeof window.__YKT_INIT__ === 'function') {
              window.__YKT_INIT__();
            } else {
              console.warn('⚠️ 插件初始化函数未找到，请刷新页面后重试');
            }
          }
        });
      });
    } else {
      console.log('请在雨课堂页面使用此插件');
    }
  } catch (e) {
    console.error('执行脚本失败:', e);
  }
});