// 维护每个tab的sidebar状态和术语列表
let sidebarTabs = {}; // { [tabId]: { url, terms: [...] } }

// 安装脚本时
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ 
        id: "add-to-list",
        title: "保存为术语",
        contexts: ["selection"]
    });
});

// 右键菜单保存术语到当前tab的sidebar
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if(info.menuItemId == "add-to-list" && info.selectionText) {
        if(!sidebarTabs[tab.id]) {
            sidebarTabs[tab.id] = { 
                url: tab.url,
                terms: []  // 确保初始化 terms 数组
            };
        }
        
        // 添加术语到数组
        sidebarTabs[tab.id].terms.push({
            text: info.selectionText.trim(),
            timestamp: Date.now()
        });

        // 通知内容脚本刷新
        chrome.tabs.sendMessage(tab.id, {
            action: "addTerm",
            text: info.selectionText.toString().trim()
        });
    }
});

// 监听页面关闭，清理sidebarTabs
chrome.tabs.onRemoved.addListener((tabId) => {
    if (sidebarTabs[tabId]) {
        delete sidebarTabs[tabId];
    }
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab ? sender.tab.id : null;
    // sidebar打开，注册tab
    if (message.action === "sidebarOpened" && tabId) {
        if (!sidebarTabs[tabId]) {
            sidebarTabs[tabId] = { url: message.url, terms: [] };
        }
        sendResponse({success: true});
    }
    // sidebar关闭，不清理数据
    else if (message.action === "sidebarClosed" && tabId) {
        // 只隐藏，不删除数据
        sendResponse({success: true});
    }
    // 添加术语
    else if (message.action === "addTerm" && tabId) {
        if (!sidebarTabs[tabId]) {
            sidebarTabs[tabId] = { 
                url: sender.tab.url,
                terms: []
            };
        }
        // 添加术语到数组
        sidebarTabs[tabId].terms.push({
            text: message.text,
            timestamp: Date.now()
        });
        sendResponse({success: true});
    }
    // 删除术语
    else if (message.action === "deleteTerm" && tabId) {
        if (sidebarTabs[tabId]) {
            sidebarTabs[tabId].terms.splice(message.idx, 1);
        }
        sendResponse({success: true});
    }
    // 获取当前tab术语列表
    else if (message.action === "getTerms" && tabId) {
        sendResponse({terms: sidebarTabs[tabId] ? sidebarTabs[tabId].terms : []});
    }
    // 获取所有sidebar标签页
    else if (message.action === "getSidebarTabs") {
        sendResponse({tabs: sidebarTabs});
    }
    // 重新打开sidebar
    else if (message.action === "showSidebar" && message.tabId) {
        chrome.tabs.sendMessage(Number(message.tabId), { action: "showSidebar" });
        sendResponse({success: true});
    }
});