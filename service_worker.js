const isInjected = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectScript") {
    injectScript(request.tabId).then((result)=>{
      sendResponse({data:result});
    });
    return true;
  } else if (request.action === "solve") {
    checkBoardState(request.tabId);
  } 
});

function injectScript(currentTabId) {
  return new Promise((resolve)=>{
    if (!isInjected.has(currentTabId) || !isInjected.get(currentTabId)) {
      chrome.scripting.executeScript({target : {tabId: currentTabId}, files: ["contentScript.js"]}, function() {
        if (chrome.runtime.lastError) {
          console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
          resolve(false);
        } else {
          isInjected.set(currentTabId, true);
          resolve(true);
        }
      });
    } else {
      resolve(false);
    }
  });
  
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
