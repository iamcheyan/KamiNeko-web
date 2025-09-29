class MarkdownEditor {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
        this.isDarkTheme = false;
        this.fontSize = 14;
        this.leftMode = 'edit'; // 'edit' or 'preview'
        this.rightMode = 'edit'; // 'edit' or 'preview'
        this.autoSaveTimer = null; // 自动保存定时器
        this.autoSaveDelay = 2000; // 2秒后自动保存
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupMarked();
        this.loadSettings();
        this.loadTabs().then(() => {
            // 如果没有标签，创建一个默认标签
            if (this.tabs.length === 0) {
                this.createNewTab();
            }
        });
    }
    
    initializeElements() {
        this.tabsContainer = document.getElementById('tabs');
        this.newTabBtn = document.getElementById('newTabBtn');
        this.textEditor = document.getElementById('textEditor');
        this.markdownEditor = document.getElementById('markdownEditor');
        this.textPreview = document.getElementById('textPreview');
        this.markdownPreview = document.getElementById('markdownPreview');
        this.leftModeToggle = document.getElementById('leftModeToggle');
        this.rightModeToggle = document.getElementById('rightModeToggle');
        this.themeToggle = document.getElementById('themeToggle');
        this.saveBtn = document.getElementById('saveBtn');
        this.fontSizeSlider = document.getElementById('fontSizeSlider');
        this.fontSizeValue = document.getElementById('fontSizeValue');
        this.resizeHandle = document.getElementById('resizeHandle');
        this.editorPane = document.querySelector('.editor-pane');
        this.previewPane = document.querySelector('.preview-pane');
    }
    
    setupEventListeners() {
        // 新建标签
        this.newTabBtn.addEventListener('click', () => this.createNewTab());
        
        // 编辑器内容变化
        this.textEditor.addEventListener('input', () => {
            this.updateFromText();
            this.scheduleAutoSave();
        });
        this.markdownEditor.addEventListener('input', () => {
            this.updateFromMarkdown();
            this.scheduleAutoSave();
        });
        
        // 模式切换
        this.leftModeToggle.addEventListener('click', () => this.toggleLeftMode());
        this.rightModeToggle.addEventListener('click', () => this.toggleRightMode());
        
        // 主题切换
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // 保存
        this.saveBtn.addEventListener('click', () => this.saveAllTabs());
        
        // 字号调整
        this.fontSizeSlider.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveAllTabs();
            }
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.createNewTab();
            }
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (this.activeTabId) {
                    this.closeTab(this.activeTabId);
                }
            }
        });
        
        // 窗口关闭前保存
        window.addEventListener('beforeunload', () => {
            this.saveAllTabs();
            this.saveSettings();
        });
        
        // 调整分栏大小
        this.setupResizeHandle();
        
        // 设置标签拖拽排序
        this.setupTabSorting();
    }
    
    setupMarked() {
        // 配置 marked
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {}
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
    }
    
    setupResizeHandle() {
        let isResizing = false;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const containerRect = document.querySelector('.editor-container').getBoundingClientRect();
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                this.editorPane.style.flex = `0 0 ${newLeftWidth}%`;
                this.previewPane.style.flex = `0 0 ${100 - newLeftWidth}%`;
            }
        };
        
        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
    
    setupTabSorting() {
        new Sortable(this.tabsContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: (evt) => {
                // 重新排序标签数组
                const movedTab = this.tabs.splice(evt.oldIndex, 1)[0];
                this.tabs.splice(evt.newIndex, 0, movedTab);
                this.saveSettings();
            }
        });
    }
    
    createNewTab() {
        const tabId = `tab_${++this.tabCounter}`;
        const tab = {
            id: tabId,
            title: `便签 ${this.tabCounter}`,
            textContent: '',
            markdownContent: '',
            created: new Date().toISOString()
        };
        
        this.tabs.push(tab);
        this.renderTabs();
        this.switchToTab(tabId);
        this.saveTab(tab);
    }
    
    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = this.tabs[tabIndex];
        
        // 从数组中移除（但不删除文件）
        this.tabs.splice(tabIndex, 1);
        
        // 如果关闭的是当前活动标签
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                // 切换到相邻标签
                const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
                this.switchToTab(this.tabs[newActiveIndex].id);
            } else {
                // 如果没有标签了，创建一个新的
                this.activeTabId = null;
                this.textEditor.value = '';
                this.markdownEditor.value = '';
                this.updateLeftPane();
                this.updateRightPane();
                this.createNewTab();
            }
        }
        
        this.renderTabs();
        this.saveSettings();
    }

    deleteTab(tabId) {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = this.tabs[tabIndex];
        
        // 确认删除
        if (!confirm(`确定要删除标签 "${tab.title}" 及其文件吗？此操作不可恢复。`)) {
            return;
        }
        
        // 删除对应的JSON文件
        this.deleteTabFile(tabId);
        
        // 从数组中移除
        this.tabs.splice(tabIndex, 1);
        
        // 如果删除的是当前活动标签
        if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
                // 切换到相邻标签
                const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
                this.switchToTab(this.tabs[newActiveIndex].id);
            } else {
                // 如果没有标签了，创建一个新的
                this.activeTabId = null;
                this.textEditor.value = '';
                this.markdownEditor.value = '';
                this.updateLeftPane();
                this.updateRightPane();
                this.createNewTab();
            }
        }
        
        this.renderTabs();
        this.saveSettings();
    }
    
    switchToTab(tabId) {
        // 保存当前标签内容
        if (this.activeTabId) {
            const currentTab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (currentTab) {
                currentTab.textContent = this.textEditor.value;
                currentTab.markdownContent = this.markdownEditor.value;
            }
        }
        
        // 切换到新标签
        this.activeTabId = tabId;
        const tab = this.tabs.find(tab => tab.id === tabId);
        if (tab) {
            this.textEditor.value = tab.textContent || '';
            this.markdownEditor.value = tab.markdownContent || '';
            this.updateLeftPane();
            this.updateRightPane();
        }
        
        this.renderTabs();
    }
    
    renderTabs() {
        this.tabsContainer.innerHTML = '';
        
        this.tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab ${tab.id === this.activeTabId ? 'active' : ''}`;
            tabElement.innerHTML = `
                <span class="tab-title">${tab.title}</span>
                <div class="tab-buttons">
                    <button class="tab-close" onclick="editor.closeTab('${tab.id}')" title="关闭标签">×</button>
                    <button class="tab-delete" onclick="editor.deleteTab('${tab.id}')" title="删除标签和文件">🗑️</button>
                </div>
            `;
            
            tabElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close') && !e.target.classList.contains('tab-delete')) {
                    this.switchToTab(tab.id);
                }
            });
            
            // 双击重命名
            tabElement.querySelector('.tab-title').addEventListener('dblclick', () => {
                this.renameTab(tab.id);
            });
            
            this.tabsContainer.appendChild(tabElement);
        });
    }
    
    renameTab(tabId) {
        const tab = this.tabs.find(tab => tab.id === tabId);
        if (!tab) return;
        
        const newTitle = prompt('请输入新的标签名称:', tab.title);
        if (newTitle && newTitle.trim()) {
            tab.title = newTitle.trim();
            this.renderTabs();
            this.saveTab(tab);
        }
    }
    
    toggleLeftMode() {
        this.leftMode = this.leftMode === 'edit' ? 'preview' : 'edit';
        this.updateLeftPane();
        this.leftModeToggle.textContent = this.leftMode === 'edit' ? '📝' : '👁️';
    }
    
    toggleRightMode() {
        this.rightMode = this.rightMode === 'edit' ? 'preview' : 'edit';
        this.updateRightPane();
        this.rightModeToggle.textContent = this.rightMode === 'edit' ? '📝' : '👁️';
    }
    
    updateLeftPane() {
        if (this.leftMode === 'edit') {
            this.textEditor.style.display = 'block';
            this.textPreview.style.display = 'none';
        } else {
            this.textEditor.style.display = 'none';
            this.textPreview.style.display = 'block';
            // 将markdown内容渲染为HTML显示在左侧预览
            const markdownContent = this.markdownEditor.value;
            this.textPreview.innerHTML = marked.parse(markdownContent);
            this.highlightCode(this.textPreview);
        }
    }
    
    updateRightPane() {
        if (this.rightMode === 'edit') {
            this.markdownEditor.style.display = 'block';
            this.markdownPreview.style.display = 'none';
        } else {
            this.markdownEditor.style.display = 'none';
            this.markdownPreview.style.display = 'block';
            // 将文本内容转换为markdown并渲染
            const textContent = this.textEditor.value;
            const markdownContent = this.textToMarkdown(textContent);
            this.markdownPreview.innerHTML = marked.parse(markdownContent);
            this.highlightCode(this.markdownPreview);
        }
    }
    
    updateFromText() {
        const textContent = this.textEditor.value;
        const markdownContent = this.textToMarkdown(textContent);
        this.markdownEditor.value = markdownContent;
        
        // 更新预览
        this.updateLeftPane();
        this.updateRightPane();
        
        // 保存当前标签内容
        this.saveCurrentTabContent();
    }
    
    updateFromMarkdown() {
        const markdownContent = this.markdownEditor.value;
        const textContent = this.markdownToText(markdownContent);
        this.textEditor.value = textContent;
        
        // 更新预览
        this.updateLeftPane();
        this.updateRightPane();
        
        // 保存当前标签内容
        this.saveCurrentTabContent();
    }
    
    textToMarkdown(text) {
        // 简单的文本到Markdown转换
        return text
            .split('\n')
            .map(line => {
                line = line.trim();
                if (!line) return '';
                
                // 检测标题（以多个#开头或全大写短行）
                if (line.match(/^#{1,6}\s/)) {
                    return line;
                } else if (line.length < 50 && line === line.toUpperCase() && line.match(/[A-Z]/)) {
                    return `## ${line}`;
                }
                // 检测列表项
                else if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
                    return line.replace(/^[-*•]\s/, '- ');
                }
                // 普通段落
                else {
                    return line;
                }
            })
            .join('\n');
    }
    
    markdownToText(markdown) {
        // 简单的Markdown到文本转换
        return markdown
            .replace(/^#{1,6}\s+/gm, '') // 移除标题标记
            .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
            .replace(/\*(.*?)\*/g, '$1') // 移除斜体
            .replace(/`(.*?)`/g, '$1') // 移除行内代码
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
            .replace(/^[-*+]\s+/gm, '• ') // 转换列表标记
            .replace(/^\d+\.\s+/gm, '• '); // 转换数字列表
    }
    
    highlightCode(element) {
        element.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
    
    saveCurrentTabContent() {
        if (this.activeTabId) {
            const tab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (tab) {
                tab.textContent = this.textEditor.value;
                tab.markdownContent = this.markdownEditor.value;
            }
        }
    }

    scheduleAutoSave() {
        // 清除之前的定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // 设置新的定时器
        this.autoSaveTimer = setTimeout(() => {
            this.autoSaveCurrentTab();
        }, this.autoSaveDelay);
    }

    async autoSaveCurrentTab() {
        if (!this.activeTabId) return;
        
        const tab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (tab) {
            // 更新标签内容
            this.saveCurrentTabContent();
            
            try {
                // 保存到服务器
                await this.saveTab(tab);
                
                // 显示自动保存提示
                this.showAutoSaveIndicator();
            } catch (error) {
                console.error('自动保存失败:', error);
            }
        }
    }

    showAutoSaveIndicator() {
        // 临时显示保存状态
        const originalText = this.saveBtn.textContent;
        this.saveBtn.textContent = '✓';
        this.saveBtn.classList.add('saved');
        
        setTimeout(() => {
            this.saveBtn.textContent = originalText;
            this.saveBtn.classList.remove('saved');
        }, 1000);
    }
    
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        this.themeToggle.textContent = this.isDarkTheme ? '☀️' : '🌙';
        
        // 切换代码高亮主题
        const highlightTheme = document.getElementById('highlight-theme');
        highlightTheme.href = this.isDarkTheme 
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        
        this.saveSettings();
    }
    
    updateFontSize(size) {
        this.fontSize = parseInt(size);
        this.fontSizeValue.textContent = `${this.fontSize}px`;
        this.textEditor.style.fontSize = `${this.fontSize}px`;
        this.markdownEditor.style.fontSize = `${this.fontSize}px`;
        this.saveSettings();
    }
    
    saveAllTabs() {
        this.saveBtn.classList.add('saving');
        this.saveBtn.textContent = '💾 保存中...';
        
        // 保存当前编辑器内容到活动标签
        if (this.activeTabId) {
            const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (activeTab) {
                activeTab.textContent = this.textEditor.value;
                activeTab.markdownContent = this.markdownEditor.value;
            }
        }
        
        // 保存所有标签
        this.tabs.forEach(tab => this.saveTab(tab));
        this.saveSettings();
        
        // 显示保存完成状态
        setTimeout(() => {
            this.saveBtn.classList.remove('saving');
            this.saveBtn.classList.add('saved');
            this.saveBtn.textContent = '💾 已保存';
            
            setTimeout(() => {
                this.saveBtn.classList.remove('saved');
                this.saveBtn.textContent = '💾';
            }, 1000);
        }, 300);
    }
    
    async saveTab(tab) {
        const tabData = {
            id: tab.id,
            title: tab.title,
            textContent: tab.textContent || '',
            markdownContent: tab.markdownContent || '',
            created: tab.created,
            modified: new Date().toISOString()
        };
        
        // 保存到localStorage
        localStorage.setItem(`kamineko_tab_${tab.id}`, JSON.stringify(tabData));
        console.log(`标签 ${tab.title} 已保存到本地存储`);
    }

    async deleteTabFile(tabId) {
        // 从localStorage删除
        localStorage.removeItem(`kamineko_tab_${tabId}`);
        console.log(`标签文件 ${tabId} 已从本地存储删除`);
    }

    async loadTabs() {
        const settings = this.loadSettings();
        let tabIds = settings.tabOrder || [];
        
        // 从localStorage加载标签
        tabIds.forEach(tabId => {
            const tabData = localStorage.getItem(`kamineko_tab_${tabId}`);
            if (tabData) {
                try {
                    const tab = JSON.parse(tabData);
                    this.tabs.push(tab);
                    this.tabCounter = Math.max(this.tabCounter, parseInt(tab.id.split('_')[1]) || 0);
                } catch (e) {
                    console.error('Failed to load tab from localStorage:', tabId, e);
                }
            }
        });
        
        console.log(`从本地存储加载了 ${this.tabs.length} 个标签`);
        
        // 设置活动标签
        if (settings.activeTabId && this.tabs.find(tab => tab.id === settings.activeTabId)) {
            this.activeTabId = settings.activeTabId;
        } else if (this.tabs.length > 0) {
            this.activeTabId = this.tabs[0].id;
        }
        
        this.renderTabs();
        
        // 加载活动标签内容
        if (this.activeTabId) {
            const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (activeTab) {
                this.textEditor.value = activeTab.textContent || '';
                this.markdownEditor.value = activeTab.markdownContent || '';
                this.updateLeftPane();
                this.updateRightPane();
            }
        }
        
        // 应用字号设置
        if (this.fontSize) {
            this.textEditor.style.fontSize = `${this.fontSize}px`;
            this.markdownEditor.style.fontSize = `${this.fontSize}px`;
        }
    }
    
    saveSettings() {
        const settings = {
            isDarkTheme: this.isDarkTheme,
            fontSize: this.fontSize,
            activeTabId: this.activeTabId,
            tabOrder: this.tabs.map(tab => tab.id)
        };
        
        localStorage.setItem('kamineko_settings', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('kamineko_settings') || '{}');
            
            // 应用主题
            if (settings.isDarkTheme) {
                this.isDarkTheme = true;
                document.documentElement.setAttribute('data-theme', 'dark');
                this.themeToggle.textContent = '☀️';
                const highlightTheme = document.getElementById('highlight-theme');
                highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
            }
            
            // 应用字号
            if (settings.fontSize) {
                this.fontSize = settings.fontSize;
                this.fontSizeSlider.value = this.fontSize;
                this.fontSizeValue.textContent = `${this.fontSize}px`;
                this.textEditor.style.fontSize = `${this.fontSize}px`;
                this.markdownEditor.style.fontSize = `${this.fontSize}px`;
            }
            
            return settings;
        } catch (e) {
            console.error('Failed to load settings:', e);
            return {};
        }
    }
}

// 初始化应用
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new MarkdownEditor();
});

// 导出到全局作用域以便HTML中的事件处理器使用
window.editor = editor;