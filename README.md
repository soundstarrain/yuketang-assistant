<h1 align="center">雨课堂考试助手</h1>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/%E9%9B%A8%E8%AF%BE%E5%A0%82%E8%80%83%E8%AF%95%E5%8A%A9%E6%89%8B/opldlldmnaccpklolglicclmikcheidd?pli=1"><img src="https://img.shields.io/chrome-web-store/v/opldlldmnaccpklolglicclmikcheidd.svg" alt="Chrome Web Store"></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-green.svg" alt="适配平台"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="许可证"></a>
</p>

<p align="center">
  <strong>本项目是一款基于雨课堂的 Chrome 扩展程序</strong><br/>
  <strong>集成试题自动抓取、API 自动化解题及全量内容（文本/图片）导出功能</strong>
</p>

## 界面预览

**考试模式预览（紧凑模式）：**

![题目模式截图](/preview3.png)

![题目模式截图](/preview1.png)

**试卷模式预览：**

![模式截图](/preview2.png)

## 核心功能

- **全场景支持**：
  - **题目提取**：不仅支持**测验/考试**页面，还能完美适配**查看试卷 (Result)** 页面，一键提取题目、选项、**正确答案及解析**。
  - **课件提取**：智能提取雨课堂课件中的每一页 PPT，支持拖拽排序、删除和一键拼接成长图。

- **AI 智能解答**：
  - **一键分析**：支持单题或批量调用大语言模型（如 Gemini 3.0 Proview 等）进行解答。
  - **格式兼容**：完美渲染 AI 返回的数学公式（KaTeX）、代码块（Prism.js）和 Markdown 格式。

- **灵活的布局与导出**：
  - **多种视图**：提供“正常”、“紧凑”和“超紧凑”三种布局，满足不同场景下的阅读和截图需求。
  - **内容导出**：轻松将题目复制为纯文本，或将题目中的所有图片批量导出到本地。

## 快速开始

### 方式一：Chrome 商店安装（推荐）

直接访问 Chrome 应用商店进行安装，享受自动更新：

> **[📥 点击前往 Chrome Web Store 安装](https://chromewebstore.google.com/detail/%E9%9B%A8%E8%AF%BE%E5%A0%82%E8%80%83%E8%AF%95%E5%8A%A9%E6%89%8B/opldlldmnaccpklolglicclmikcheidd?pli=1)**

⚠️ **注意**：由于应用商店的审核周期原因，**商店内的插件版本通常会落后 GitHub 仓库一个小版本**。如果您需要体验最新的功能特性或紧急修复，请使用下方的“手动安装”方式。

---

### 方式二：手动安装（最新版）

如果你需要使用 Github 仓库中的最新代码，可以通过“开发者模式”手动安装：

1.  **下载代码**：点击本页面右上角的 `Code` -> `Download ZIP`，下载并解压。
2.  **打开扩展管理**：在 Chrome 或 Edge 浏览器地址栏输入 `chrome://extensions/` 并回车。
3.  **开启开发者模式**：在页面右上角，打开“开发者模式” (Developer mode) 开关。
4.  **加载扩展**：点击“加载已解压的扩展程序” (Load unpacked) 按钮，选择刚刚解压的文件夹，并且固定到工具栏中。
5.  **安装成功**：插件图标会出现在工具栏中，安装完成！

### 使用说明

1.  登录并进入雨课堂的任意测验、试卷或课件页面。
2.  点击浏览器工具栏右上角的 **“雨课堂试题提取工具”** 图标。
3.  插件会自动在新标签页中为你呈现提取和整理后的内容。
4.  （可选）在打开的页面中，点击 **“API 配置”**，输入你的大语言模型 API 信息，即可启用 AI 解析。

## 支持项目

如果你觉得这个项目对你有帮助，请给我一个免费的 ⭐ Star！你的支持是我持续更新和改进的最大动力。

## 许可证

本项目采用 [GPLv3 License](LICENSE.txt) 开源。

## 免责声明

本项目仅供个人学习和技术研究使用，请在遵守相关法律法规和平台用户协议的前提下使用。请勿用于任何商业或违规用途。
