# KamiNeko 在线文本便签编辑器

一个功能丰富的在线 Markdown 便签编辑器，支持多标签管理、实时预览、主题切换等功能。

## ✨ 功能特性

- 📝 **Markdown 编辑器**: 支持完整的 Markdown 语法，左侧编辑，右侧实时预览
- 🎨 **代码高亮**: 使用 highlight.js 提供语法高亮支持
- 🔤 **字号调整**: 可拖动滑块调整编辑器字体大小
- 🌙 **主题切换**: 支持深色和浅色主题切换
- 📑 **多标签管理**: 
  - 支持创建、关闭、重命名标签
  - 标签可拖拽排序
  - 每个标签独立存储
- 💾 **本地存储**: 
  - 每个标签内容自动保存到 localStorage
  - 支持 Ctrl+S 手动保存所有标签
  - 关闭标签时自动删除对应数据
- 🔄 **自动恢复**: 启动时自动恢复上次打开的标签
- 📱 **响应式设计**: 支持桌面和移动设备

## 🚀 快速开始

### 在线使用

直接访问部署的网站即可使用，无需安装任何软件。

### 本地运行

1. 克隆或下载项目文件
2. 使用任意 HTTP 服务器运行项目，例如：
   ```bash
   # 使用 Python
   python -m http.server 8000
   
   # 使用 Node.js
   npx serve .
   
   # 使用 PHP
   php -S localhost:8000
   ```
3. 在浏览器中访问 `http://localhost:8000`

## 🎯 使用说明

### 基本操作

- **新建标签**: 点击顶部的 "+" 按钮或使用 `Ctrl+T`
- **关闭标签**: 点击标签上的 "×" 按钮或使用 `Ctrl+W`
- **切换标签**: 直接点击标签
- **重命名标签**: 双击标签标题
- **保存内容**: 点击保存按钮或使用 `Ctrl+S`

### 编辑功能

- **Markdown 语法**: 支持标题、列表、链接、图片、代码块等
- **代码高亮**: 在代码块中指定语言可获得语法高亮
- **实时预览**: 编辑内容会实时在右侧预览
- **字号调整**: 使用顶部滑块调整编辑器字体大小

### 主题和界面

- **主题切换**: 点击月亮/太阳图标切换深色/浅色主题
- **分栏调整**: 拖动中间的分隔线调整编辑器和预览的比例
- **标签排序**: 拖拽标签可重新排序

## 🛠️ 技术栈

- **前端框架**: 纯 JavaScript (ES6+)
- **Markdown 解析**: [marked.js](https://marked.js.org/)
- **代码高亮**: [highlight.js](https://highlightjs.org/)
- **拖拽排序**: [Sortable.js](https://sortablejs.github.io/Sortable/)
- **样式**: 纯 CSS3 (使用 CSS 变量支持主题切换)
- **存储**: localStorage (浏览器本地存储)

## 📁 项目结构

```
KamiNeko@web/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 主要逻辑
└── README.md          # 项目说明
```

## 🚀 部署到 GitHub Pages

1. 将项目上传到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择 `main` 分支作为源
4. 访问 `https://yourusername.github.io/repository-name`

### 自动部署配置

项目已配置为纯静态网站，无需额外的构建步骤，可直接部署到：

- GitHub Pages
- Netlify
- Vercel
- 任何静态网站托管服务

## 🔧 自定义配置

### 修改默认设置

在 `script.js` 中可以修改以下默认值：

```javascript
// 默认字体大小
this.fontSize = 14;

// 默认主题
this.isDarkTheme = false;

// 标签计数器起始值
this.tabCounter = 0;
```

### 添加自定义样式

在 `styles.css` 中的 CSS 变量部分可以自定义颜色主题：

```css
:root {
    --bg-primary: #ffffff;
    --text-primary: #212529;
    --accent-color: #007bff;
    /* ... 更多变量 */
}
```

## 📝 数据存储说明

- 所有数据存储在浏览器的 localStorage 中
- 每个标签对应一个独立的存储项
- 应用设置（主题、字号等）单独存储
- 清除浏览器数据会丢失所有内容
- 建议定期导出重要内容

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

- [marked.js](https://marked.js.org/) - Markdown 解析
- [highlight.js](https://highlightjs.org/) - 代码高亮
- [Sortable.js](https://sortablejs.github.io/Sortable/) - 拖拽排序