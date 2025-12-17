// @ts-nocheck

/**
 * 雨课堂考试助手 -复习查看页处理器
 * 
 * 功能说明：
 * 1. 适配 https://examination.xuetangx.com/result/* 页面
 * 2. 提取题目、选项、正确答案、解析
 * 3. 提供正常/紧凑/超紧凑布局
 * 4. 支持 AI 搜题/解析
 */

(function () {
  'use strict';

  // ============ 配置管理器 ============
  class ConfigManager {
    constructor() {
      this.appConfig = this.getDefaultConfig();
    }

    async loadAppConfig() {
      return this.appConfig;
    }

    getDefaultConfig() {
      return {
        app: { name: '雨课堂考试助手', version: '1.0.0' },
        ui: {
          colors: {
            question: {
              background: '#ffffff', toolbar: '#c8e6c9', toolbarText: '#2d5016',
              button: '#1b5e20', meta: '#666666', body: '#000000',
              optionLabel: '#1976d2', aiSuccess: '#f6ffed', aiError: '#fff2f0', aiLoading: '#e6f7ff'
            }
          }
        },
        contentProcessing: {
          imageStyles: { maxWidth: '300px', maxHeight: '150px' }
        }
      };
    }
  }

  // ============ 请求控制器 (复用) ============
  class RequestController {
    constructor() {
      this.activeQuestionIds = new Set();
      this.config = { loadingClass: 'ai-loading', errorClass: 'ai-error', resultClass: 'ai-result' };
    }

    async handleSolveQuestion(questionId, questionData, solveFunction) {
      const qId = String(questionId);
      if (this.activeQuestionIds.has(qId)) return null;
      this.activeQuestionIds.add(qId);

      try {
        this.clearOldState(qId);
        this.showLoadingUI(qId);
        const result = await solveFunction(questionData);
        this.hideLoadingUI(qId);
        this.renderSuccessUI(qId, result);
        return result;
      } catch (error) {
        this.hideLoadingUI(qId);
        this.renderErrorUI(qId, error);
        return null;
      } finally {
        this.activeQuestionIds.delete(qId);
      }
    }

    // 批量处理逻辑
    async handleSolveMultiple(questionsData, solveFunction, options = {}) {
      const { maxConcurrent = 10, onProgress } = options;
      const queue = [...questionsData];
      let running = 0;
      let completed = 0;

      return new Promise((resolve) => {
        const next = () => {
          if (queue.length === 0 && running === 0) {
            resolve();
            return;
          }
          while (running < maxConcurrent && queue.length > 0) {
            running++;
            const data = queue.shift();
            const id = data.id || data.index;
            this.handleSolveQuestion(id, data, solveFunction).finally(() => {
              running--;
              completed++;
              if (onProgress) onProgress(completed, questionsData.length);
              next();
            });
          }
        };
        next();
      });
    }

    clearOldState(qId) {
      const el = this.getQuestionElement(qId);
      if (el) el.querySelectorAll(`.${this.config.loadingClass}, .${this.config.errorClass}, .${this.config.resultClass}`).forEach(e => e.remove());
    }

    showLoadingUI(qId) {
      const el = this.getQuestionElement(qId);
      if (el) {
        const div = document.createElement('div');
        div.className = this.config.loadingClass;
        div.innerText = '⏳ 正在思考中...';
        const tools = el.querySelector('.ai-tools');
        tools ? tools.after(div) : el.appendChild(div);
      }
    }

    hideLoadingUI(qId) {
      const el = this.getQuestionElement(qId);
      if (el) {
        const loading = el.querySelector(`.${this.config.loadingClass}`);
        if (loading) loading.remove();
      }
    }

    renderSuccessUI(qId, result) {
      const el = this.getQuestionElement(qId);
      if (el) {
        const div = document.createElement('div');
        div.className = this.config.resultClass;

        // 使用 markdown-it 如果可用
        const md = window.markdownit ? window.markdownit() : null;
        const solutionHtml = md ? md.render(result.solution || '') : (result.solution || '无解答过程');

        div.innerHTML = `
          <b>AI 解答结果</b>
          <div class="answer">答案：${result.answer || '无法获取答案'}</div>
          <div class="thinking">解答过程：${solutionHtml}</div>
          ${result.duration ? `<div class="ai-duration">用时：${result.duration}s</div>` : ''}
        `;
        el.appendChild(div);

        // 渲染高亮和公式
        if (window.Prism) window.Prism.highlightAllUnder(div);
        if (window.renderMathInElement) {
          window.renderMathInElement(div, {
            delimiters: [
              { left: "$", right: "$", display: true },
              { left: "$", right: "$", display: false }
            ]
          });
        }
      }
    }

    renderErrorUI(qId, error) {
      const el = this.getQuestionElement(qId);
      if (el) {
        const div = document.createElement('div');
        div.className = this.config.errorClass;
        div.innerText = '解析失败: ' + (error.message || '未知错误');
        el.appendChild(div);
      }
    }

    getQuestionElement(qId) {
      return document.querySelector(`[data-index="${qId}"]`);
    }
  }

  // ============ 数据提取器 (针对 Result 页面) ============
  class ResultDataExtractor {
    constructor(configManager) {
      this.configManager = configManager;
    }

    async extractAll() {
      // 策略模式：尝试多种选择器
      let items = [];
      let strategy = '';

      // Strategy 1: Standard .subject-item .result_item
      const s1 = Array.from(document.querySelectorAll('.subject-item .result_item'));
      if (s1.length > 0) {
        items = s1;
        strategy = 'standard';
      } else {
        // Strategy 2: Direct .subject-item (sometimes result_item is missing or structure is flatter)
        const s2 = Array.from(document.querySelectorAll('.subject-item'));
        // Filter s2 to ensure they look like questions (have .item-body)
        const s2Valid = s2.filter(el => el.querySelector('.item-body'));
        if (s2Valid.length > 0) {
          items = s2Valid;
          strategy = 'fallback-subject-item';
        } else {
          // Strategy 3: Try finding .item-body directly and going up to parent
          const bodies = document.querySelectorAll('.item-body');
          if (bodies.length > 0) {
            const s3 = Array.from(bodies).map(b => b.parentElement).filter(p => p);
            // De-duplicate
            items = [...new Set(s3)];
            strategy = 'fallback-body-parent';
          }
        }
      }

      console.log(`[ResultHandler] Strategy: ${strategy}, match count: ${items.length}`);

      const results = [];
      let validIndex = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
          const extracted = await this.extractOne(item, validIndex);

          // 检查内容有效性
          // 弱检查：只要有 body 就算有效，或者有 options
          const hasBody = extracted.body && extracted.body !== '（题干提取失败）' && extracted.body.length > 2;
          const hasOptions = extracted.options && !extracted.options.includes('<div class="q-options"></div>');

          if (!hasBody && !hasOptions) {
            console.warn(`[ResultHandler] Skipping item ${i} (Extraction Invalid - Empty Body & Options)`);
            continue;
          }

          extracted.id = validIndex; // 重置 ID 为有效索引
          // 修正 Meta 索引：如果 meta 是 "题 1" 这种自动生成的，我们重新生成
          if (extracted.meta.match(/^题 \d+$/)) {
            extracted.meta = `题 ${validIndex + 1}`;
          }

          results.push(extracted);
          validIndex++;
        } catch (e) {
          console.error(`[ResultHandler] Error extracting item ${i}`, e);
        }
      }

      console.log(`[ResultHandler] Extracted ${results.length} valid items`);
      return results;
    }

    async extractOne(el, index) {
      // 1. Meta (Type & Score)
      // .item-type usually contains "1.多选题 (10分)"
      const typeEl = el.querySelector('.item-type');
      let meta = typeEl ? typeEl.innerText.replace(/\s+/g, ' ').trim() : `题 ${index + 1}`;

      // 2. Body
      // 优先找 custom_ueditor_cn_body，找不到找 h4，再找不到找 .item-body 的整体内容
      let bodyEl = el.querySelector('.item-body .exam-font .custom_ueditor_cn_body');
      if (!bodyEl) bodyEl = el.querySelector('.item-body h4');

      // Fallback: entire item-body but exclude options if they are inside (rare but possible)
      // Usually options are sibling to item-body or inside a separate container, but in some layouts?
      // Let's stick to .item-body if specific children missing.
      if (!bodyEl) bodyEl = el.querySelector('.item-body');

      let body = bodyEl ? await this.processContent(bodyEl) : '（题干提取失败）';

      // 3. Options
      let optionsHtml = '<div class="q-options">';
      // Expanded selectors for options
      const optSelectors = [
        '.list-unstyled-checkbox li',
        '.list-unstyled-radio li',
        '.options-list li', // hypothetical
        '.item-options li'  // hypothetical
      ];
      const optList = el.querySelectorAll(optSelectors.join(', '));

      if (optList.length > 0) {
        optList.forEach(li => {
          // Label: A, B, C...
          const labelEl = li.querySelector('.checkboxInput, .radioInput, .option-label');
          let label = labelEl ? labelEl.innerText.trim().charAt(0) : '';

          // Fallback label from first char if structure is super simple
          if (!label && li.innerText.trim().match(/^[A-Z]\./)) {
            label = li.innerText.trim().charAt(0);
          }

          // Content
          const contentEl = li.querySelector('.checkboxText .custom_ueditor_cn_body, .checkboxText, .radioText .custom_ueditor_cn_body, .radioText, .option-content');
          let content = contentEl ? contentEl.innerHTML : '';

          if (!content && label) {
            // Try to get text after label
            content = li.innerText.replace(label, '').replace(/^\./, '').trim();
          }

          // Clean up content
          if (contentEl || content) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentEl ? contentEl.innerHTML : content;
            this.fixImages(tempDiv);
            // Remove standard label if it was included in content
            content = tempDiv.innerHTML.replace(/\s+/g, ' ').trim();
          }

          // If still empty, maybe it's just an image directly in li?
          if (!content && li.querySelector('img')) {
            content = li.innerHTML;
          }

          if (label || content) {
            optionsHtml += `<div class="q-opt"><span class="q-opt-label">${label}.</span><div class="q-opt-content">${content}</div></div>`;
          }
        });
      }
      optionsHtml += '</div>';

      // 4. Correct Answer & Explanation
      // Selectors might vary.
      const footerHeader = el.querySelector('.item-footer--header, .answer-header');
      let correctAnswer = '';
      if (footerHeader) {
        correctAnswer = footerHeader.innerText.replace(/\s+/g, ' ').trim();
      }

      const footerBody = el.querySelector('.item-footer--body, .answer-analysis');
      let explanation = '';
      if (footerBody) {
        const expContent = footerBody.querySelector('.custom_ueditor_cn_body');
        if (expContent) {
          explanation = await this.processContent(expContent);
        } else {
          explanation = footerBody.innerHTML;
        }
      }

      return {
        id: index,
        meta,
        body,
        options: optionsHtml,
        correctAnswer,
        explanation
      };
    }

    async processContent(element) {
      if (!element) return '';
      const clone = element.cloneNode(true);
      // Remove useless tags
      const removeSelectors = ['.el-icon-loading', '.upload-body', '.el-checkbox__input', '.el-radio__input', '.item-type']; // Added item-type to removal if it accidentally got in
      clone.querySelectorAll(removeSelectors.join(', ')).forEach(e => e.remove());

      this.fixImages(clone);

      return clone.innerHTML.replace(/\s+/g, ' ').trim();
    }

    fixImages(root) {
      root.querySelectorAll('img').forEach(img => {
        let src = img.getAttribute('src');
        if (src && src.startsWith('//')) {
          img.src = window.location.protocol + src;
        } else if (src && !src.startsWith('http')) {
          img.src = window.location.origin + (src.startsWith('/') ? '' : '/') + src;
        }
        img.style.maxWidth = '300px';
        img.style.maxHeight = '150px';
        img.style.height = 'auto';
        img.removeAttribute('width');
        img.removeAttribute('height');
      });
    }
  }

  // ============ 渲染器 ============
  class ResultRenderer {
    constructor(data, config, aiConfig) {
      this.data = data;
      this.config = config;
      this.aiConfig = aiConfig;
    }

    render() {
      const html = this.buildHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }

    buildHTML() {
      const styles = this.getStyles();
      const scripts = this.getScripts();
      const toolbar = this.buildToolbar();
      const content = this.data.map((item, idx) => this.buildQuestionItem(item, idx)).join('');
      const modals = this.buildModals();

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>试卷解析 - ${this.config.app.name}</title>
<link rel="stylesheet" href="${chrome.runtime.getURL('libs/katex.min.css')}">
<link rel="stylesheet" href="${chrome.runtime.getURL('libs/prism-tomorrow.min.css')}">
<style>${styles}</style>
</head>
<body>
${toolbar}
<div class="q-container" id="content-area">${content}</div>
${modals}
<script src="${chrome.runtime.getURL('libs/markdown-it.min.js')}"></script>
<script src="${chrome.runtime.getURL('libs/katex.min.js')}"></script>
<script src="${chrome.runtime.getURL('libs/auto-render.min.js')}"></script>
<script src="${chrome.runtime.getURL('libs/prism.min.js')}"></script>
<script>
  window.currentAIConfig = ${JSON.stringify(this.aiConfig || {})};
</script>
<script>${scripts}</script>
</body>
</html>`;
    }

    buildToolbar() {
      return `<div class="toolbar">
        <div class="toolbar-info">${this.config.app.name} (复习模式) - 共 ${this.data.length} 题</div>
        <div class="toolbar-buttons">
          <button class="btn" onclick="setLayout('normal')">正常布局</button>
          <button class="btn" onclick="setLayout('compact')">紧凑布局</button>
          <button class="btn" onclick="setLayout('ultra')">超紧凑布局</button>
          <button class="btn" onclick="copyAll()">复制全部文本</button>
          <button class="btn" onclick="aiSolveAll()">使用AI批量解答所有题目</button>
          <button class="btn" onclick="openAIConfig()">API配置</button>
        </div>
      </div>`;
    }

    buildQuestionItem(data, index) {
      // 包含正确答案和解析显示
      const answerSection = data.correctAnswer ? `<div class="q-answer-block"><strong>${data.correctAnswer}</strong></div>` : '';
      const expSection = data.explanation ? `<div class="q-explanation-block"><div class="exp-label">解析：</div><div class="exp-content">${data.explanation}</div></div>` : '';

      return `<div class="q-item" data-index="${index}">
        <div class="q-meta">${data.meta}</div>
        <div class="q-body">${data.body}</div>
        ${data.options}
        ${answerSection}
        ${expSection}
        <div class="ai-tools">
          <button class="ai-btn" onclick="window.aiSolveOne(${index})">AI解答</button>
        </div>
      </div>`;
    }

    buildModals() {
      return `<div class="modal" id="aiConfigModal"><div class="modal-content"><h3>AI 配置</h3><div class="cfg-row"><label class="cfg-label">API URL</label><input type="text" id="aiUrl" class="cfg-input" placeholder="https://api.openai.com/v1"></div><div class="cfg-row"><label class="cfg-label">API Key</label><input type="password" id="aiKey" class="cfg-input" placeholder="sk-..."></div><div class="cfg-row"><label class="cfg-label">Model</label><input type="text" id="aiModel" class="cfg-input" placeholder="gpt-4o-mini"></div><div class="modal-buttons"><button class="btn" onclick="window.closeAIConfig()">取消</button><button class="btn" onclick="window.saveAIConfig()">保存</button></div></div></div>`;
    }

    getStyles() {
      // 复用 content.js 的样式，并增加 answer-block/explanation-block 的样式
      const c = this.config.ui.colors.question;
      return `
        body{font-family:"Microsoft YaHei",sans-serif;background:${c.background};margin:0;padding:10px;color:${c.body};font-size:14px;line-height:1.4}
        .toolbar{position:fixed;top:0;left:0;right:0;background:${c.toolbar};color:${c.toolbarText};padding:10px 20px;z-index:9999;display:flex;gap:20px;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
        .toolbar-info{font-weight:bold}
        .toolbar-buttons{display:flex;gap:10px}
        .btn{cursor:pointer;background:rgba(255,255,255,0.7);border:1px solid #81c784;padding:5px 10px;border-radius:3px}
        .btn:hover{background:white}
        .q-container{padding-top:60px;padding-bottom:20px}
        .q-item{border-bottom:1px solid #eee;padding:10px 0;margin-bottom:5px}
        .q-meta{font-weight:bold;color:${c.meta};background:#f9f9f9;padding:3px 8px;border-radius:3px;margin-bottom:5px;display:inline-block}
        .q-body{margin-bottom:5px}
        .q-body p{margin:2px 0}
        img{max-width:300px;max-height:150px;border:1px solid #eee;border-radius:3px;vertical-align:middle}
        .q-options{display:flex;flex-wrap:wrap;gap:10px 20px;margin:5px 0}
        .q-opt{display:flex;align-items:flex-start;background:#fdfdfd;padding:3px 8px;border:1px solid #f0f0f0;border-radius:3px}
        .q-opt-label{font-weight:bold;color:${c.optionLabel};margin-right:5px}
        .q-opt-content p{margin:0;display:inline}
        
        /* 复习模式特有样式 */
        .q-answer-block{margin-top:5px;padding:8px;background:#e6f7ff;border:1px solid #91d5ff;color:#0050b3;border-radius:4px;font-size:14px;font-weight:bold}
        .q-explanation-block{margin-top:5px;padding:8px;background:#fffbe6;border:1px solid #ffe58f;border-radius:4px;font-size:13px;color:#666}
        .exp-label{font-weight:bold;margin-bottom:3px;color:#d48806}
        
        /* AI Styles */
        .ai-tools{margin-top:8px}
        .ai-btn{color:#fff;border:none;background:#27ae60;padding:4px 10px;border-radius:3px;font-size:12px;cursor:pointer;font-weight:bold;box-shadow:0 2px 5px rgba(39,174,96,0.2)}
        .ai-btn:hover{background:#219150}
        .ai-result{margin-top:8px;background:#f6ffed;border:2px solid #b7eb8f;padding:10px;border-radius:4px}
        .answer{color:#135200;font-weight:bold;margin-top:4px;font-size:14px;background:rgba(82,196,26,0.1);padding:2px 5px;border-radius:3px;display:inline-block}
        .thinking{color:#555;font-size:12px;margin-top:4px;border-top:1px solid #d9d9d9;padding-top:4px}
        .ai-duration{text-align:right;color:#999;font-size:10px}
        
        /* Modal */
        .modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:20000;align-items:center;justify-content:center}
        .modal.show{display:flex}
        .modal-content{background:white;padding:20px;border-radius:8px;width:300px}
        .cfg-row{margin-bottom:10px}
        .cfg-input{width:100%;padding:5px}
        .modal-buttons{display:flex;justify-content:flex-end;gap:10px;margin-top:15px}

        /* Compact Mode */
        body.compact-mode .q-container{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
        body.compact-mode .q-item{border:1px solid #ddd;padding:5px;border-radius:4px;background:#fafafa}
        
        /* Ultra Compact */
        body.ultra-compact-mode .q-container{columns:300px}
        body.ultra-compact-mode .q-item{break-inside:avoid;border:1px solid #ddd;padding:4px;margin-bottom:5px;font-size:12px}
        body.ultra-compact-mode img{max-width:100px;max-height:50px}
        body.ultra-compact-mode .q-explanation-block{display:none} /* Hide explanation in ultra compact to save space */
      `;
    }

    getScripts() {
      // 复用 content.js 的大部分脚本逻辑，需要注入 RequestController
      return `
        // Notification Polyfill
        window.Notification = window.Notification || {};
        window.Notification.show = (msg, type) => {
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#333;color:white;padding:10px 20px;border-radius:4px;z-index:10001';
            if(type=='success') div.style.background='#27ae60';
            if(type=='error') div.style.background='#c0392b';
            div.innerText = msg;
            document.body.appendChild(div);
            setTimeout(()=>div.remove(), 3000);
        };
        window.Notification.success = (m) => window.Notification.show(m, 'success');
        window.Notification.error = (m) => window.Notification.show(m, 'error');
        window.Notification.info = (m) => window.Notification.show(m, 'info');

        // RequestController definition (copied from content.js logic essentially)
        window.requestController = {
             active: new Set(),
             handleSolveQuestion: async (id, data, fn) => {
                 const el = document.querySelector('[data-index="'+id+'"]');
                 if(!el) return;
                 // clear old
                 el.querySelectorAll('.ai-loading,.ai-error,.ai-result').forEach(n=>n.remove());
                 // loading
                 const ld = document.createElement('div');
                 ld.className='ai-loading';
                 ld.innerText='⏳ AI 思考中...';
                 const tools = el.querySelector('.ai-tools');
                 tools?tools.after(ld):el.appendChild(ld);
                 
                 try {
                     const res = await fn(data);
                     ld.remove();
                     let resDiv = document.createElement('div');
                     resDiv.className='ai-result';
                     const md = window.markdownit ? window.markdownit() : null;
                     const sol = md ? md.render(res.solution||'') : (res.solution||'');
                     resDiv.innerHTML = '<b>AI结果</b><div class="answer">答案：'+(res.answer||'')+'</div><div class="thinking">'+sol+'</div>';
                     
                     // highlight & math
                     if(window.Prism && window.Prism.highlightAllUnder) window.Prism.highlightAllUnder(resDiv);
                     if(window.renderMathInElement) {
                        window.renderMathInElement(resDiv, {delimiters:[{left:"$",right:"$",display:false}]});
                     }
                     
                     el.appendChild(resDiv);
                 } catch(e) {
                     ld.remove();
                     const err = document.createElement('div');
                     err.className='ai-error';
                     err.innerText='Error: '+e.message;
                     el.appendChild(err);
                 }
             },
             handleSolveMultiple: async (list, fn, opt) => {
                 // Simplified batch
                 for(let item of list) {
                     await window.requestController.handleSolveQuestion(item.id, item, fn);
                 }
             }
        };

        // Layout switching
        window.setLayout = (mode) => {
            document.body.className = mode === 'normal' ? '' : (mode === 'compact' ? 'compact-mode' : 'ultra-compact-mode');
        };

        // Copy
        window.copyAll = () => {
            const txt = Array.from(document.querySelectorAll('.q-item')).map((el, i) => {
                return '题'+(i+1)+'\\n' + el.querySelector('.q-body').innerText + '\\n' + el.querySelector('.q-options').innerText + '\\n答案:' + (el.querySelector('.q-answer-block')?.innerText||'无')
            }).join('\\n\\n');
            navigator.clipboard.writeText(txt).then(()=>Notification.success('复制成功'));
        };

        // AI Logic
        window.openAIConfig = () => {
            document.getElementById('aiConfigModal').classList.add('show');
            const config = window.currentAIConfig || {};
            document.getElementById('aiUrl').value = config.url || '';
            document.getElementById('aiKey').value = config.key || '';
            document.getElementById('aiModel').value = config.model || 'gpt-4o-mini';
        };
        window.closeAIConfig = () => document.getElementById('aiConfigModal').classList.remove('show');
        window.saveAIConfig = () => {
            const cfg = {
                url: document.getElementById('aiUrl').value,
                key: document.getElementById('aiKey').value,
                model: document.getElementById('aiModel').value
            };
            window.currentAIConfig = cfg; // Update local memory
            // Send message to opener to save to storage
            if (window.opener) {
                window.opener.postMessage({ type: 'SAVE_AI_CONFIG', config: cfg }, '*');
            }
            window.closeAIConfig();
            Notification.success('配置已更新 (请在原页面确认保存)');
        };

        // Solve One
        window.aiSolveOne = async (index) => {
            const config = window.currentAIConfig;
            if(!config || !config.url || !config.key) { Notification.error('请先配置 AI'); window.openAIConfig(); return; }

            const el = document.querySelector('[data-index="'+index+'"]');
            const meta = el.querySelector('.q-meta').innerText;
            const body = el.querySelector('.q-body').innerText;
            const opts = el.querySelector('.q-options').innerText;
            
            // Extract question type from meta (e.g. "1.多选题 (10分)")
            let qType = '题目';
            if (meta.includes('多选')) qType = '多选题';
            else if (meta.includes('单选')) qType = '单选题';
            else if (meta.includes('判断')) qType = '判断题';
            else if (meta.includes('填空')) qType = '填空题';
            else if (meta.includes('主观')) qType = '主观题';

            await window.requestController.handleSolveQuestion(index, {meta, body, opts}, async (data) => {
                const startTime = performance.now();
                
                const systemPrompt = '你是一个专业的题目解答助手，擅长解答各类学科题目。';
                const formatInstructions = '请严格按照以下 JSON 格式回答，不要添加任何其他文本：\\n{"answer": "答案内容（选项字母如A/B/C/D或填空内容，多选题必须列出所有正确答案，如A,B,C）", "solution": "问题的简洁清晰的解答过程"}\\n\\n特别提醒：\\n- 如果这是多选题，必须给出全部的正确答案，不要遗漏任何选项！\\n- 如果这是单选题，只需给出一个答案\\n- 如果这是主观题，请给出完整的答案内容\\n\\n格式要求说明（仅适用于 solution 字段内容）：\\n1. 如果需要输出数学公式，使用 KaTeX 兼容格式（行内公式用 $公式$，显示公式用 $公式$）\\n2. 如果需要输出代码，使用 Prism.js 兼容格式（\`\`\`语言\\\\n代码\\\\n\`\`\`）\\n3. 其他内容使用 Markdown 格式（支持标题、列表、加粗、斜体等）';
                
                // Add Question Type context
                const contentText = '题型：[' + qType + ']\\n题干：[' + data.meta + '] ' + data.body + '\\n\\n选项：\\n' + data.opts + '\\n\\n' + formatInstructions;
                
                const resp = await fetch(config.url+'/chat/completions', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer '+config.key},
                    body: JSON.stringify({
                        model: config.model || 'gpt-4o-mini',
                        messages: [{role:'system', content: systemPrompt}, {role:'user', content: contentText}],
                        temperature: 0.7
                    })
                });
                const json = await resp.json();
                if(!resp.ok) throw new Error(json.error?.message || 'Error');
                
                const txt = json.choices[0]?.message?.content || '';
                // Try parse JSON
                let result = {};
                try {
                    result = JSON.parse(txt);
                } catch(e) {
                    // Simple fallback regex
                    const fp = txt.indexOf('{');
                    const lp = txt.lastIndexOf('}');
                    if(fp>=0 && lp>fp) {
                        try { result = JSON.parse(txt.substring(fp, lp+1)); } catch(e2) {
                            result = { answer: '参考解析', solution: txt };
                        }
                    } else {
                        result = { answer: '参考解析', solution: txt };
                    }
                }
                const duration = ((performance.now()-startTime)/1000).toFixed(1);
                return { ...result, duration };
            });
        };


        // Solve All
        window.aiSolveAll = () => {
             const items = document.querySelectorAll('.q-item');
             window.requestController.handleSolveMultiple(
                 Array.from(items).map((el, i) => ({id: i})),
                 async (data) => {
                     // Normally we'd reuse aiSolveOne logic but separated for clarity in actual implementation
                     // Here we just trigger clicks to reuse aiSolveOne logic simplistically or properly implement batch
                     await window.aiSolveOne(data.id);
                 },
                 { maxConcurrent: 3 }
             );
        };
      `;
    }
  }

  // ============ 主程序入口 ============
  async function init() {
    console.log('雨课堂助手：复习模式启动');
    const configManager = new ConfigManager();
    const config = await configManager.loadAppConfig();

    // 1. 等待 DOM 加载
    // 简单检测：如果有 .result_item 则认为加载完成，或者等待一段时间
    // 更好的方式：MutationObserver 或 轮询
    let attempts = 0;
    const checkExist = setInterval(async () => {
      const items = document.querySelectorAll('.subject-item');
      if (items.length > 0 || attempts > 20) {
        clearInterval(checkExist);
        if (items.length > 0) {
          // 2. 注入浮动按钮
          createFloatingButton(configManager);
        }
      }
      attempts++;
    }, 500);
  }

  function createFloatingButton(configManager) {
    const btn = document.createElement('div');
    btn.className = 'floating-extract-btn'; // Add class for global access
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg><div style="font-size:12px;margin-top:2px;">提取</div>';
    btn.style.cssText = 'position:fixed;bottom:100px;right:20px;width:70px;height:70px;background:#27ae60;color:white;border-radius:50%;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;cursor:pointer;box-shadow:0 6px 16px rgba(39,174,96,0.5);z-index:99999;transition:transform 0.2s, box-shadow 0.2s;';

    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.1) translateY(-2px)';
      btn.style.boxShadow = '0 8px 20px rgba(39,174,96,0.6)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1) translateY(0)';
      btn.style.boxShadow = '0 6px 16px rgba(39,174,96,0.5)';
    };

    btn.onclick = async () => {
      await window.triggerExtraction(btn);
    };
    document.body.appendChild(btn);
  }

  // Define the extraction logic globally so it can be triggered by message or button
  window.triggerExtraction = async (btnElement) => {
    // Mock button if driven by message
    const btn = btnElement || document.querySelector('.floating-extract-btn') || { style: {}, innerHTML: '' };

    // Save original state if it's a real button
    const originalHTML = btn.innerHTML;
    const originalBg = btn.style.background;

    if (btnElement) {
      btn.innerHTML = '<div style="font-size:12px;">提取中...</div>';
      btn.style.background = '#2ecc71';
    }

    try {
      // Re-instantiate needed classes as they might not be stored globally
      const configManager = new ConfigManager();
      const extractor = new ResultDataExtractor(configManager);
      const data = await extractor.extractAll();

      if (data.length === 0) {
        alert('未识别到题目！\n请确认页面已完全加载，且处于试卷详情页。\n如果问题持续，可能是页面结构已更新。');
        if (btnElement) {
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg><div style="font-size:12px;margin-top:2px;">提取</div>';
          btn.style.background = '#e74c3c';
          setTimeout(() => { btn.style.background = '#27ae60'; }, 3000);
        }
        return;
      }

      const config = await configManager.loadAppConfig();
      const aiConfig = await new Promise(resolve => chrome.storage.local.get(['aiConfig'], res => resolve(res.aiConfig || {})));

      const renderer = new ResultRenderer(data, config, aiConfig);
      renderer.render();

      if (btnElement) {
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg><div style="font-size:12px;margin-top:2px;">提取</div>';
        btn.style.background = '#27ae60';
      }
    } catch (err) {
      console.error(err);
      alert('提取过程发生错误：' + err.message);
      if (btnElement) {
        btn.innerHTML = '重试';
        btn.style.background = '#e74c3c';
      }
    }
  };

  // Listen for config save requests AND extraction triggers
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SAVE_AI_CONFIG') {
      chrome.storage.local.set({ aiConfig: event.data.config }, () => {
        console.log('AI Config saved via postMessage');
      });
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TRIGGER_RESULT_EXTRACT') {
      // Find the button to animate it if possible, or just run logic
      // We intentionally added a class or just pass null
      // Since createFloatingButton creates a div without class, let's fix that or just pass null.
      // ideally we find the button to show feedback on it.
      // But since the button is created in a closure and not active globally...
      // Let's assume the user clicked the extension icon, so maybe no need to animate the floating button?
      // Actually, feedback is good.
      // Let's just run the logic.
      window.triggerExtraction(null);
    }
  });


  init();

})();
