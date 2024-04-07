
document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let buttonContainer = document.getElementById('buttonContainer');
    let button = document.createElement('button');
    let solvingPuzzle = null;

    chrome.runtime.sendMessage({action:'check solving state'}, (response)=>{
      if (response.solving === true) {
        button.innerText = '퍼즐을 풀고 있어요';
        solvingPuzzle = true;
      } else if(response.solving === false && currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
        button.innerText = '노노그램 풀기';
        solvingPuzzle = false;
      }
    });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
      if(request.action === "Puzzle Solved" && currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
        button.innerText = '노노그램 풀기';
        solvingPuzzle = false;
      }
    });
    
    if (currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
      
      chrome.runtime.sendMessage({action : "injectScript", tabId: currentTab.id});
        
      button.innerText = '노노그램 풀기';
      button.onclick = function() { 
        if (!solvingPuzzle) {
          chrome.runtime.sendMessage({action : "solve", tabId: currentTab.id});
          button.innerText = '퍼즐을 풀고 있어요';
          solvingPuzzle = true;
        }
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
