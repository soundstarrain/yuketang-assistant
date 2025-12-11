# 项目技术文档

本文档提供了“雨课堂试题提取工具”的详细技术说明，旨在帮助开发者理解项目架构、代码实现和未来扩展方向。

---

## 1. 项目架构概述

本插件是一个基于 Manifest V3 标准的浏览器扩展，完全使用原生 JavaScript (ES6+) 编写，没有依赖任何外部构建工具（如 Webpack、Vite）。

其核心工作流程如下：

1.  **内容脚本注入 (`content.js`)**：当用户访问雨课堂的目标页面时，`content.js` 和相关的库文件会被注入到页面中。
2.  **用户激活**：用户点击浏览器工具栏的插件图标，触发 `background.js` 中的服务工作线程。
3.  **执行提取**：`background.js` 向当前激活的标签页注入并执行 `init()` 函数（该函数在 `content.js` 中定义）。
4.  **DOM 分析与数据提取**：`init()` 函数调用一系列模块，对页面的 DOM 结构进行分析，提取出题目或 PPT 的数据。
5.  **渲染新页面**：提取完成后，插件会创建一个新的 `blob:` URL 页面，并将提取到的数据渲染成一个结构化的 HTML 页面供用户查看和交互。
6.  **AI 解答与富文本渲染**：在新页面中，用户可以调用 AI 进行解题。返回的包含 Markdown、KaTeX 公式和代码块的文本，会由页面内嵌的 `markdown-it`、`KaTeX` 和 `Prism.js` 库进行解析和渲染。

## 2. 主要文件职责

-   **`manifest.json`**: 插件的入口和配置文件。定义了插件的名称、版本、权限、内容脚本、背景脚本以及 `web_accessible_resources`（Web 可访问资源）。
-   **`content.js`**: **核心业务逻辑文件**。包含了所有用于检测、提取、渲染和交互的类和函数。
-   **`background.js`**: 背景服务工作线程。主要职责是监听插件图标的点击事件，并在合适的时机触发 `content.js` 中的提取逻辑。
-   **`libs/`**: 存放所有第三方库文件。
    -   `katex.min.js`, `katex.min.css`, `fonts/*`: KaTeX 库，用于渲染数学公式及其所需的字体文件。
    -   `markdown-it.min.js`: 用于将 Markdown 文本转换为 HTML。
    -   `prism.min.js`, `prism-tomorrow.min.css`: Prism.js 库，用于代码块的语法高亮。
    -   `auto-render.min.js`: KaTeX 的自动渲染插件。
-   **`download_fonts.js`**: 一个辅助性的 Node.js 脚本，用于从 CDN 自动下载 KaTeX 所需的全部字体文件。

## 3. `content.js` 内部模块详解

`content.js` 采用面向对象的设计，将不同职责划分到多个类中，以实现高内聚、低耦合。

-   **`ConfigManager` (配置管理器)**
    -   **职责**：管理整个应用的所有配置，如选择器、API 设置、UI 颜色等。
    -   **特点**：目前配置被硬编码在 `getDefaultConfig()` 方法中，未来可以轻松扩展为从 `storage` 或远程 JSON 文件加载。

-   **`QuestionDetector` (题目检测器)**
    -   **职责**：根据配置中的 CSS 选择器，在当前页面上检测是否存在题目或 PPT 元素，并判断当前应处于“题目模式”还是“PPT 模式”。

-   **`DataExtractor` (数据提取器)**
    -   **职责**：负责从检测到的 DOM 元素中，精确提取题干、选项、图片等信息。
    -   **核心方法**：`extractQuestionData()`，它组合了多个子提取方法（如 `extractMeta`, `extractBody`）来构建一个完整的题目数据对象。

-   **`BaseRenderer`, `PPTRenderer`, `QuestionRenderer` (渲染器)**
    -   **职责**：根据不同的模式（PPT 或题目），生成最终的 HTML 页面。
    -   `BaseRenderer` 定义了渲染器的基本接口。
    -   `PPTRenderer` 负责构建 PPT 模式的网格布局和交互逻辑。
    -   `QuestionRenderer` 负责构建题目模式的列表布局，并**关键性地**在新页面的 `<head>` 中引入了所有必需的 JS 和 CSS 库，以确保富文本渲染能够正常工作。

-   **`RequestController` (请求控制器)**
    -   **职责**：管理所有与 AI 相关的异步请求。提供并发控制、请求锁定（防止重复提交）、UI 状态管理（加载、成功、失败）等功能。

-   **`init()` (主函数)**
    -   **职责**：作为整个提取流程的入口点，按顺序实例化并调用上述所有模块，完成从检测到最终渲染的完整过程。

## 4. 关键技术点

-   **`web_accessible_resources`**: 这是 Manifest V3 的一个核心安全特性。由于插件创建的 `blob:` 页面被视为外部页面，它默认无法访问插件内部的任何资源。我们必须在 `manifest.json` 中明确声明所有需要被外部加载的资源（如 `libs/` 目录下的所有 JS、CSS 和字体文件），并设置 `matches: ["<all_urls>"]`，才能成功加载它们。

-   **富文本渲染流程**：
    1.  在 `QuestionRenderer` 中，通过 `<script>` 和 `<link>` 标签将 `markdown-it`, `KaTeX`, `Prism.js` 等库注入到新生成页面的 `head` 中。
    2.  当 AI 请求成功后，返回的解答文本 (`solution`) 首先经过 `window.markdownit().render()` 方法处理，将 Markdown 语法转换为 HTML。
    3.  将生成的 HTML 插入到页面的 DOM 中。
    4.  最后，依次调用 `window.Prism.highlightAllUnder()` 和 `window.renderMathInElement()`，对刚刚插入的内容进行代码高亮和数学公式渲染。

