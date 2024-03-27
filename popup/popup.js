
document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let buttonContainer = document.getElementById('buttonContainer');
    let button = document.createElement('button');
    
    if (currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
      
      chrome.runtime.sendMessage({action : "injectScript", tabId: currentTab.id});
        
      button.innerText = '노노그램 풀기';
      button.onclick = function() { 
        chrome.runtime.sendMessage({action : "solve", tabId: currentTab.id});
      }
    } else {
      button.innerText = '노노그램 사이트로 이동';
      button.onclick = function() {
        chrome.tabs.update(currentTab.id, {url: 'https://ko.puzzle-nonograms.com'});
        window.close();
      }
    }
    buttonContainer.appendChild(button);
  });
});
