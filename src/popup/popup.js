// 更新页面，显示所有已打开sidebar的tab及其url
function updateTabList() {
    const QlistContainer = document.getElementById("terms-list");
    QlistContainer.innerHTML = "<p class='no-terms'>加载中...</p>";
    chrome.runtime.sendMessage({ action: "getSidebarTabs" }, (response) => {
        const tabs = response.tabs || {};
        QlistContainer.innerHTML = "";
        const tabIds = Object.keys(tabs);
        if (tabIds.length === 0) {
            QlistContainer.innerHTML = "<p class='no-terms'>暂无已打开sidebar的标签页</p>";
            return;
        }
        tabIds.forEach(tabId => {
            const info = tabs[tabId];
            const div = document.createElement('div');
            div.style.marginBottom = "10px";
            div.innerHTML = `
                <span style="font-size:13px;color:#333;">${info.url}</span>
                <button class="show-sidebar-btn" data-tabid="${tabId}">显示Sidebar</button>
            `;
            QlistContainer.appendChild(div);
        });
        // 绑定按钮事件
        QlistContainer.querySelectorAll('.show-sidebar-btn').forEach(btn => {
            btn.onclick = function() {
                const tabId = this.dataset.tabid;
                chrome.runtime.sendMessage({ action: "showSidebar", tabId: tabId });
            };
        });
    });
}

// 页面加载完成时
document.addEventListener("DOMContentLoaded", function() {
    console.log("popup脚本已加载");

    updateTabList();

    // 可监听术语变更后刷新
    chrome.runtime.onMessage.addListener((message, sender, response) => {
        if(message.action === "updateTab") {
            updateTabList();
        }
    });
});