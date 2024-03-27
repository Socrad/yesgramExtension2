const isInjected = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectScript") {
    injectScript(request.tabId);
  } else if (request.action === "solve") {
    checkBoardState(request.tabId);
  }
});

function injectScript(currentTabId) {
  if (!isInjected.has(currentTabId) || !isInjected.get(currentTabId)) {
    chrome.scripting.executeScript({target : {tabId: currentTabId}, files: ["contentScript.js"]}, function() {
      if (chrome.runtime.lastError) {
        console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
      } else {
        isInjected.set(currentTabId, true);
        console.log("content script injected");
      }
    });
  }
}

function checkBoardState(currentTabId) {
  chrome.tabs.sendMessage(currentTabId, {action: "checkBoardState"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(`Message sending failed: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (response.boardNotEmpty) {
      return;
    } else {
      extractData(currentTabId);
    }
  });
}

function extractData(currentTabId) {
  chrome.tabs.sendMessage(currentTabId, {action: 'extractData'}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(`Message sending failed: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (response && response.data) {  
      chrome.tabs.sendMessage(currentTabId, {action: 'solve', data: response.data});
    } else {
      console.error('Failed to extract data.');
    }
  });
}
