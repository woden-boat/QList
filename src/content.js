function showSavedNotification(text) {
    const notification = document.createElement('div');
    notification.textContent = `术语 "${text}" 已保存!`;
    notification.className = 'qlist-notification';
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(notification), 500);
    }, 3000);
}

function createSidebar() {
    if(document.getElementById("qlist-sidebar")) return;

    // 创建包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'qlist-wrapper';

    // 将原始内容移入包装器
    while (document.body.firstChild) {
        wrapper.appendChild(document.body.firstChild);
    }

    // 创建侧边栏
    const sidebar = document.createElement('div');
    sidebar.id = 'qlist-sidebar';
    sidebar.className = 'qlist-sidebar';

    // 关闭按钮点击时
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.className = 'qlist-close-btn';
    closeBtn.onclick = () => {
        sidebar.remove();
        // 恢复原始布局
        wrapper.classList.add('sidebar-closed');
        setTimeout(() => {
            while (wrapper.firstChild) {
                document.body.appendChild(wrapper.firstChild);
            }
            wrapper.remove();
        }, 300); // 等待过渡动画完成
        chrome.runtime.sendMessage({ action: "sidebarClosed" });
    };
    sidebar.appendChild(closeBtn);

    const listDiv = document.createElement('div');
    listDiv.id = 'qlist-sidebar-list';
    listDiv.className = 'qlist-terms-list';
    sidebar.appendChild(listDiv);

    document.body.appendChild(sidebar);
    document.body.appendChild(wrapper);
    
    chrome.runtime.sendMessage({ action: "sidebarOpened", url: location.href });
    renderSidebarTerms();
}

// 渲染术语列表
function renderSidebarTerms() {
    const listDiv = document.getElementById('qlist-sidebar-list');
    if (!listDiv) return;  // 确保 listDiv 存在

    chrome.runtime.sendMessage({ action: "getTerms" }, (response) => {
        const terms = response.terms || [];
        if (terms.length === 0) {
            listDiv.innerHTML = "<p>还没有收集的术语。</p>";
            return;
        }
        let html = "<ul>";
        terms.forEach((term, index) => {
            html += `
            <li class="qlist-term-item">
                <div class="qlist-term-text">${term.text}</div>
                <div class="qlist-term-time">${new Date(term.timestamp).toLocaleString()}</div>
                <div class="qlist-term-actions">
                    <button data-term="${encodeURIComponent(term.text)}" class="qlist-btn qlist-btn-copy">复制</button>
                    <button data-term="${encodeURIComponent(term.text)}" class="qlist-btn qlist-btn-search">搜索</button>
                    <button data-index="${index}" class="qlist-btn qlist-btn-delete">删除</button>
                </div>
            </li>`;
        });
        html += "</ul>";
        listDiv.innerHTML = html;

        // 绑定按钮事件
        listDiv.querySelectorAll('.qlist-btn-copy').forEach(btn => {
            btn.onclick = function() {
                const term = decodeURIComponent(this.dataset.term);
                // 使用 Clipboard API 复制文本
                navigator.clipboard.writeText(term).then(() => {
                    // 显示复制成功提示
                    const originalText = btn.textContent;
                    btn.textContent = '已复制';
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.color = 'white';
                    
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.backgroundColor = '';
                        btn.style.color = '';
                    }, 1000);
                });
            };
        });

        listDiv.querySelectorAll('.qlist-btn-search').forEach(btn => {
            btn.onclick = function() {
                const term = decodeURIComponent(this.dataset.term);
                window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`);
            };
        });
        listDiv.querySelectorAll('.qlist-btn-delete').forEach(btn => {
            btn.onclick = function() {
                const idx = this.dataset.index;
                chrome.runtime.sendMessage({action: "deleteTerm", idx: idx}, (resp) => {
                    if(resp && resp.success) renderSidebarTerms();
                });
            };
        });

        // 添加按钮悬停效果
        const addButtonHoverEffects = (selector, hoverBg, hoverColor) => {
            listDiv.querySelectorAll(selector).forEach(btn => {
                btn.onmouseenter = () => {
                    btn.style.background = hoverBg;
                    btn.style.color = hoverColor;
                };
                btn.onmouseleave = () => {
                    btn.style.background = btn.dataset.defaultBg;
                    btn.style.color = btn.dataset.defaultColor;
                };
                // 保存默认颜色
                btn.dataset.defaultBg = getComputedStyle(btn).backgroundColor;
                btn.dataset.defaultColor = getComputedStyle(btn).color;
            });
        };

        // 应用悬停效果
        addButtonHoverEffects('.qlist-btn-copy', '#1976d2', '#fff');
        addButtonHoverEffects('.qlist-btn-search', '#2e7d32', '#fff');
        addButtonHoverEffects('.qlist-btn-delete', '#c62828', '#fff');
    });
}

console.log("内容脚本已注入到页面");

// Alt+S 快捷键保存选中文本到本tab sidebar
document.addEventListener("keydown", (event) => {
    if(event.altKey && event.key.toLowerCase() === 's') {
        const text = window.getSelection().toString().trim();
        if(text.length != 0) {
            chrome.runtime.sendMessage({ action: "addTerm", text: text }, (resp) => {
                if(resp && resp.success) {
                    showSavedNotification(text);
                    renderSidebarTerms();
                }
            });
            event.preventDefault();
        }
    }
});

// Shift + s 快捷键打开侧边栏
document.addEventListener("keydown", (event) => {
    if(event.shiftKey && event.key.toLocaleLowerCase() === 's') {
        createSidebar();
    }
});

// 监听 popup 或 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.action === "showSidebar") {
        if (!document.getElementById("qlist-sidebar")) createSidebar();
    }
    else if(message.action === "refreshSidebar") {
        renderSidebarTerms();
    }
    else if(message.action === "addTerm" && message.text) {
        showSavedNotification(message.text);
        renderSidebarTerms();
    } 
});