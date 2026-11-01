// @ts-nocheck

(function () {
  'use strict';

  if (window.__YKT_PROMPT_IO__) return;
  window.__YKT_PROMPT_IO__ = true;

  const IMPORT_MESSAGE_TYPE = 'YKT_IMPORT_SOLVE_RESULTS';

  function notify(type, message) {
    const api = window.Notification;
    if (api && typeof api[type] === 'function') {
      api[type](message);
      return;
    }
    console.log(`[${type}] ${message}`);
  }

  function getPromptQuestions() {
    return Array.from(document.querySelectorAll('.q-item')).map((item, index) => {
      const options = Array.from(item.querySelectorAll('.q-opt')).map((opt) => ({
        label: (opt.querySelector('.q-opt-label')?.innerText || '').replace(/\.$/, '').trim(),
        text: opt.querySelector('.q-opt-content')?.innerText.trim() || opt.innerText.trim()
      }));

      return {
        id: index,
        meta: item.querySelector('.q-meta')?.innerText.trim() || '',
        type: inferQuestionType(item),
        body: item.querySelector('.q-body')?.innerText.trim() || '',
        options,
        images: Array.from(item.querySelectorAll('img')).map((img, imgIndex) => ({
          index: imgIndex,
          src: img.currentSrc || img.src || img.getAttribute('src') || ''
        }))
      };
    });
  }

  function inferQuestionType(item) {
    const meta = item.querySelector('.q-meta')?.innerText || '';
    const text = item.innerText || '';
    if (/主观题|问答题|简答题|论述题|分析题|作文题/.test(meta + text)) return 'subjective';
    if (/填空题/.test(meta + text)) return 'blank';
    if (/判断题/.test(meta + text)) return 'judgement';
    if (/多选题/.test(meta + text)) return 'multiple_choice';
    if (/单选题/.test(meta + text)) return 'single_choice';
    return 'unknown';
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function mapWithConcurrency(items, limit, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  async function imageToPromptImage(image) {
    if (!image.src) return image;
    if (image.src.indexOf('data:') === 0) return Object.assign({}, image, { dataUrl: image.src });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(image.src, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.size > 12 * 1024 * 1024) throw new Error('图片超过 12 MB，已跳过');
      return Object.assign({}, image, {
        mimeType: blob.type || '',
        dataUrl: await blobToDataUrl(blob)
      });
    } catch (error) {
      return Object.assign({}, image, { error: error.message || String(error) });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function attachPromptImages(questions) {
    const tasks = [];
    questions.forEach((question, questionIndex) => {
      (question.images || []).forEach((image, imageIndex) => {
        tasks.push({ questionIndex, imageIndex, image });
      });
    });
    const converted = await mapWithConcurrency(tasks, 3, task => imageToPromptImage(task.image));
    converted.forEach((image, index) => {
      const task = tasks[index];
      questions[task.questionIndex].images[task.imageIndex] = image;
    });
    return questions;
  }

  async function copyTextWithFallback(text, title) {
    const old = document.getElementById('promptExportModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'promptExportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:30000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#fff;width:min(980px,92vw);height:min(680px,84vh);padding:16px;border-radius:6px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3);"><h3 style="margin:0 0 10px;">' + title + '</h3><textarea id="promptExportText" style="flex:1;width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;"></textarea><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;"><button class="btn" id="closePromptExport">关闭</button><button class="btn" id="copyPromptExport">复制</button></div></div>';
    document.body.appendChild(modal);

    const textarea = document.getElementById('promptExportText');
    textarea.value = text;
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (error) {
      console.warn('Clipboard API 复制失败，使用兜底复制', error);
    }

    if (!copied) {
      try {
        copied = document.execCommand('copy');
      } catch (error) {
        copied = false;
      }
    }

    document.getElementById('closePromptExport').onclick = () => modal.remove();
    document.getElementById('copyPromptExport').onclick = async () => {
      textarea.focus();
      textarea.select();
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          notify('success', '已复制 Prompt');
        } else if (document.execCommand('copy')) {
          notify('success', '已复制 Prompt');
        } else {
          notify('info', '请使用 Ctrl/Cmd+C 手动复制');
        }
      } catch (error) {
        notify('info', '请使用 Ctrl/Cmd+C 手动复制');
      }
    };

    return copied;
  }

  function buildSolvePrompt(questions) {
    const schema = {
      results: [
        {
          id: 0,
          answer: '选择题填选项字母，如 A 或 A,B；判断题填 T/F；填空题按空依次给出；主观题填可直接粘贴到答题框的完整答案纯文本',
          solution: '解析或补充说明。主观题这里也请给可直接粘贴的纯文本答案，不要 Markdown'
        }
      ]
    };
    const payload = { schema, questions };

    return [
      '请解答下面 JSON 中的所有题目。',
      '必须严格只返回一个 JSON 对象，不要使用 Markdown 代码块，不要添加解释性前后缀。',
      '返回格式必须符合以下 schema：',
      JSON.stringify(schema, null, 2),
      '填写规则：',
      '1. 单选题/多选题：answer 只写选项字母，例如 "A" 或 "A,C"。',
      '2. 判断题：answer 只写 "T" 或 "F"。',
      '3. 填空题：answer 按空依次给出，多个空用空格分隔。',
      '4. 主观题：answer 必须是能直接粘贴进雨课堂富文本答题框的完整纯文本答案；solution 也使用同一份纯文本或简短补充。不要 Markdown 标题、项目符号、代码块、加粗标记或 LaTeX 包裹符号。',
      '5. 主观题排版：按正常手打答案分段；每个要点一段，段间用换行；不要写“答案如下”“解析如下”等前缀。',
      '题目数据如下，images[].dataUrl 为图片的 base64 data URL：',
      JSON.stringify(payload, null, 2),
      '再次确认：只返回 JSON，格式为 {"results":[{"id":题目id,"answer":"...","solution":"..."}]}。results 必须覆盖全部题目。'
    ].join('\n\n');
  }

  async function exportPrompt() {
    try {
      const questions = await attachPromptImages(getPromptQuestions());
      const promptText = buildSolvePrompt(questions);
      const copied = await copyTextWithFallback(promptText, '导出 Prompt');
      notify(copied ? 'success' : 'info', copied ? `Prompt 已复制，共 ${questions.length} 题` : 'Prompt 已生成，请在弹窗中手动复制');
    } catch (error) {
      notify('error', `导出 Prompt 失败：${error?.message || String(error)}`);
    }
  }

  function extractJsonText(text) {
    let clean = String(text || '').trim();
    const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) clean = fenced[1].trim();

    const firstObject = clean.indexOf('{');
    const lastObject = clean.lastIndexOf('}');
    const firstArray = clean.indexOf('[');
    const lastArray = clean.lastIndexOf(']');
    if (firstObject >= 0 && lastObject > firstObject) return clean.slice(firstObject, lastObject + 1);
    if (firstArray >= 0 && lastArray > firstArray) return clean.slice(firstArray, lastArray + 1);
    return clean;
  }

  function normalizeImportedResults(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.results)) return parsed.results;
    if (Array.isArray(parsed?.answers)) return parsed.answers;

    if (parsed && typeof parsed === 'object') {
      return Object.keys(parsed).map((key) => {
        const value = parsed[key];
        if (value && typeof value === 'object') return Object.assign({ id: key }, value);
        return { id: key, answer: String(value), solution: '' };
      });
    }

    return [];
  }

  function parseImportedResultsText(text) {
    const jsonText = extractJsonText(text);

    try {
      return normalizeImportedResults(JSON.parse(jsonText));
    } catch (error) {
      const results = [];
      const pattern = /\{\s*"id"\s*:\s*(\d+)\s*,\s*"answer"\s*:\s*"([\s\S]*?)"\s*,\s*"solution"\s*:\s*"([\s\S]*?)"\s*\}/g;
      let match;

      while ((match = pattern.exec(jsonText))) {
        results.push({
          id: Number(match[1]),
          answer: match[2].replace(/\\n/g, '\n').trim(),
          solution: match[3].replace(/\\n/g, '\n').trim()
        });
      }

      if (results.length > 0) return results;
      throw error;
    }
  }

  function renderImportedResult(id, result) {
    const numericId = Number(id);
    const item = document.querySelector(`[data-index="${numericId}"]`);
    if (!item) return false;

    item.querySelectorAll('.ai-loading,.ai-error,.ai-result').forEach(node => node.remove());
    const container = document.createElement('div');
    container.className = 'ai-result';

    const answer = result.answer || result.result || '';
    const solution = result.solution || result.explanation || result.reason || '';
    const md = window.markdownit ? window.markdownit({ html: false }) : null;
    const solutionHtml = md ? md.render(String(solution || '')) : String(solution || '');

    const heading = document.createElement('b');
    heading.textContent = 'AI解答结果';
    const answerNode = document.createElement('div');
    answerNode.className = 'answer';
    answerNode.textContent = '答案：' + String(answer);
    const thinking = document.createElement('div');
    thinking.className = 'thinking';
    const label = document.createElement('span');
    label.textContent = '解答过程：';
    const solutionNode = document.createElement('div');
    if (md) solutionNode.innerHTML = solutionHtml;
    else solutionNode.textContent = String(solution || '');
    thinking.append(label, solutionNode);
    container.append(heading, answerNode, thinking);
    item.appendChild(container);

    if (window.Prism && window.Prism.highlightAllUnder) window.Prism.highlightAllUnder(container);
    if (window.renderMathInElement) {
      window.renderMathInElement(container, {
        delimiters: [
          { left: '$', right: '$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ]
      });
    }

    return true;
  }

  function sendImportedResultsToOpener(results) {
    if (!window.opener || window.opener.closed) return false;

    window.opener.postMessage({
      type: IMPORT_MESSAGE_TYPE,
      results,
      source: 'yuketang-assistant'
    }, window.location.origin);
    return true;
  }

  function openImportDialog() {
    const old = document.getElementById('importResultsModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'importResultsModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:30000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#fff;width:min(900px,90vw);height:min(620px,80vh);padding:16px;border-radius:6px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3);"><h3 style="margin:0 0 10px;">导入解题结果 JSON</h3><textarea id="importResultsText" style="flex:1;width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;"></textarea><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;"><button class="btn" id="cancelImportResults">取消</button><button class="btn" id="confirmImportResults">导入并填入原页面</button></div></div>';
    document.body.appendChild(modal);

    document.getElementById('cancelImportResults').onclick = () => modal.remove();
    document.getElementById('confirmImportResults').onclick = () => {
      try {
        const raw = document.getElementById('importResultsText').value;
        if (raw.length > 2000000) throw new Error('导入内容超过 2 MB 限制');
        const results = parseImportedResultsText(raw);
        if (results.length > 500) throw new Error('一次最多导入 500 道题');
        results.forEach((result, index) => {
          if (!result || typeof result !== 'object') throw new Error(`第 ${index + 1} 条结果格式无效`);
          const answer = String(result.answer ?? result.result ?? '');
          const solution = String(result.solution ?? result.explanation ?? result.reason ?? '');
          if (answer.length > 20000 || solution.length > 100000) {
            throw new Error(`第 ${index + 1} 条结果内容过长`);
          }
        });
        let imported = 0;

        results.forEach((result, index) => {
          const id = result.id ?? result.index ?? result.questionId ?? result.no ?? index;
          if (renderImportedResult(id, result)) imported++;
        });

        const sent = sendImportedResultsToOpener(results);
        modal.remove();
        notify('success', sent ? `已导入 ${imported} 条，并发送到原页面填入` : `已导入 ${imported} 条；未找到原页面窗口`);
      } catch (error) {
        notify('error', `导入失败：${error?.message || String(error)}`);
      }
    };
  }

  function importSolveResults() {
    openImportDialog();
  }

  window.YktPromptIO = {
    exportPrompt,
    importSolveResults,
    parseImportedResultsText,
    sendImportedResultsToOpener,
    getPromptQuestions,
    buildSolvePrompt
  };
  window.exportPrompt = exportPrompt;
  window.importSolveResults = importSolveResults;
})();
