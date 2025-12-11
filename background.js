// ============ 插件按钮点击处理 ============
chrome.action.onClicked.addListener((tab) => {
  try {
    const url = tab?.url || '';
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