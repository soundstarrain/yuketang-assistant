// @ts-nocheck

(function () {
  'use strict';

  if (window.__YKT_ANSWER_FILLER__) return;
  window.__YKT_ANSWER_FILLER__ = true;

  const IMPORT_MESSAGE_TYPE = 'YKT_IMPORT_SOLVE_RESULTS';
  const SWITCH_DELAY = 450;
  const MAX_WAIT_TIME = 5000;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function showToast(message, type = 'info', duration = 3500) {
    const old = document.getElementById('ykt-answer-filler-toast');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'ykt-answer-filler-toast';
    const bg = type === 'success' ? '#27ae60' : type === 'error' ? '#c0392b' : '#0050b3';
    el.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      `background:${bg}`,
      'color:#fff',
      'padding:12px 16px',
      'border-radius:4px',
      'box-shadow:0 6px 18px rgba(0,0,0,.18)',
      'z-index:2147483647',
      'font-size:14px',
      'line-height:1.4',
      'max-width:420px'
    ].join(';');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  function normalizeResults(input) {
    if (Array.isArray(input)) return input;
    if (Array.isArray(input?.results)) return input.results;
    if (Array.isArray(input?.answers)) return input.answers;
    return [];
  }

  function getResultAnswer(result) {
    const answer = result?.answer ?? result?.result ?? result?.value ?? '';
    return Array.isArray(answer) ? answer.join(' ') : String(answer || '').trim();
  }

  function getResultOrder(result, fallbackIndex) {
    const explicit = result?.order ?? result?.no ?? result?.number;
    if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);

    const id = result?.id ?? result?.index ?? result?.questionId;
    if (Number.isFinite(Number(id))) return Number(id) + 1;

    return fallbackIndex + 1;
  }

  function getNavItems() {
    return Array.from(document.querySelectorAll('.exam-aside .J_order[data-order]'))
      .sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
  }

  function getNavItem(order) {
    return document.querySelector(`.exam-aside .J_order[data-order="${order}"]`);
  }

  function getCurrentQuestionElement() {
    return document.querySelector('.container-problem .el-scrollbar__view > .subject-item') ||
      document.querySelector('.container-problem .subject-item') ||
      document.querySelector('.exercise-item, .subject-item');
  }

  function getCurrentOrder() {
    const typeNode = getCurrentQuestionElement()?.querySelector('.item-type');
    const match = typeNode?.innerText.match(/^\s*(\d+)/);
    if (match) return Number(match[1]);

    const active = document.querySelector('.exam-aside .J_order.active[data-order], .exam-aside .J_order.is-active[data-order]');
    return active ? Number(active.dataset.order) : null;
  }

  function getQuestionSignature() {
    const current = getCurrentQuestionElement();
    if (!current) return '';

    const meta = current.querySelector('.item-type')?.innerText || '';
    const body = current.querySelector('.problem-body, .item-body')?.innerText || '';
    return `${meta} ${body}`.replace(/\s+/g, ' ').trim();
  }

  async function waitForQuestionOrder(order, previousSignature = '') {
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT_TIME) {
      await sleep(SWITCH_DELAY);
      const signature = getQuestionSignature();
      if (getCurrentOrder() === order && signature && signature !== previousSignature) return true;
      if (getCurrentOrder() === order && signature && !previousSignature) return true;
    }

    return false;
  }

  function normalizeOptionKey(value) {
    const text = String(value || '').replace(/\s+/g, '').trim();
    if (!text) return '';
    if (/^(true|正确|对)$/i.test(text)) return 'T';
    if (/^(false|错误|错)$/i.test(text)) return 'F';
    return text.charAt(0).toUpperCase();
  }

  function parseChoiceAnswer(answer) {
    const clean = String(answer || '')
      .replace(/[，、；;|/]+/g, ' ')
      .replace(/\bTRUE\b/ig, 'T')
      .replace(/\bFALSE\b/ig, 'F')
      .replace(/正确|对/g, 'T')
      .replace(/错误|错/g, 'F');

    const tokens = clean.match(/[A-Z]|T|F/g);
    return Array.from(new Set((tokens || []).map(token => normalizeOptionKey(token)).filter(Boolean)));
  }

  function findOptionItems(questionEl) {
    const listItems = Array.from(questionEl.querySelectorAll('.list-unstyled-radio > li, .list-unstyled-checkbox > li'));
    if (listItems.length > 0) return listItems;
    return Array.from(questionEl.querySelectorAll('label.el-radio, label.el-checkbox'));
  }

  function getOptionKey(optionEl, index) {
    const labelText = optionEl.querySelector('.radioInput, .checkboxInput')?.innerText ||
      optionEl.querySelector('input[type="radio"], input[type="checkbox"]')?.value ||
      '';

    const normalized = normalizeOptionKey(labelText);
    if (normalized) return normalized;

    const fallback = String.fromCharCode(65 + index);
    return fallback;
  }

  function isOptionChecked(optionEl) {
    const input = optionEl.querySelector('input[type="radio"], input[type="checkbox"]');
    if (input?.checked) return true;
    return optionEl.matches('.is-checked') ||
      !!optionEl.querySelector('.is-checked, [aria-checked="true"]');
  }

  function clickOption(optionEl) {
    const target = optionEl.matches('label, .el-radio, .el-checkbox') ?
      optionEl :
      optionEl.querySelector('label, .el-radio, .el-checkbox, input[type="radio"], input[type="checkbox"]') || optionEl;
    target.click();
  }

  function fillChoice(questionEl, answer) {
    const options = findOptionItems(questionEl);
    if (options.length === 0) return false;

    const wanted = parseChoiceAnswer(answer);
    if (wanted.length === 0) return false;

    const isMultiple = !!questionEl.querySelector('.list-unstyled-checkbox, input[type="checkbox"]');
    let changed = 0;

    options.forEach((optionEl, index) => {
      const key = getOptionKey(optionEl, index);
      if (!wanted.includes(key)) return;
      if (isMultiple && isOptionChecked(optionEl)) return;
      if (!isMultiple && isOptionChecked(optionEl)) return;
      clickOption(optionEl);
      changed++;
    });

    return changed > 0;
  }

  function splitBlankAnswer(answer, inputCount) {
    const clean = String(answer || '').trim();
    if (inputCount <= 1) return [clean];

    if (/^[A-Z](?:[\s,，、;；]+[A-Z])+$/.test(clean)) {
      return clean.split(/[\s,，、;；]+/).filter(Boolean);
    }

    const byLine = clean.split(/\n+/).map(v => v.trim()).filter(Boolean);
    if (byLine.length === inputCount) return byLine;

    const bySep = clean.split(/[|；;]/).map(v => v.trim()).filter(Boolean);
    if (bySep.length === inputCount) return bySep;

    return [clean];
  }

  function setNativeValue(input, value) {
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillBlanks(questionEl, answer) {
    const inputs = Array.from(questionEl.querySelectorAll('textarea, input'))
      .filter(input => !/^(radio|checkbox|hidden|button|submit|reset)$/i.test(input.type || ''));

    const editables = Array.from(questionEl.querySelectorAll('[contenteditable="true"]'));
    if (inputs.length === 0 && editables.length === 0) return false;

    const parts = splitBlankAnswer(answer, inputs.length || editables.length);
    let changed = 0;

    inputs.forEach((input, index) => {
      const value = parts[index] ?? parts[0] ?? '';
      setNativeValue(input, value);
      changed++;
    });

    editables.forEach((editable, index) => {
      const value = parts[index] ?? parts[0] ?? '';
      editable.textContent = value;
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      editable.dispatchEvent(new Event('change', { bubbles: true }));
      changed++;
    });

    return changed > 0;
  }

  function fillQuestion(questionEl, result) {
    if (!questionEl) return false;

    const answer = getResultAnswer(result);
    if (!answer) return false;

    if (fillChoice(questionEl, answer)) return true;
    return fillBlanks(questionEl, answer);
  }

  async function fillCloudExercise(results) {
    const originalOrder = getCurrentOrder();
    let filled = 0;
    let missed = 0;

    const ordered = results
      .map((result, index) => ({ result, order: getResultOrder(result, index), index }))
      .sort((a, b) => a.order - b.order);

    for (const item of ordered) {
      const navItem = getNavItem(item.order);
      if (!navItem) {
        missed++;
        continue;
      }

      if (getCurrentOrder() !== item.order) {
        const previousSignature = getQuestionSignature();
        navItem.click();
        await waitForQuestionOrder(item.order, previousSignature);
      }

      await sleep(120);
      if (fillQuestion(getCurrentQuestionElement(), item.result)) {
        filled++;
      } else {
        missed++;
      }
      await sleep(180);
    }

    if (originalOrder && originalOrder !== getCurrentOrder()) {
      getNavItem(originalOrder)?.click();
    }

    return { filled, missed };
  }

  async function fillVisibleQuestions(results) {
    const questionEls = Array.from(document.querySelectorAll('.exercise-item, .subject-item'))
      .filter(el => el.querySelector('.item-body, .problem-body, .list-unstyled-radio, .list-unstyled-checkbox, input, textarea'));
    let filled = 0;
    let missed = 0;

    results.forEach((result, index) => {
      const order = getResultOrder(result, index);
      const questionEl = questionEls[order - 1] || questionEls[index];
      if (fillQuestion(questionEl, result)) {
        filled++;
      } else {
        missed++;
      }
    });

    return { filled, missed };
  }

  async function fillImportedResults(rawResults) {
    const results = normalizeResults(rawResults);
    if (results.length === 0) {
      showToast('没有可导入的解题结果', 'error');
      return { filled: 0, missed: 0 };
    }

    showToast(`开始填入 ${results.length} 条解题结果，请不要切换页面`, 'info', 2500);

    const hasCloudNav = getNavItems().length > 0 && /\/v2\/web\/cloud\/student\/exercise\//.test(location.pathname);
    const stats = hasCloudNav ? await fillCloudExercise(results) : await fillVisibleQuestions(results);
    const type = stats.filled > 0 ? 'success' : 'error';
    showToast(`填入完成：成功 ${stats.filled} 题，未匹配 ${stats.missed} 题；未自动提交`, type, 5000);
    return stats;
  }

  window.YktAnswerFiller = {
    fillImportedResults,
    fillQuestion,
    parseChoiceAnswer,
    getResultOrder
  };

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== IMPORT_MESSAGE_TYPE) return;

    fillImportedResults(event.data.results).catch((error) => {
      console.error('导入解题结果失败', error);
      showToast(`导入解题结果失败：${error?.message || String(error)}`, 'error', 6000);
    });
  });
})();
