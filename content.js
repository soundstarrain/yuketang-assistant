// @ts-nocheck

/**
 * 雨课堂考试助手- 主入口文件
 * 
 * 功能说明：
 * 1. PPT 模式：提取 PPT 幻灯片，支持拖拽排序、删除、拼接成长图
 * 2. 题目模式：提取选择题/填空题，支持 AI 解析、布局切换
 * 
 * 设计特点：
 * - 使用配置管理器集中管理所有配置
 * - 所有类都支持依赖注入，便于扩展
 * - 消除硬编码的配置值，提高可维护性
 * - 保持原有功能完全不变
 */

(function () {
  'use strict';

  // ============ 配置管理器 ============

  /**
   * 配置管理器类
   * 
   * 职责：
   * - 从外部 config.json 文件加载配置
   * - 提供默认配置作为备选方案
   * - 管理应用的所有配置项
   */
  class ConfigManager {
    constructor() {
      this.appConfig = null;
    }

    async loadAppConfig() {
      if (this.appConfig) {
        return this.appConfig;
      }

      // 直接返回硬编码的完整配置
      this.appConfig = this.getDefaultConfig();
      console.log('✅ 配置已加载');
      return this.appConfig;
    }

    getDefaultConfig() {
      return {
        app: {
          name: '雨课堂考试助手',
          version: '1.0.0',
          description: '支持 PPT 模式和题目模式的试题提取工具'
        },
        selectors: {
          ppt: {
            mode: 'ppt',
            selector: '.problem_item',
            description: 'PPT 幻灯片选择器'
          },
          question: [
            {
              mode: 'question',
              selector: '.exercise-item',
              description: '题目模式选择器 1'
            },
            {
              mode: 'question',
              selector: '.subject-item',
              description: '题目模式选择器 2'
            }
          ]
        },
        extractors: {
          meta: {
            selector: '.item-type',
            fallback: '题 {index}'
          },
          body: {
            selectors: ['.item-body h4', 'h4'],
            fallback: '（题干提取失败）'
          },
          options: {
            selectors: ['.list-unstyled-checkbox', '.list-unstyled-radio'],
            labelSelectors: ['.checkboxInput', '.radioInput'],
            contentSelectors: ['.checkboxText', '.radioText'],
            fallback: '[主观题]'
          },
          images: {
            selector: 'img',
            attribute: 'src'
          }
        },
        contentProcessing: {
          removeSelectors: [
            '.el-icon-loading',
            '.upload-body',
            '.btn.support',
            '.uploadvue',
            '.el-checkbox__input',
            '.el-radio__input',
            '.el-checkbox__original',
            '.el-radio__original',
            '.edui-editor',
            '.edui-toolbar',
            '.ueditor-content',
            '.edui-gray',
            '.el-checkbox__label',
            '.el-radio__label',
            'i.el-icon-loading'
          ],
          imageStyles: {
            maxWidth: '300px',
            maxHeight: '150px'
          },
          replacePatterns: [
            {
              pattern: '<span[^>]*class="[^"]*checkboxInput[^"]*"[^>]*>([\\s\\S]*?)<\\/span>',
              replacement: '$1'
            },
            {
              pattern: '<span[^>]*class="[^"]*radioInput[^"]*"[^>]*>([\\s\\S]*?)<\\/span>',
              replacement: '$1'
            },
            {
              pattern: '<span[^>]*class="[^"]*el-checkbox__label[^"]*"[^>]*>([\\s\\S]*?)<\\/span>',
              replacement: '$1'
            },
            {
              pattern: '<span[^>]*class="[^"]*el-radio__label[^"]*"[^>]*>([\\s\\S]*?)<\\/span>',
              replacement: '$1'
            }
          ]
        },
        ai: {
          defaultConfig: {
            url: '',
            key: '',
            model: 'gpt-4o-mini'
          },
          supportedModels: ['gpt-4o'],
          concurrency: {
            maxConcurrent: 30,
            timeout: 30000
          },
          questionTypes: {
            single: '单选题',
            multiple: '多选题',
            subjective: '主观题/填空题'
          },
          prompt: {
            system: '你是一个专业的题目解答助手，擅长解答各类学科题目。',
            formatInstructions: '请严格按照以下 JSON 格式回答，不要添加任何其他文本：\n{"answer": "答案内容（选项字母如A/B/C/D或填空内容，多选题必须列出所有正确答案，如A,B,C）", "solution": "问题的简洁清晰的解答过程"}\n\n特别提醒：\n- 如果这是多选题，必须给出全部的正确答案，不要遗漏任何选项！\n- 如果这是单选题，只需给出一个答案\n- 如果这是主观题，请给出完整的答案内容\n\n格式要求说明（仅适用于 solution 字段内容）：\n1. 如果需要输出数学公式，使用 KaTeX 兼容格式（行内公式用 $公式$，显示公式用 $公式$）\n2. 如果需要输出代码，使用 Prism.js 兼容格式（```语言\\n代码\\n```）\n3. 其他内容使用 Markdown 格式（支持标题、列表、加粗、斜体等）'
          }
        },
        ui: {
          layouts: {
            normal: {
              name: '正常布局',
              description: '标准显示模式，支持所有功能'
            },
            compact: {
              name: '紧凑布局',
              description: '紧凑显示模式，节省空间'
            },
            ultra: {
              name: '超紧凑布局',
              description: '超紧凑模式，适合打印和截图'
            }
          },
          colors: {
            ppt: {
              background: '#2c3e50',
              toolbar: '#ffffff',
              button: '#3498db',
              buttonHover: '#2980b9',
              danger: '#e74c3c',
              success: '#27ae60'
            },
            question: {
              background: '#ffffff',
              toolbar: '#c8e6c9',
              toolbarText: '#2d5016',
              button: '#1b5e20',
              meta: '#666666',
              body: '#000000',
              optionLabel: '#1976d2',
              aiSuccess: '#f6ffed',
              aiError: '#fff2f0',
              aiLoading: '#e6f7ff'
            }
          },
          toolbar: {
            buttons: [
              {
                id: 'layout-normal',
                label: '正常布局',
                action: "setLayout('normal')"
              },
              {
                id: 'layout-compact',
                label: '紧凑布局',
                action: "setLayout('compact')"
              },
              {
                id: 'layout-ultra',
                label: '超紧凑布局',
                action: "setLayout('ultra')"
              },
              {
                id: 'copy-all',
                label: '复制全部文本',
                action: 'copyAll()'
              },
              {
                id: 'ai-solve-all',
                label: '使用AI批量解答所有题目',
                action: 'aiSolveAll()'
              },
              {
                id: 'ai-config',
                label: 'API配置',
                action: 'openAIConfig()'
              },
              {
                id: 'export-images',
                label: '导出所有图片',
                action: 'exportAllImages()'
              }
            ]
          }
        },
        ppt: {
          toolbar: {
            buttons: [
              {
                id: 'merge-images',
                label: '拼接成一张图',
                class: 'success',
                action: 'mergeImages()'
              },
              {
                id: 'delete-all',
                label: '全部删除',
                class: 'danger',
                action: 'deleteAll()'
              }
            ]
          },
          grid: {
            columns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          },
          card: {
            aspectRatio: '160%',
            shadow: '0 4px 6px rgba(0,0,0,0.3)',
            hoverShadow: '0 10px 20px rgba(0,0,0,0.4)'
          }
        },
        storage: {
          keys: {
            appConfig: 'appConfig',
            aiConfig: 'aiConfig',
            layoutMode: 'layoutMode'
          },
          defaults: {
            layoutMode: 'normal'
          }
        },
        features: {
          contentFormatter: {
            enabled: true,
            formats: ['markdown', 'katex', 'prism']
          },
          imageMerger: {
            enabled: true,
            format: 'png'
          },
          exportManager: {
            enabled: true,
            formats: ['text', 'json', 'images'],
            defaultFilenames: {
              text: 'questions.txt',
              json: 'questions.json'
            },
            imagePrefix: 'question_'
          }
        },
        styles: {
          fonts: {
            primary: 'Microsoft YaHei, sans-serif',
            mono: 'Courier New, monospace',
            fallback: 'Arial, sans-serif'
          },
          spacing: {
            xs: '5px',
            sm: '10px',
            md: '15px',
            lg: '20px',
            xl: '30px'
          },
          borderRadius: {
            small: '4px',
            medium: '8px',
            large: '12px'
          },
          shadows: {
            light: '0 2px 4px rgba(0,0,0,0.1)',
            medium: '0 4px 8px rgba(0,0,0,0.15)',
            heavy: '0 8px 16px rgba(0,0,0,0.2)',
            cardLight: '0 4px 6px rgba(0,0,0,0.3)',
            cardHeavy: '0 10px 20px rgba(0,0,0,0.4)'
          }
        },
        animations: {
          transitionDuration: '300ms',
          transitionTiming: 'ease-in-out',
          hoverOpacity: 0.8,
          activeOpacity: 0.7
        },
        performance: {
          imageDownloadDelay: 200,
          notificationDuration: 3000,
          debounceDelay: 300
        },
        messages: {
          errors: {
            noItems: '未找到任何题目元素',
            noAIConfig: '请先配置 AI 参数（API URL、Key、Model）',
            extractionFailed: '题干提取失败',
            imageLoadFailed: '图片加载失败',
            aiResponseEmpty: 'AI 返回空响应，请检查 API 配置',
            jsonParseError: '无法解析 AI 返回的 JSON'
          },
          success: {
            configSaved: '配置已保存',
            copied: '已复制所有题目文本！',
            imagesExported: '已导出 {count} 张图片（浏览器会逐个下载）'
          },
          info: {
            processing: '处理中...',
            aiProcessing: '正在调用 AI...',
            merging: '正在拼接图片...'
          }
        }
      };
    }
  }

  // ============ 请求控制器 ============

  /**
   * 请求控制器类
   * 
   * 核心功能：
   * 1. 并发锁机制 - 防止同一题目被重复请求
   * 2. 状态隔离 - 确保每个题目的状态完全独立
   * 3. UI 管理 - 处理加载状态、错误提示、结果展示
   * 
   * 使用场景：
   * - 单个题目 AI 解答
   * - 批量题目 AI 解答（支持并发控制）
   */
  class RequestController {
    constructor() {
      this.activeQuestionIds = new Set();
      this.questionStates = new Map();
      this.config = {
        loadingText: '正在思考中...',
        loadingClass: 'ai-loading',
        errorClass: 'ai-error',
        resultClass: 'ai-result',
        loadingDuration: 300
      };
    }

    isProcessing(questionId) {
      return this.activeQuestionIds.has(String(questionId));
    }

    getState(questionId) {
      const state = this.questionStates.get(String(questionId));
      return state?.status || 'idle';
    }

    async handleSolveQuestion(questionId, questionData, solveFunction, options = {}) {
      const qId = String(questionId);

      if (this.isProcessing(qId)) {
        console.warn(`⚠️ 题目 ${qId} 正在处理中，忽略重复请求`);
        return null;
      }

      this.activeQuestionIds.add(qId);
      this.updateState(qId, 'processing');

      const startTime = Date.now();
      let result = null;

      try {
        this.clearOldState(qId);
        this.showLoadingUI(qId);

        if (options.onBeforeSolve) {
          await options.onBeforeSolve(qId);
        }

        result = await solveFunction(questionData);

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < this.config.loadingDuration) {
          await new Promise(resolve =>
            setTimeout(resolve, this.config.loadingDuration - elapsedTime)
          );
        }

        this.hideLoadingUI(qId);
        this.renderSuccessUI(qId, result);
        this.updateState(qId, 'success', result);

        if (options.onSuccess) {
          await options.onSuccess(qId, result);
        }

        console.log(`✅ 题目 ${qId} 解答成功`);
        return result;

      } catch (error) {
        this.hideLoadingUI(qId);
        this.renderErrorUI(qId, error);
        this.updateState(qId, 'error', error);

        if (options.onError) {
          await options.onError(qId, error);
        }

        console.error(`❌ 题目 ${qId} 解答失败:`, error);
        return null;

      } finally {
        this.activeQuestionIds.delete(qId);
        console.log(`🔓 题目 ${qId} 请求锁已释放`);
      }
    }

    async handleSolveMultiple(questionsData, solveFunction, options = {}) {
      const {
        maxConcurrent = 30,
        onProgress,
        onQuestionsStateChange
      } = options;

      const results = new Map();
      const queue = [...questionsData];
      let running = 0;
      let completed = 0;

      return new Promise((resolve, reject) => {
        const processNext = async () => {
          if (queue.length === 0 && running === 0) {
            resolve(Array.from(results.values()));
            return;
          }

          if (queue.length === 0 || running >= maxConcurrent) {
            return;
          }

          running++;
          const questionData = queue.shift();
          const questionId = questionData.id || questionData.index;

          try {
            const result = await this.handleSolveQuestion(
              questionId,
              questionData,
              solveFunction,
              {
                onBeforeSolve: () => {
                  if (onQuestionsStateChange) {
                    onQuestionsStateChange(questionId, 'processing');
                  }
                },
                onSuccess: (qId, res) => {
                  results.set(qId, res);
                  completed++;
                  if (onProgress) {
                    onProgress(completed, questionsData.length);
                  }
                  if (onQuestionsStateChange) {
                    onQuestionsStateChange(qId, 'success');
                  }
                },
                onError: (qId, err) => {
                  results.set(qId, { error: err.message });
                  completed++;
                  if (onProgress) {
                    onProgress(completed, questionsData.length);
                  }
                  if (onQuestionsStateChange) {
                    onQuestionsStateChange(qId, 'error');
                  }
                }
              }
            );
          } catch (err) {
            console.error(`❌ 批量处理失败:`, err);
          } finally {
            running--;
            processNext();
          }
        };

        for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
          processNext();
        }
      });
    }

    clearOldState(questionId) {
      const qId = String(questionId);
      const questionElement = this.getQuestionElement(qId);

      if (!questionElement) {
        console.warn(`⚠️ 找不到题目元素: ${qId}`);
        return;
      }

      const oldUIs = questionElement.querySelectorAll(
        `.${this.config.loadingClass}, .${this.config.errorClass}, .${this.config.resultClass}`
      );

      oldUIs.forEach(ui => {
        ui.remove();
      });

      console.log(`🧹 题目 ${qId} 的旧状态已清除`);
    }

    showLoadingUI(questionId) {
      const qId = String(questionId);
      const questionElement = this.getQuestionElement(qId);

      if (!questionElement) {
        console.warn(`⚠️ 找不到题目元素: ${qId}`);
        return;
      }

      const loadingDiv = document.createElement('div');
      loadingDiv.className = this.config.loadingClass;
      loadingDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #91d5ff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
          <span>${this.config.loadingText}</span>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;

      const aiTools = questionElement.querySelector('.ai-tools');
      if (aiTools) {
        aiTools.after(loadingDiv);
      } else {
        questionElement.appendChild(loadingDiv);
      }

      console.log(`⏳ 题目 ${qId} 的加载 UI 已显示`);
    }

    hideLoadingUI(questionId) {
      const qId = String(questionId);
      const questionElement = this.getQuestionElement(qId);

      if (!questionElement) {
        return;
      }

      const loadingUI = questionElement.querySelector(`.${this.config.loadingClass}`);
      if (loadingUI) {
        loadingUI.remove();
      }

      console.log(`✓ 题目 ${qId} 的加载 UI 已隐藏`);
    }

    renderSuccessUI(questionId, result) {
      const qId = String(questionId);
      const questionElement = this.getQuestionElement(qId);

      if (!questionElement) {
        console.warn(`⚠️ 找不到题目元素: ${qId}`);
        return;
      }

      const resultDiv = document.createElement('div');
      resultDiv.className = this.config.resultClass;

      // 构建耗时显示信息
      let durationHtml = '';
      if (result.duration) {
        durationHtml = `<div class="ai-duration">用时：${result.duration}s`;
        durationHtml += '</div>';
      }

      resultDiv.innerHTML = `
        <b>AI 解答结果</b>
        <div class="answer">答案：${this.escapeHtml(result.answer || '无法获取答案')}</div>
        <div class="thinking">解答过程：${this.escapeHtml(result.solution || '无解答过程')}</div>
        ${durationHtml}
      `;

      questionElement.appendChild(resultDiv);
      console.log(`✅ 题目 ${qId} 的成功结果已渲染`);
    }

    renderErrorUI(questionId, error) {
      const qId = String(questionId);
      const questionElement = this.getQuestionElement(qId);

      if (!questionElement) {
        console.warn(`⚠️ 找不到题目元素: ${qId}`);
        return;
      }

      const errorDiv = document.createElement('div');
      errorDiv.className = this.config.errorClass;
      errorDiv.innerHTML = `
        <b>解析失败</b>
        <div style="margin-top: 4px; font-size: 12px; color: #a8071a;">
          ${this.escapeHtml(error.message || '未知错误')}
        </div>
        <div style="margin-top: 6px; font-size: 11px; color: #999;">
          提示：点击"AI解答"按钮重试
        </div>
      `;

      questionElement.appendChild(errorDiv);
      console.log(`❌ 题目 ${qId} 的错误信息已渲染`);
    }

    getQuestionElement(questionId) {
      const qId = String(questionId);
      return document.querySelector(`[data-index="${qId}"]`) ||
        document.querySelector(`[data-question-id="${qId}"]`);
    }

    updateState(questionId, status, data = null) {
      const qId = String(questionId);
      this.questionStates.set(qId, {
        status,
        data,
        timestamp: Date.now()
      });
    }

    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }

  }

  // ============ 核心模块 ============

  /**
   * 题目检测器类
   * 
   * 职责：
   * - 根据配置的选择器识别页面上的题目元素
   * - 判断题目类型（PPT 模式或题目模式）
   * - 提供备用选择器和调试信息
   */
  class QuestionDetector {
    constructor(configManager) {
      this.configManager = configManager;
      this.additionalSelectors = [
        // 雨课堂常见选择器
        '.problem_item',
        '.exercise-item',
        '.subject-item',
        '.q-item',
        '[data-question-id]',
        '[data-exercise-id]',
        '.exam-item',
        '.test-item',
        '.question-item',
        // 通用选择器
        '[class*="problem"]',
        '[class*="exercise"]',
        '[class*="question"]',
        '[class*="exam"]'
      ];
    }

    /**
     * 检测页面上的题目元素和模式
     * @returns {Promise<Object>} { items: NodeList, mode: string, count: number }
     */
    async detect() {
      try {
        const config = await this.configManager.loadAppConfig();
        const selectors = [
          config.selectors.ppt,
          ...(Array.isArray(config.selectors.question) ? config.selectors.question : [config.selectors.question])
        ];

        // 首先尝试配置中的选择器
        for (const { selector, mode } of selectors) {
          const items = document.querySelectorAll(selector);
          console.log(`🔍 尝试选择器 "${selector}"，找到 ${items.length} 个元素`);
          if (items.length > 0) {
            console.log(`✅ 使用选择器 "${selector}" 检测到 ${items.length} 个${mode === 'ppt' ? 'PPT' : '题目'}元素`);
            return { items, mode, count: items.length };
          }
        }

        // 如果配置选择器失败，尝试额外的选择器
        console.warn('⚠️ 配置中的选择器未找到任何元素，尝试额外的选择器...');
        for (const selector of this.additionalSelectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            console.log(`✅ 使用备用选择器 "${selector}" 找到 ${items.length} 个元素`);
            // 根据选择器判断模式
            const mode = selector.includes('problem') ? 'ppt' : 'question';
            return { items, mode, count: items.length };
          }
        }

        // 如果还是没找到，输出页面结构信息
        console.warn('⚠️ 未找到任何题目元素');
        console.log('📋 页面结构信息：');
        console.log('  - 页面 URL:', window.location.href);
        console.log('  - 页面标题:', document.title);
        console.log('  - Body 类名:', document.body.className);

        return { items: [], mode: null, count: 0 };
      } catch (error) {
        console.error('❌ 题目检测错误:', error);
        return { items: [], mode: null, count: 0 };
      }
    }
  }

  /**
   * 数据提取器 - 从 DOM 中提取题目数据
   */
  class DataExtractor {
    constructor(configManager) {
      this.configManager = configManager;
    }

    /**
     * 提取题目元数据（题号、题型等）
     */
    async extractMeta(questionElement, index) {
      const config = await this.configManager.loadAppConfig();
      const metaConfig = config.extractors.meta;
      let metaText = metaConfig.fallback.replace('{index}', index + 1);

      const typeNode = questionElement.querySelector(metaConfig.selector);
      if (typeNode) {
        metaText = typeNode.innerText.replace(/\s+/g, ' ').trim();
      }
      return metaText;
    }

    /**
     * 提取题目题干
     */
    async extractBody(questionElement) {
      const config = await this.configManager.loadAppConfig();
      const bodyConfig = config.extractors.body;
      let bodyHtml = bodyConfig.fallback;

      for (const selector of bodyConfig.selectors) {
        const element = questionElement.querySelector(selector);
        if (element) {
          bodyHtml = await this.processContent(element);
          break;
        }
      }
      return bodyHtml;
    }

    /**
     * 提取题目选项
     */
    async extractOptions(questionElement) {
      const config = await this.configManager.loadAppConfig();
      const optConfig = config.extractors.options;
      let optionsHtml = '<div class="q-options">';

      let optList = questionElement.querySelector(optConfig.selectors.join(', '));
      if (!optList) {
        const itemBody = questionElement.querySelector('.item-body');
        if (itemBody) {
          optList = itemBody.querySelector(optConfig.selectors.join(', '));
        }
      }

      if (optList) {
        const optItems = optList.querySelectorAll('li');
        if (optItems.length > 0) {
          for (const optItem of optItems) {
            let label = '';
            for (const labelSelector of optConfig.labelSelectors) {
              const labelNode = optItem.querySelector(labelSelector);
              if (labelNode) {
                const labelText = labelNode.innerText.trim();
                label = labelText.charAt(0) || labelText;
                break;
              }
            }

            let content = '';
            for (const contentSelector of optConfig.contentSelectors) {
              const contentNode = optItem.querySelector(contentSelector);
              if (contentNode) {
                content = await this.processContent(contentNode);
                break;
              }
            }

            if (label || content) {
              optionsHtml += `<div class="q-opt"><span class="q-opt-label">${label}.</span><div class="q-opt-content">${content}</div></div>`;
            }
          }
        } else {
          optionsHtml += `<div style="color:#999; font-style:italic; font-size:12px;">${optConfig.fallback}</div>`;
        }
      } else {
        optionsHtml += `<div style="color:#999; font-style:italic; font-size:12px;">${optConfig.fallback}</div>`;
      }

      optionsHtml += '</div>';
      return optionsHtml;
    }

    /**
     * 提取题目中的图片
     */
    async extractImages(questionElement) {
      const config = await this.configManager.loadAppConfig();
      const images = [];
      const imgConfig = config.extractors.images;
      const imgs = questionElement.querySelectorAll(imgConfig.selector);

      imgs.forEach((img) => {
        const src = img.getAttribute(imgConfig.attribute);
        if (src) images.push(src);
      });

      return images;
    }

    /**
     * 提取完整的题目数据
     */
    async extractQuestionData(questionElement, index) {
      return {
        meta: await this.extractMeta(questionElement, index),
        body: await this.extractBody(questionElement),
        options: await this.extractOptions(questionElement),
        images: await this.extractImages(questionElement)
      };
    }

    /**
     * 处理内容：清理 DOM、修复图片 URL、规范化 HTML
     */
    async processContent(element) {
      if (!element) return '';

      const config = await this.configManager.loadAppConfig();
      const clone = element.cloneNode(true);
      const removeConfig = config.contentProcessing.removeSelectors;
      const useless = clone.querySelectorAll(removeConfig.join(', '));

      useless.forEach((el) => el.remove());

      // 修复图片 URL
      const imgs = clone.querySelectorAll('img');
      const imageStyles = config.contentProcessing.imageStyles;

      imgs.forEach((img) => {
        let src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          if (src.startsWith('//')) {
            img.src = window.location.protocol + src;
          } else {
            img.src = window.location.origin + src;
          }
        }
        img.style.width = '';
        img.style.height = '';
        img.style.maxWidth = imageStyles.maxWidth;
        img.style.maxHeight = imageStyles.maxHeight;
      });

      // 应用替换规则
      let html = clone.innerHTML;
      for (const rule of config.contentProcessing.replacePatterns) {
        const regex = new RegExp(rule.pattern, 'g');
        html = html.replace(regex, rule.replacement);
      }

      html = html.replace(/\s+/g, ' ').trim();
      return html;
    }
  }

  /**
   * 基础渲染器 - 提供渲染的基本框架
   */
  class BaseRenderer {
    constructor(items) {
      this.items = items;
    }

    /**
     * 渲染方法 - 由子类实现
     */
    render() {
      throw new Error('render() 必须被子类实现');
    }

    /**
     * 构建 HTML 方法 - 由子类实现
     */
    buildHTML() {
      throw new Error('buildHTML() 必须被子类实现');
    }

    /**
     * 在新窗口中打开 HTML
     */
    openInNewWindow(html) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }

  /**
   * PPT 渲染器 - 渲染 PPT 模式
   */
  class PPTRenderer extends BaseRenderer {
    constructor(items, config) {
      super(items);
      this.config = config;
    }

    async render() {
      let extractedData = null;
      if (this.extractor) {
        extractedData = [];
        for (let i = 0; i < this.items.length; i++) {
          /* eslint-disable no-await-in-loop */
          const data = await this.extractor.extractQuestionData(this.items[i], i);
          extractedData.push(data);
        }
      }
      const html = this.buildHTML(extractedData);
      this.openInNewWindow(html);
    }

    buildHTML(extractedData) {
      return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${this.config.app.name}</title><style>${this.getStyles()}</style></head><body>${this.buildToolbar()}${this.buildGrid()}${this.buildModals()}<script>${this.getScripts()}<\/script></body></html>`;
    }

    getStyles() {
      const colors = this.config.ui.colors.ppt;
      const ppt = this.config.ppt;

      return `body{background-color:${colors.background};margin:0;padding:20px;padding-top:80px;font-family:sans-serif;user-select:none}.tips{text-align:center;color:#ccc;padding:10px;background:#444;margin-bottom:20px}.toolbar{position:fixed;top:0;left:0;right:0;height:60px;background:${colors.toolbar};box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:10000;display:flex;align-items:center;justify-content:space-between;padding:0 30px}.toolbar h2{margin:0}.toolbar-right{display:flex;gap:10px}.btn{background:${colors.button};color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;font-size:14px;transition:background 0.2s}.btn:hover{background:${colors.buttonHover}}.btn.danger{background:${colors.danger}}.btn.danger:hover{background:#c0392b}.btn.success{background:${colors.success}}.btn.success:hover{background:#229954}.grid-container{display:grid;grid-template-columns:${ppt.grid.columns};gap:${ppt.grid.gap};padding-bottom:50px}.ppt-card{background:white;position:relative;width:100%;padding-bottom:${ppt.card.aspectRatio};box-shadow:${ppt.card.shadow};border-radius:6px;overflow:hidden;cursor:grab;transition:transform 0.2s;user-select:none}.ppt-card:hover{transform:translateY(-5px);box-shadow:${ppt.card.hoverShadow};z-index:10}.ppt-card.dragging{opacity:0.5;border:2px dashed #f1c40f}.ppt-inner{position:absolute;top:0;left:0;width:100%;height:100%;transform:none !important}.pptimg{position:absolute !important;background-size:100% 100% !important;background-repeat:no-repeat !important;display:block !important;opacity:1 !important}.delete-btn{position:absolute;top:5px;right:5px;width:24px;height:24px;background:${colors.danger};color:white;border-radius:50%;text-align:center;line-height:24px;cursor:pointer;z-index:9999;pointer-events:auto;font-weight:bold;transition:background 0.2s}.delete-btn:hover{background:#c0392b}.page-idx{position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.6);color:white;font-size:12px;padding:2px 6px;border-radius:3px;z-index:9998}.problem_type_box,.bottom_commit,.subjective--btn{display:none !important}.problembullet{z-index:1000 !important}.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:20000;align-items:center;justify-content:center}.modal.show{display:flex}.modal-content{background:white;padding:30px;border-radius:8px;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,0.3)}.modal-content h3{margin-top:0}.modal-content p{margin:10px 0}.modal-buttons{display:flex;gap:10px;margin-top:20px;justify-content:flex-end}`;
    }

    buildToolbar() {
      const buttons = this.config.ppt.toolbar.buttons;
      let buttonsHtml = '';

      for (const btn of buttons) {
        buttonsHtml += `<button class="btn ${btn.class}" onclick="${btn.action}">${btn.label}</button>`;
      }

      return `<div class="toolbar"><div><h2>${this.config.app.name}</h2><span style="font-size:12px;color:#666;margin-left:10px;">共 <b id="count">0</b> 张</span></div><div class="toolbar-right">${buttonsHtml}</div></div><div class="tips">已提取 <b id="tips-count">${this.items.length}</b> 页。<br><b>按 Ctrl + 滚轮 调整大小</b><br>如果没有重叠了，就可以保存了。</div>`;
    }

    buildGrid() {
      let gridHtml = '<div class="grid-container" id="grid">';

      this.items.forEach((item, index) => {
        // 使用克隆，避免改动原页面 DOM
        const clone = item.cloneNode(true);
        const imgs = clone.querySelectorAll('.pptimg');
        imgs.forEach((div) => {
          let bg = div.getAttribute('data-background');
          if (bg) {
            if (!bg.includes('http')) {
              bg = bg.startsWith('//') ? window.location.protocol + bg : window.location.origin + bg;
            }
            div.style.backgroundImage = `url("${bg}")`;
          }
          // 参考最初版本：不改动百分比定位与尺寸，只移除 transform 并确保显示
          div.style.transform = '';
          div.style.display = 'block';
          div.style.opacity = '1';
        });

        gridHtml += `<div class="ppt-card" draggable="true" data-index="${index + 1}"><div class="delete-btn" title="删除">×</div><div class="page-idx">#${index + 1}</div><div class="ppt-inner">${clone.innerHTML}</div></div>`;
      });

      gridHtml += '</div>';
      return gridHtml;
    }

    buildModals() {
      return `<div class="modal" id="mergeModal"><div class="modal-content"><h3>正在拼接图片...</h3><p>进度: <span id="mergeProgress">0</span>/<span id="mergeTotal">0</span></p><div style="width:100%;height:20px;background:#eee;border-radius:10px;overflow:hidden;"><div id="mergeBar" style="width:0%;height:100%;background:#27ae60;transition:width 0.3s;"></div></div></div></div>`;
    }

    getScripts() {
      return `
        // ============ PPT 模式专用脚本 ============
        const grid=document.getElementById('grid');
        const updateCount=()=>document.getElementById('count').innerText=document.querySelectorAll('.ppt-card').length;
        updateCount();
        
        // 删除单个卡片
        grid.addEventListener('click',e=>{
          if(e.target.classList.contains('delete-btn')){
            e.target.closest('.ppt-card').remove();
            updateCount()
          }
        });
        
        // 全部删除
        function deleteAll(){
          if(confirm('确定要删除所有卡片吗？')){
            grid.innerHTML='';
            updateCount()
          }
        }
        
        // 拖拽排序
        let dragSrc=null;
        const cards=document.getElementsByClassName('ppt-card');
        function dragStart(e){
          dragSrc=this;
          this.classList.add('dragging');
          e.dataTransfer.effectAllowed='move'
        }
        function dragEnd(e){
          this.classList.remove('dragging')
        }
        function dragOver(e){
          e.preventDefault();
          return false
        }
        function drop(e){
          e.stopPropagation();
          const target=e.target.closest('.ppt-card');
          if(dragSrc!==target&&target){
            const all=[...grid.children];
            const srcIdx=all.indexOf(dragSrc);
            const tgtIdx=all.indexOf(target);
            srcIdx<tgtIdx?target.after(dragSrc):target.before(dragSrc)
          }
          return false
        }
        for(let card of cards){
          card.addEventListener('dragstart',dragStart);
          card.addEventListener('dragover',dragOver);
          card.addEventListener('drop',drop);
          card.addEventListener('dragend',dragEnd)
        }
        
        // 拼接成一张图
        async function mergeImages(){
          const cards=document.querySelectorAll('.ppt-card');
          if(cards.length===0){
            alert('没有卡片可以拼接');
            return
          }
          const modal=document.getElementById('mergeModal');
          const progressSpan=document.getElementById('mergeProgress');
          const totalSpan=document.getElementById('mergeTotal');
          const progressBar=document.getElementById('mergeBar');
          modal.classList.add('show');
          totalSpan.innerText=cards.length;
          try{
            const images=[];
            for(let i=0;i<cards.length;i++){
              const card=cards[i];
              const inner=card.querySelector('.ppt-inner');
              const pptimg=inner.querySelector('.pptimg');
              if(pptimg&&pptimg.style.backgroundImage){
                const bgUrl=pptimg.style.backgroundImage.match(/url\\(["']?([^"']*)["']?\\)/);
                if(bgUrl&&bgUrl[1]){
                  const img=await loadImage(bgUrl[1]);
                  images.push(img)
                }
              }
              progressSpan.innerText=i+1;
              progressBar.style.width=((i+1)/cards.length*100)+'%'
            }
            if(images.length===0){
              alert('没有找到可拼接的图片');
              modal.classList.remove('show');
              return
            }
            const width=images[0].width;
            const totalHeight=images.reduce((sum,img)=>sum+img.height,0);
            const canvas=document.createElement('canvas');
            canvas.width=width;
            canvas.height=totalHeight;
            const ctx=canvas.getContext('2d');
            let currentY=0;
            images.forEach((img,idx)=>{
              ctx.drawImage(img,0,currentY);
              currentY+=img.height
            });
            canvas.toBlob(blob=>{
              const url=URL.createObjectURL(blob);
              const a=document.createElement('a');
              a.href=url;
              a.download='merged-ppt-'+new Date().getTime()+'.png';
              a.click();
              URL.revokeObjectURL(url);
              modal.classList.remove('show')
            })
          }catch(err){
            alert('拼接失败: '+err.message);
            modal.classList.remove('show')
          }
        }
        
        function loadImage(url){
          return new Promise((resolve,reject)=>{
            const img=new Image();
            img.crossOrigin='anonymous';
            img.onload=()=>resolve(img);
            img.onerror=()=>reject(new Error('图片加载失失败: '+url));
            img.src=url
          })
        }
      `;
    }
  }

  /**
   * 题目渲染器 - 渲染题目模式
   */
  class QuestionRenderer extends BaseRenderer {
    constructor(items, config, features = {}, aiConfig = {}) {
      super(items);
      this.config = config;
      this.aiSolver = features.aiSolver;
      this.layoutManager = features.layoutManager;
      this.extractor = features.extractor;
      this.aiConfig = aiConfig;
    }

    async render() {
      let extractedData = null;
      if (this.extractor) {
        extractedData = [];
        for (let i = 0; i < this.items.length; i++) {
          /* eslint-disable no-await-in-loop */
          const data = await this.extractor.extractQuestionData(this.items[i], i);
          extractedData.push(data);
        }
      }
      const html = this.buildHTML(extractedData);
      this.openInNewWindow(html);
    }

    buildHTML(extractedData) {
      const head = `
        <head>
            <meta charset="utf-8">
            <title>${this.config.app.name} - 共${this.items.length}题</title>
            <link rel="stylesheet" href="${chrome.runtime.getURL('libs/katex.min.css')}">
            <link rel="stylesheet" href="${chrome.runtime.getURL('libs/prism-tomorrow.min.css')}">
            <style>${this.getStyles()}</style>
        </head>
      `;

      const body = `
        <body>
            ${this.buildToolbar()}
            <div class="q-container" id="content-area">${this.buildQuestions(extractedData)}</div>
            ${this.buildModals()}
            <script src="${chrome.runtime.getURL('libs/markdown-it.min.js')}"></script>
            <script src="${chrome.runtime.getURL('libs/katex.min.js')}"></script>
            <script src="${chrome.runtime.getURL('libs/auto-render.min.js')}"></script>
            <script src="${chrome.runtime.getURL('libs/prism.min.js')}"></script>
            <script>
               window.currentAIConfig = ${JSON.stringify(this.aiConfig || {})};
            </script>
            <script>${this.getScripts()}</script>
        </body>
      `;

      return `<!DOCTYPE html><html lang="zh-CN">${head}${body}</html>`;
    }

    getStyles() {
      const colors = this.config.ui.colors.question;

      return `body{font-family:"Microsoft YaHei",sans-serif;background:${colors.background};margin:0;padding:10px;color:${colors.body};font-size:14px;line-height:1.4}.toolbar{position:fixed;top:0;left:0;right:0;background:${colors.toolbar};color:${colors.toolbarText};padding:10px 20px;z-index:9999;display:flex;gap:20px;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.2)}.toolbar-info{font-size:14px;font-weight:bold}.toolbar-buttons{display:flex;gap:15px;margin-left:auto}.btn{cursor:pointer;color:${colors.button};font-weight:bold;background:rgba(255,255,255,0.7);border:1px solid #81c784;font-size:13px;padding:5px 10px;border-radius:3px;transition:background 0.2s}.btn:hover{background:rgba(255,255,255,1)}.btn.danger{color:#c62828}.btn.danger:hover{background:rgba(255,255,255,1)}.q-container{max-width:100%;padding-top:60px;padding-bottom:20px}.q-item{border-bottom:1px solid #eee;padding:8px 0;display:flex;flex-direction:column;break-inside:avoid;margin-bottom:5px}.q-meta{font-weight:bold;color:${colors.meta};font-size:12px;background:#f9f9f9;padding:3px 8px;border-radius:3px;margin-bottom:4px;display:inline-block;width:fit-content}.q-body{font-weight:500;color:${colors.body};margin-bottom:4px;word-break:break-word}.q-body p{margin:2px 0}img{max-width:300px !important;max-height:150px !important;height:auto !important;vertical-align:middle;border:1px solid #eee;border-radius:3px}.q-options{display:flex;flex-wrap:wrap;gap:10px 20px;margin-top:4px;padding-left:5px}.q-opt{display:flex;align-items:flex-start;font-size:13px;color:#333;background:#fdfdfd;padding:3px 8px;border-radius:3px;border:1px solid #f0f0f0}.q-opt-label{font-weight:bold;color:${colors.optionLabel};margin-right:5px;white-space:nowrap;min-width:20px}.q-opt-content p{margin:0;display:inline}.q-delete{display:none}body.compact-mode{padding:5px}body.compact-mode .q-container{padding-top:50px;padding-bottom:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px}body.compact-mode .q-item{border:1px solid #ddd;border-radius:4px;padding:6px;margin-bottom:0;background:#fafafa}body.compact-mode .q-meta{padding:2px 4px;font-size:11px;margin-bottom:3px}body.compact-mode .q-body{font-size:12px;margin-bottom:3px;line-height:1.3}body.compact-mode .q-options{gap:5px 10px;margin-top:3px;padding-left:2px}body.compact-mode .q-opt{font-size:11px;padding:2px 4px}body.compact-mode img{max-width:200px !important;max-height:100px !important}body.compact-mode .ai-tools{gap:5px;margin-left:5px}body.compact-mode .ai-btn{font-size:11px;padding:2px 4px}body.compact-mode .ai-result{padding:4px;font-size:11px;margin-top:3px}body.ultra-compact-mode{padding:3px;font-size:12px}body.ultra-compact-mode .q-container{padding-top:50px;padding-bottom:10px;columns:auto;column-width:280px;column-gap:6px;column-rule:none}body.ultra-compact-mode .q-item{border:1px solid #d8d8d8;border-radius:2px;padding:4px;margin-bottom:6px;background:#fafafa;display:flex;flex-direction:column;break-inside:avoid;page-break-inside:avoid;overflow:visible}body.ultra-compact-mode .q-meta{padding:1px 3px;font-size:9px;margin-bottom:2px;font-weight:bold;color:${colors.meta};background:#f5f5f5;border-radius:2px;display:inline-block;width:fit-content}body.ultra-compact-mode .q-body{font-size:10px;margin-bottom:2px;line-height:1.15;word-break:break-word;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto}body.ultra-compact-mode .q-body p{margin:0;padding:0;display:inline}body.ultra-compact-mode .q-body p:not(:last-child)::after{content:' '}body.ultra-compact-mode .q-options{gap:2px 4px;margin-top:2px;padding-left:0;flex-wrap:wrap;display:flex;align-items:flex-start}body.ultra-compact-mode .q-opt{font-size:9px;padding:1px 2px;background:#fff;border:1px solid #e8e8e8;border-radius:1px;flex-shrink:0;line-height:1.1;display:inline-flex;align-items:flex-start}body.ultra-compact-mode .q-opt-label{font-size:9px;margin-right:1px;min-width:12px;font-weight:bold;color:${colors.optionLabel}}body.ultra-compact-mode .q-opt-content{font-size:9px;word-break:break-word;overflow-wrap:break-word;max-width:150px}body.ultra-compact-mode .q-opt-content p{margin:0;padding:0;display:inline}body.ultra-compact-mode img{max-width:120px !important;max-height:70px !important;height:auto !important;margin:1px 0;border:none;border-radius:2px}body.ultra-compact-mode .ai-tools{gap:2px;margin-left:0;margin-top:1px;display:inline-flex}body.ultra-compact-mode .ai-btn{font-size:8px;padding:1px 2px;border:1px solid #16a085;border-radius:1px;background:#f0fffe;color:#16a085;cursor:pointer;white-space:nowrap}body.ultra-compact-mode .ai-btn:hover{background:#e8f8f6}body.ultra-compact-mode .ai-result{padding:2px;font-size:8px;margin-top:1px;border-radius:1px;background:${colors.aiSuccess};border:1px solid #b7eb8f;line-height:1.1}body.ultra-compact-mode .ai-result b{font-size:8px;margin-bottom:1px;display:block}body.ultra-compact-mode .ai-result .answer{font-size:8px;margin-bottom:1px;font-weight:bold;color:#1a5c4a}body.ultra-compact-mode .ai-result .thinking{font-size:7px;margin-top:1px;padding-top:1px;border-top:1px solid #b7eb8f;color:#666}body.ultra-compact-mode .ai-result .ai-duration{font-size:7px;margin-top:1px;padding-top:1px;border-top:1px solid #b7eb8f;color:#666;text-align:right}        /* 试卷模式兼容样式 */
        .q-answer-block{margin-top:5px;padding:8px;background:#e6f7ff;border:1px solid #91d5ff;color:#0050b3;border-radius:4px;font-size:14px;font-weight:bold}
        .q-explanation-block{margin-top:5px;padding:8px;background:#fffbe6;border:1px solid #ffe58f;border-radius:4px;font-size:13px;color:#666}

        .ai-tools{display:inline-flex;gap:8px;margin-left:10px}
        .ai-btn{color:#fff;border:none;background:#27ae60;padding:4px 10px;border-radius:3px;font-size:12px;cursor:pointer;font-weight:bold;box-shadow:0 2px 5px rgba(39,174,96,0.2)}
        .ai-btn:hover{background:#219150}
        .ai-btn:disabled{opacity:0.5;cursor:not-allowed}
        .ai-result{background:${colors.aiSuccess};border:2px solid #b7eb8f;padding:10px;border-radius:4px;margin-top:8px}
        .ai-result b{color:#2c7a7b;display:block;margin-bottom:4px}
        .ai-result .answer{color:#135200;font-weight:bold;margin-bottom:4px;font-size:14px;background:rgba(82,196,26,0.1);padding:2px 5px;border-radius:3px;display:inline-block}.ai-result .thinking{color:#666;font-size:12px;margin-top:4px;padding-top:4px;border-top:1px solid #b7eb8f}.ai-duration{color:#999;font-size:11px;margin-top:4px;padding-top:4px;border-top:1px solid #d9f7be;text-align:right;font-style:italic}.api-duration-info{color:#1890ff;font-weight:500;margin-left:8px}.api-duration-info::before{content:'|';margin-right:8px;color:#d9d9d9}.ai-error{background:${colors.aiError};border:1px solid #ffccc7;padding:8px;border-radius:4px;color:#a8071a;margin-top:6px}.ai-loading{background:${colors.aiLoading};border:1px solid #91d5ff;padding:8px;border-radius:4px;margin-top:6px;color:#0050b3}.cfg-input{width:100%;padding:6px 8px;margin-top:4px;box-sizing:border-box}.cfg-label{font-size:12px;color:#555}.cfg-row{margin-bottom:10px}.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:20000;align-items:center;justify-content:center}.modal.show{display:flex}.modal-content{background:white;padding:20px;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.3)}.modal-buttons{display:flex;gap:10px;margin-top:15px;justify-content:flex-end}@keyframes slideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(400px);opacity:0}}`;
    }

    buildToolbar() {
      const buttons = this.config.ui.toolbar.buttons || [];
      let buttonsHtml = '';

      for (const btn of buttons) {
        buttonsHtml += `<button class="btn" onclick="${btn.action}">${btn.label}</button>`;
      }

      return `<div class="toolbar"><div class="toolbar-info">${this.config.app.name} - 共 ${this.items.length} 题</div><div class="toolbar-buttons">${buttonsHtml}</div></div>`;
    }

    buildQuestions(extractedData) {
      let questionsHtml = '';
      const useExtracted = Array.isArray(extractedData) && extractedData.length === this.items.length;

      this.items.forEach((item, index) => {
        const data = useExtracted ? extractedData[index] : this.extractQuestionDataFallback(item, index);
        questionsHtml += `<div class=\"q-item\" data-index=\"${index}\"><div class=\"q-meta\">${data.meta}</div><div class=\"q-body\">${data.body}</div>${data.options}<div class=\"ai-tools\"><button class=\"ai-btn\" onclick=\"window.aiSolveOne(${index})\">AI解答</button></div></div>`;
      });

      return questionsHtml;
    }

    /**
     * 备用的题目数据提取方法（当 extractor 不可用时）
     */
    extractQuestionDataFallback(item, index) {
      let metaText = `题 ${index + 1}`;
      const typeNode = item.querySelector('.item-type');
      if (typeNode) {
        metaText = typeNode.innerText.replace(/\s+/g, ' ').trim();
      }

      let bodyHtml = '（题干提取失败）';
      let itemBody = item.querySelector('.item-body');
      if (itemBody) {
        const h4 = itemBody.querySelector('h4');
        if (h4) {
          bodyHtml = this.processContent(h4);
        }
      }

      if (bodyHtml === '（题干提取失败）') {
        const h4 = item.querySelector('h4');
        if (h4) {
          bodyHtml = this.processContent(h4);
        }
      }

      let optionsHtml = '<div class="q-options">';
      let optList = item.querySelector('.list-unstyled-checkbox, .list-unstyled-radio');
      if (!optList) {
        const itemBody = item.querySelector('.item-body');
        if (itemBody) {
          optList = itemBody.querySelector('.list-unstyled-checkbox, .list-unstyled-radio');
        }
      }

      if (optList) {
        const optItems = optList.querySelectorAll('li');
        if (optItems.length > 0) {
          optItems.forEach((optItem) => {
            const labelNode = optItem.querySelector('.checkboxInput, .radioInput');
            let label = '';
            if (labelNode) {
              const labelText = labelNode.innerText.trim();
              label = labelText.charAt(0) || labelText;
            }

            const contentNode = optItem.querySelector('.checkboxText, .radioText');
            let content = '';
            if (contentNode) {
              content = this.processContent(contentNode);
            }

            if (label || content) {
              optionsHtml += `<div class="q-opt"><span class="q-opt-label">${label}.</span><div class="q-opt-content">${content}</div></div>`;
            }
          });
        } else {
          optionsHtml += `<div style="color:#999; font-style:italic; font-size:12px;">[主观题]</div>`;
        }
      } else {
        optionsHtml += `<div style="color:#999; font-style:italic; font-size:12px;">[主观题]</div>`;
      }

      optionsHtml += '</div>';
      return {
        meta: metaText,
        body: bodyHtml,
        options: optionsHtml,
        images: []
      };
    }

    buildModals() {
      return `<div class="modal" id="aiConfigModal"><div class="modal-content"><h3>AI 配置</h3><div class="cfg-row"><label class="cfg-label">API URL</label><input type="text" id="aiUrl" class="cfg-input" placeholder="https://api.openai.com/v1"></div><div class="cfg-row"><label class="cfg-label">API Key</label><input type="password" id="aiKey" class="cfg-input" placeholder="sk-..."></div><div class="cfg-row"><label class="cfg-label">Model</label><input type="text" id="aiModel" class="cfg-input" placeholder="gpt-4o-mini"></div><div class="modal-buttons"><button class="btn" onclick="window.closeAIConfig()">取消</button><button class="btn" onclick="window.saveAIConfig()">保存</button></div></div></div>`;
    }

    getScripts() {
      return `
        // Polyfills: Notification 与 requestController（新窗口环境）
        (function(){
          // 初始化 Notification 对象
          window.Notification = window.Notification || {};
          if(typeof window.Notification.success !== 'function'){
            window.Notification.show = function(message, type = 'info', duration = 3000){
              try{
                const el = document.createElement('div');
                const bg = type==='success' ? '#27ae60' : (type==='error' ? '#e74c3c' : '#0050b3');
                el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:'+bg+';color:#fff;padding:12px 16px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10001;font-size:14px;';
                el.textContent = message;
                document.body.appendChild(el);
                setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, duration);
              }catch(e){ console.log((type||'INFO').toUpperCase()+':', message); }
            };
            window.Notification.success = function(m,d){ window.Notification.show(m,'success',d); };
            window.Notification.error = function(m,d){ window.Notification.show(m,'error',d); };
            window.Notification.info = function(m,d){ window.Notification.show(m,'info',d); };
          }
          
          // 初始化 requestController
          if(!window.requestController || typeof window.requestController.handleSolveMultiple !== 'function'){
            const active = new Set();
            function getQEl(id){ return document.querySelector('[data-index="'+id+'"]') || document.querySelector('[data-question-id="'+id+'"]'); }
            function clearOld(id){ const el=getQEl(id); if(!el) return; el.querySelectorAll('.ai-loading,.ai-error,.ai-result').forEach(n=>n.remove()); }
            function showLoading(id){ const el=getQEl(id); if(!el) return; const div=document.createElement('div'); div.className='ai-loading'; div.innerHTML='⏳ 正在调用 AI...'; const tools=el.querySelector('.ai-tools'); if(tools){ tools.after(div); } else { el.appendChild(div);} }
            function hideLoading(id){ const el=getQEl(id); if(!el) return; const n=el.querySelector('.ai-loading'); if(n) n.remove(); }
            window.requestController = {
              async handleSolveQuestion(id, data, solveFn){
                id=String(id);
                if(active.has(id)) return null;
                active.add(id);
                try{
                  clearOld(id);
                  showLoading(id);
                  const res = await solveFn(data);
                  hideLoading(id);
                  const el = getQEl(id);
                  if(el){
                    let container = el.querySelector('.ai-result');
                    if(container) container.remove();
                    container = document.createElement('div');
                    container.className='ai-result';
            if(res && res.duration){
              durationHtml = '<div class="ai-duration">用时：'+res.duration+'s</div>';
            }

            const md = window.markdownit();
            const solutionHtml = res.solution ? md.render(res.solution) : '无解答过程';

            container.innerHTML='<b>AI解答结果</b><div class="answer">答案：'+(res?.answer||'')+'</div><div class="thinking">解答过程：' + solutionHtml + '</div>'+durationHtml;
            el.appendChild(container);

            // 渲染代码和公式
            if (window.Prism) {
              window.Prism.highlightAllUnder(container);
            }
            if (window.renderMathInElement) {
              window.renderMathInElement(container, {
                delimiters: [
                  {left: "$", right: "$", display: true},
                  {left: "$", right: "$", display: false},
                  {left: "\\[", right: "\\]", display: true},
                  {left: "\\(", right: "\\)", display: false}
                ]
              });
            }
          }
                  return res;
                }catch(err){
                  hideLoading(id);
                  const el=getQEl(id);
                  if(el){ const div=document.createElement('div'); div.className='ai-error'; div.textContent='解析失败：'+(err?.message||String(err)); el.appendChild(div);} 
                  return null;
                }finally{ active.delete(id); }
              },
              async handleSolveMultiple(list, solveFn, opts={}){
                const maxConcurrent = opts.maxConcurrent || 30;
                const onProgress = opts.onProgress;
                let running=0, done=0; const queue=[...list]; const results=[];
                return await new Promise(resolve=>{
                  const next=()=>{
                    if(queue.length===0 && running===0){ resolve(results); return; }
                    while(running<maxConcurrent && queue.length>0){
                      const item=queue.shift(); running++;
                      window.requestController.handleSolveQuestion(item.id??item.index, item, solveFn)
                        .then(res=>{ results.push(res); })
                        .catch(err=>{ results.push({error:err?.message||String(err)}); })
                        .finally(()=>{ running--; done++; onProgress && onProgress(done, list.length); next(); });
                    }
                  };
                  next();
                });
              }
            };
          }
        })();

        // 布局管理
        window.setLayout=function(mode){
          const modeMap={'normal':'','compact':'compact-mode','ultra':'ultra-compact-mode'};
          document.body.className=modeMap[mode]||'';
          document.body.className=modeMap[mode]||'';
          chrome.storage.local.set({layoutMode: mode});
        };
        
        // Restore layout
        chrome.storage.local.get(['layoutMode'], (res) => {
            if(res.layoutMode) window.setLayout(res.layoutMode);
        });
        
        // 复制所有文本
        window.copyAll=function(){
          try{
            const items=document.querySelectorAll('.q-item');
            let text='';
            items.forEach((item,idx)=>{
              text+='题'+(idx+1)+':\\n';
              const body=item.querySelector('.q-body');
              if(body)text+=body.innerText+'\\n';
              const opts=item.querySelector('.q-options');
              if(opts)text+=opts.innerText+'\\n\\n'
            });
            navigator.clipboard.writeText(text).then(()=>{
              if(window.Notification && typeof window.Notification.success === 'function'){
                window.Notification.success('已复制所有题目文本！');
              }else{
                console.log('已复制所有题目文本！');
              }
            }).catch(err=>{
              if(window.Notification && typeof window.Notification.error === 'function'){
                window.Notification.error('复制失败：'+err.message);
              }else{
                console.error('复制失败：',err);
              }
            });
          }catch(err){
            if(window.Notification && typeof window.Notification.error === 'function'){
              window.Notification.error('复制失败：'+(err?.message||String(err)));
            }else{
              console.error('复制失败：',err);
            }
          }
        };
        
        // AI Logic
        window.openAIConfig = () => {
          document.getElementById('aiConfigModal').classList.add('show');
          const config = window.currentAIConfig || {};
          document.getElementById('aiUrl').value=config.url||'';
          document.getElementById('aiKey').value=config.key||'';
          document.getElementById('aiModel').value=config.model||'gpt-4o-mini';
        };
        
        // 关闭 AI 配置
        window.closeAIConfig=function(){
          document.getElementById('aiConfigModal').classList.remove('show')
        };
        
        // 保存 AI 配置
        window.saveAIConfig=function(){
          try{
            const config={
              url:document.getElementById('aiUrl').value,
              key:document.getElementById('aiKey').value,
              model:document.getElementById('aiModel').value
            };
            window.currentAIConfig = config;
            if(window.opener) {
               window.opener.postMessage({ type: 'SAVE_AI_CONFIG', config: config }, '*');
            }
            window.closeAIConfig();
            if(window.Notification && typeof window.Notification.success === 'function'){
                window.Notification.success('配置已更新 (请在原页面确认保存)');
            }
          }catch(err){
            if(window.Notification && typeof window.Notification.error === 'function'){
              window.Notification.error('保存失败：'+(err?.message||String(err)));
            }else{
              console.error('保存失败：',err);
            }
          }
        };
        
        // 轻量请求控制器（用于新窗口上下文）
        if(!window.requestController){
          window.requestController={
            active:new Set(),
            getItem:function(id){return document.querySelector('[data-index="'+id+'"]')||document.querySelector('[data-question-id="'+id+'"]')},
            clearOld:function(id){const el=this.getItem(id);if(!el)return;el.querySelectorAll('.ai-loading,.ai-error,.ai-result').forEach(n=>n.remove())},
            showLoading:function(id){const el=this.getItem(id);if(!el)return;const d=document.createElement('div');d.className='ai-loading';d.innerHTML='⏳ 正在调用 AI...';(el.querySelector('.ai-tools')||el).after?el.querySelector('.ai-tools').after(d):el.appendChild(d)},
            hideLoading:function(id){const el=this.getItem(id);if(!el)return;const d=el.querySelector('.ai-loading');if(d)d.remove()},
            renderSuccess:function(id,res){const el=this.getItem(id);if(!el)return;const c=document.createElement('div');c.className='ai-result';let durationHtml='';if(res.duration){durationHtml='<div class="ai-duration">用时：'+res.duration+'s</div>'}c.innerHTML='<b>AI解答结果</b><div class="answer">答案：'+(res.answer||'')+'</div><div class="thinking">解答过程：'+(res.solution||'')+'</div>'+durationHtml;el.appendChild(c)},
            renderError:function(id,err){const el=this.getItem(id);if(!el)return;const c=document.createElement('div');c.className='ai-error';c.innerHTML='解析失败：'+(err&&err.message?err.message:String(err));el.appendChild(c)},
            async handleSolveQuestion(id,data,solve){id=String(id);if(this.active.has(id))return null;this.active.add(id);try{this.clearOld(id);this.showLoading(id);const res=await solve(data);this.hideLoading(id);this.renderSuccess(id,res);return res}catch(e){this.hideLoading(id);this.renderError(id,e);return null}finally{this.active.delete(id)}},
            async handleSolveMultiple(list,solve,opt={maxConcurrent:30,onProgress:null}){const q=[...list];let running=0,done=0;return await new Promise(resolve=>{const next=()=>{if(q.length===0&&running===0){resolve();return}if(running>=(opt.maxConcurrent||3)||q.length===0)return;running++;const it=q.shift();this.handleSolveQuestion(it.id||it.index,it,solve).then(()=>{done++;if(opt.onProgress)opt.onProgress(done,list.length)}).finally(()=>{running--;next()});};for(let i=0;i<Math.min(opt.maxConcurrent||30,q.length);i++)next();});}
          };
        }
        
    // 单个题目 AI 解析
    window.aiSolveOne=async function(index){
      const config = window.currentAIConfig;
      if(!config.url||!config.key||!config.model){
        window.Notification.error('请先配置 AI 参数（API URL、Key、Model）');
        window.openAIConfig();
        return
      }
      
      const item=document.querySelector('[data-index="'+index+'"]');
      if(!item)return;
      
      const metaText = item.querySelector('.q-meta').innerText;
      const bodyText=item.querySelector('.q-body').innerText;
      const optionsText=item.querySelector('.q-options').innerText;
      
      const questionData={metaText: metaText, bodyText:bodyText,optionsText:optionsText,images:[]};
      
      await window.requestController.handleSolveQuestion(
        index,
        questionData,
        async(data)=>{
          // 记录总耗时开始时间
          const startTime = performance.now();
          
          const systemPrompt = '你是一个专业的题目解答助手，擅长解答各类学科题目。';
          const formatInstructions = '请严格按照以下 JSON 格式回答，不要添加任何其他文本：\\n{"answer": "答案内容（选项字母如A/B/C/D或填空内容，多选题必须列出所有正确答案，如A,B,C）", "solution": "问题的简洁清晰的解答过程"}\\n\\n特别提醒：\\n- 如果这是多选题，必须给出全部的正确答案，不要遗漏任何选项！\\n- 如果这是单选题，只需给出一个答案\\n- 如果这是主观题，请给出完整的答案内容\\n\\n格式要求说明（仅适用于 solution 字段内容）：\\n1. 如果需要输出数学公式，使用 KaTeX 兼容格式（行内公式用 $公式$，显示公式用 $公式$）\\n2. 如果需要输出代码，使用 Prism.js 兼容格式（\`\`\`语言\\\\n代码\\\\n\`\`\`）\\n3. 其他内容使用 Markdown 格式（支持标题、列表、加粗、斜体等）';
          
          const content=[{type:'text',text:'题干：[' + data.metaText + '] ' + data.bodyText + '\\n\\n选项：\\n' + data.optionsText + '\\n\\n' + formatInstructions}];
          
          const response=await fetch(config.url+'/chat/completions',{
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.key},
            body:JSON.stringify({model:config.model,messages:[{role:'system',content:systemPrompt},{role:'user',content:content}],temperature:0.7,max_tokens:50000})
          });
          
          if(!response.ok){
            const err=await response.json();
            throw new Error(err.error?.message||'API 请求失败')
          }
          
          const data_resp=await response.json();
          const text=(data_resp.choices&&data_resp.choices[0]&&(data_resp.choices[0].message?.content||data_resp.choices[0].text))||'';
          
          if(!text)throw new Error('AI 返回空响应');
          
          let result=null;
          try{result=JSON.parse(text)}catch(e){
            const jsonMatch=text.match(/{[\\s\\S]*}/);
            if(jsonMatch){
              try{result=JSON.parse(jsonMatch[0])}catch(e2){
                const answerMatch=text.match(/"answer"\\s*:\\s*"((?:[^"\\\\]|\\\\\\\\.)*?)"/);
                const solutionMatch=text.match(/"solution"\\s*:\\s*"((?:[^"\\\\]|\\\\\\\\.)*?)"/);
                if(answerMatch&&answerMatch[1]){
                  result={answer:answerMatch[1],solution:solutionMatch?solutionMatch[1]:'无解答过程'}
                }else{throw new Error('无法解析 AI 返回的 JSON')}
              }
            }else{throw new Error('AI 返回格式错误')}
          }
          
          // 计算耗时
          const endTime = performance.now();
          const duration = ((endTime - startTime) / 1000).toFixed(2);
          
          return {
            ...result,
            duration: duration
          };
        }
      );
    };
        
        // 批量 AI 解析
    window.aiSolveAll=async function(){
      const config = window.currentAIConfig;
      if(!config.url||!config.key||!config.model){
        window.Notification.error('请先配置 AI 参数（API URL、Key、Model）');
        window.openAIConfig();
        return
      }
      
      const items=document.querySelectorAll('.q-item');
      if(items.length===0){window.Notification.info('没有题目可以解析');return}
      
      const questionsData=[];
      items.forEach((item,index)=>{
        const metaText = item.querySelector('.q-meta').innerText;
        const bodyText=item.querySelector('.q-body').innerText;
        const optionsText=item.querySelector('.q-options').innerText;
        questionsData.push({id:index, metaText: metaText, bodyText:bodyText,optionsText:optionsText,images:[]})
      });
      
      const btns=document.querySelectorAll('.ai-btn');
      btns.forEach(btn=>btn.disabled=true);
      
      try{
        if(!window.requestController || typeof window.requestController.handleSolveMultiple !== 'function'){
          throw new Error('requestController 未初始化');
        }
        
        await window.requestController.handleSolveMultiple(
          questionsData,
          async(data)=>{
            // 记录总耗时开始时间
            const startTime = performance.now();
            
            const systemPrompt = '你是一个专业的题目解答助手，擅长解答各类学科题目。';
            const formatInstructions = '请严格按照以下 JSON 格式回答，不要添加任何其他文本：\\n{"answer": "答案内容（选项字母如A/B/C/D或填空内容，多选题必须列出所有正确答案，如A,B,C）", "solution": "问题的简洁清晰的解答过程"}\\n\\n特别提醒：\\n- 如果这是多选题，必须给出全部的正确答案，不要遗漏任何选项！\\n- 如果这是单选题，只需给出一个答案\\n- 如果这是主观题，请给出完整的答案内容\\n\\n格式要求说明（仅适用于 solution 字段内容）：\\n1. 如果需要输出数学公式，使用 KaTeX 兼容格式（行内公式用 $公式$，显示公式用 $公式$）\\n2. 如果需要输出代码，使用 Prism.js 兼容格式（\`\`\`语言\\\\n代码\\\\n\`\`\`）\\n3. 其他内容使用 Markdown 格式（支持标题、列表、加粗、斜体等）';
            
            const content=[{type:'text',text:'题干：[' + data.metaText + '] ' + data.bodyText + '\\n\\n选项：\\n' + data.optionsText + '\\n\\n' + formatInstructions}];
            
            const response=await fetch(config.url+'/chat/completions',{
              method:'POST',
              headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.key},
              body:JSON.stringify({model:config.model,messages:[{role:'system',content:systemPrompt},{role:'user',content:content}],temperature:0.7,max_tokens:50000})
            });
            
            if(!response.ok){
              const err=await response.json();
              throw new Error(err.error?.message||'API 请求失败')
            }
            
            const data_resp=await response.json();
            const text=(data_resp.choices&&data_resp.choices[0]&&(data_resp.choices[0].message?.content||data_resp.choices[0].text))||'';
            
            if(!text)throw new Error('AI 返回空响应');
            
            let result=null;
            try{result=JSON.parse(text)}catch(e){
              const jsonMatch=text.match(/{[\\s\\S]*}/);
              if(jsonMatch){
                try{result=JSON.parse(jsonMatch[0])}catch(e2){
                  const answerMatch=text.match(/"answer"\\s*:\\s*"((?:[^"\\\\]|\\\\\\\\.)*?)"/);
                  const solutionMatch=text.match(/"solution"\\s*:\\s*"((?:[^"\\\\]|\\\\\\\\.)*?)"/);
                  if(answerMatch&&answerMatch[1]){
                    result={answer:answerMatch[1],solution:solutionMatch?solutionMatch[1]:'无解答过程'}
                  }else{throw new Error('无法解析 AI 返回的 JSON')}
                }
              }else{throw new Error('AI 返回格式错误')}
            }
            
            // 计算耗时
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            return {
              ...result,
              duration: duration
            };
          },
          {maxConcurrent:30,onProgress:(completed,total)=>{console.log('进度：'+completed+'/'+total)}}
        );
        
        window.Notification.success('全部题目解析完成！')
      }catch(err){
        window.Notification.error('批量解析失败：'+(err?.message||String(err)));
      }finally{
        btns.forEach(btn=>btn.disabled=false);
      }
    };
        
        // 导出所有图片
        window.exportAllImages=async function(){
          try{
            const items=document.querySelectorAll('.q-item');
            const imageUrls=[];
            
            items.forEach(item=>{
              const imgs=item.querySelectorAll('img');
              imgs.forEach(img=>{
                const src=img.src;
                if(src&&src.startsWith('http'))imageUrls.push(src)
              })
            });
            
            if(imageUrls.length===0){
              window.Notification.info('没有找到可导出的图片');
              return
            }
            
            window.Notification.info('开始导出 '+imageUrls.length+' 张图片，浏览器会逐个下载');
            
            for(let i=0;i<imageUrls.length;i++){
              const url=imageUrls[i];
              try{
                const response=await fetch(url);
                const blob=await response.blob();
                const blobUrl=URL.createObjectURL(blob);
                const a=document.createElement('a');
                a.href=blobUrl;
                const filename=url.split('/').pop().split('?')[0]||'image-'+(i+1)+'.png';
                a.download=filename;
                
                setTimeout(()=>{
                  a.click();
                  URL.revokeObjectURL(blobUrl)
                },i*200)
              }catch(err){
                console.warn('图片下载失败：',url,err)
              }
            }
          }catch(err){
            window.Notification.error('导出图片失败：'+(err?.message||String(err)));
          }
        };
        
        // 初始化布局
        const layoutMode=localStorage.getItem('layoutMode')||'normal';
        window.setLayout(layoutMode)
      `;
    }
  }

  // ============ 主程序 ============

  /**
   * 初始化并运行应用
   */
  async function init() {
    try {
      window.__YKT_EXTRACTOR_INITTED__ = true;

      console.log('开始初始化雨课堂考试助手...');

      // 创建请求控制器
      const requestController = new RequestController();
      window.requestController = requestController;
      console.log('✅ RequestController 已初始化');

      // 创建配置管理器
      const configManager = new ConfigManager();
      const config = await configManager.loadAppConfig();
      console.log('✅ 配置加载成功');

      // 创建检测器
      const detector = new QuestionDetector(configManager);
      const { items, mode, count } = await detector.detect();

      if (count === 0) {
        console.warn('⚠️ 未找到任何题目元素，可能原因：');
        console.warn('  1. 页面还未完全加载');
        console.warn('  2. 题目选择器配置不正确');
        console.warn('  3. 当前页面不是题目页面');
        console.warn('请在浏览器控制台查看上面的"页面结构信息"来调试');
        return;
      }

      console.log(`✅ 检测到 ${count} 个${mode === 'ppt' ? 'PPT' : '题目'}元素`);

      if (mode === 'ppt') {
        const extractor = new DataExtractor(configManager);
        const renderer = new PPTRenderer(items, config);
        renderer.render();
      } else if (mode === 'question') {
        const extractor = new DataExtractor(configManager);
        const aiConfig = await new Promise(resolve => chrome.storage.local.get(['aiConfig'], res => resolve(res.aiConfig || {})));

        const renderer = new QuestionRenderer(items, config, {
          aiSolver: null, // Placeholder if needed
          layoutManager: null, // Placeholder
          extractor: extractor
        }, aiConfig);
        renderer.render();
      }
      console.log('✅ 渲染完成');

    } catch (error) {
      console.error('❌ 应用初始化错误:', error);
      console.error('错误堆栈:', error.stack);
    }
  }

  // 暴露 init 函数到全局作用域，供插件按钮点击时调用
  window.__YKT_INIT__ = init;

  console.log('✅ 雨课堂考试助手已加载，请点击插件按钮激活');
})();
