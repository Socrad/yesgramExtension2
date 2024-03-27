
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("entering Listener");
  console.log(request);
  if (request.action === "injectScript") {
    injectScript = getInjector(); 
    injectScript(request.tabId);
  } else if (request.action === "solve") {
    checkBoardState(request.tabId);
  }
});

function getInjector() {
  let isInjected = false;
  return function(currentTabId) {
    if (!isInjected) {
      chrome.scripting.executeScript({target : {tabId: currentTabId}, files: ["contentScript.js"]}, function() {
        if (chrome.runtime.lastError) {
          console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
        } else {
          isInjected = true;
          console.log("content script injected");
        }
      });
    }
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
      // Content Script로부터 추출된 데이터를 solve() 함수에 전달합니다.
      
      chrome.tabs.sendMessage(currentTabId, {action: 'solve', data: response.data});
    } else {
      console.error('Failed to extract data.');
    }
  });
}
