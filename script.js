class TextEditor {
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
        this.statusResetTimer = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupTabSorting();

        this.updateStatus('就绪');
        
        // 加载设置
        this.loadSettings();
        
        // 初始化后加载标签
        this.loadTabs().then(() => {
            // 如果没有标签，创建一个新标签
            if (this.tabs.length === 0) {
                this.createNewTab();
            }
        });
    }
    
    initializeElements() {
        this.tabsContainer = document.getElementById('tabs');
        this.newTabBtn = document.getElementById('newTabBtn');
        this.textEditor = document.getElementById('textEditor');
        this.themeToggle = document.getElementById('themeToggle');
        this.fontSizeSlider = document.getElementById('fontSizeSlider');
        this.fontSizeValue = document.getElementById('fontSizeValue');
        this.editorPane = document.querySelector('.editor-pane');
    }
    
    setupEventListeners() {
        // 新建标签
        this.newTabBtn.addEventListener('click', () => this.createNewTab());
        
        // 标签容器双击空白区域新建标签
        this.tabsContainer.addEventListener('dblclick', (e) => {
            // 如果双击的是标签容器本身（空白区域），而不是其子元素
            if (e.target === this.tabsContainer) {
                this.createNewTab();
            }
        });
        
        // 编辑器内容变化
        this.textEditor.addEventListener('input', () => {
            this.scheduleAutoSave();
            // 实时更新标签标题
            if (this.activeTabId) {
                this.updateTabTitle(this.activeTabId);
            }
        });
        
        // 主题切换
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
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
        
        // 设置标签拖拽排序
        this.setupTabSorting();
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
            }
        }
        
        // 切换到新标签
        this.activeTabId = tabId;
        const tab = this.tabs.find(tab => tab.id === tabId);
        if (tab) {
            this.textEditor.value = tab.textContent || '';
            // 切换标签后更新标题
            this.updateTabTitle(tabId);
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
    
    saveCurrentTabContent() {
        if (this.activeTabId) {
            const tab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (tab) {
                tab.textContent = this.textEditor.value;
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
                this.updateStatus('自动保存失败', 3000);
            }
        }
    }

    showAutoSaveIndicator() {
        // 显示自动保存状态
        this.updateStatus('已自动保存', 1500);
    }

    updateStatus(message, revertDelay = 0) {
        if (!this.statusPill) return;

        this.statusPill.textContent = message;

        if (this.statusResetTimer) {
            clearTimeout(this.statusResetTimer);
        }

        if (revertDelay > 0) {
            this.statusResetTimer = setTimeout(() => {
                this.statusPill.textContent = '就绪';
                this.statusResetTimer = null;
            }, revertDelay);
        }
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
        this.textEditor.style.fontSize = size + 'px';
        this.fontSizeValue.textContent = size + 'px';
    }

    // 根据文本内容更新标签标题
    updateTabTitle(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        const content = this.textEditor.value.trim();
        let newTitle;

        if (content === '') {
            // 如果内容为空，使用默认标题
            newTitle = `便签 ${tab.id.split('_')[1]}`;
        } else {
            // 提取第一行内容
            const firstLine = content.split('\n')[0].trim();
            // 限制标题长度，超过20个字符就截取
            newTitle = firstLine.length > 20 ? firstLine.substring(0, 20) + '...' : firstLine;
            // 如果第一行为空，使用第二行或默认标题
            if (newTitle === '') {
                const lines = content.split('\n').filter(line => line.trim() !== '');
                newTitle = lines.length > 0 ? 
                    (lines[0].length > 20 ? lines[0].substring(0, 20) + '...' : lines[0]) :
                    `便签 ${tab.id.split('_')[1]}`;
            }
        }

        // 更新标签标题
        tab.title = newTitle;
        this.renderTabs();
    }
    
    saveAllTabs() {
        this.updateStatus('保存中...');
        
        // 保存当前编辑器内容到活动标签
        if (this.activeTabId) {
            const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
            if (activeTab) {
                activeTab.textContent = this.textEditor.value;
            }
        }
        
        // 保存所有标签
        this.tabs.forEach(tab => this.saveTab(tab));
        this.saveSettings();
        
        // 显示保存完成状态
        setTimeout(() => {
            this.updateStatus('保存完成', 1500);
        }, 300);
    }
    
    async saveTab(tab) {
        const textContent = tab.textContent || '';
        const markdownContent = tab.markdownContent || '';
        const hasContent = textContent.trim() !== '' || markdownContent.trim() !== '';
        
        // 如果内容为空，删除标签
        if (!hasContent) {
            localStorage.removeItem(`kamineko_tab_${tab.id}`);
            console.log(`删除空内容标签: ${tab.title || tab.id}`);
            return;
        }
        
        // 构建标签数据
        const tabData = {
            id: tab.id,
            title: tab.title,
            textContent: textContent,
            markdownContent: markdownContent,
            created: tab.created || new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        // 保存到localStorage
        localStorage.setItem(`kamineko_tab_${tab.id}`, JSON.stringify(tabData));
        console.log(`标签已保存: ${tab.title || tab.id}`);
    }

    async deleteTabFile(tabId) {
        localStorage.removeItem(`kamineko_tab_${tabId}`);
        console.log(`标签 ${tabId} 已删除`);
    }

    async loadTabs() {
        // 从localStorage加载
        const settings = this.loadSettings();
        let tabIds = settings.tabOrder || [];
        
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
                // 加载后更新标题
                this.updateTabTitle(this.activeTabId);
            }
        }
        
        // 应用字号设置
        if (this.fontSize) {
            this.textEditor.style.fontSize = `${this.fontSize}px`;
        }
    }
    
    async cleanupEmptyTabs() {
        try {
            const response = await fetch('/api/cleanup', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                console.log(result.message);
                // 重新加载标签列表以反映清理后的状态
                const updatedResponse = await fetch('/api/tabs');
                const updatedResult = await updatedResponse.json();
                
                if (updatedResult.success) {
                    this.tabs = updatedResult.tabs;
                }
            }
        } catch (error) {
            console.error('清理空标签时发生错误:', error);
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
    editor = new TextEditor();
});

// 导出到全局作用域以便HTML中的事件处理器使用
window.editor = editor;