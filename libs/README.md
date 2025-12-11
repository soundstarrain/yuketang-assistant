# 外部库文件

本文件夹存储所有第三方库的本地副本，以满足 CSP（内容安全策略）的要求。

## 包含的库

### 1. markdown-it
- **版本**: 13.0.1
- **文件**:
  - `markdown-it.min.js` - markdown-it 主库

### 2. KaTeX
- **版本**: 0.16.8
- **文件**:
  - `katex.min.js` - KaTeX 主库
  - `auto-render.min.js` - KaTeX 自动渲染扩展
  - `katex.min.css` - KaTeX 样式

### 3. Prism.js
- **版本**: 1.29.0
- **文件**:
  - `prism.min.js` - Prism.js 主库
  - `prism-tomorrow.min.css` - Prism.js 主题样式
  - `components/prism-*.min.js` - 语言支持包

## 使用方式

所有库文件通过相对路径在 HTML 中引入：

```html
<!-- markdown-it -->
<script src="../libs/markdown-it.min.js"></script>

<!-- KaTeX -->
<script src="../libs/katex.min.js"></script>
<script src="../libs/auto-render.min.js"></script>
<link rel="stylesheet" href="../libs/katex.min.css">

<!-- Prism.js -->
<script src="../libs/prism.min.js"></script>
<script src="../libs/components/prism-javascript.min.js"></script>
<!-- ... 其他语言包 -->
<link rel="stylesheet" href="../libs/prism-tomorrow.min.css">
```

## CSP 兼容性

使用本地文件后，不再需要在 CSP 规则中添加 CDN 域名，只需要 `'self'` 即可。

