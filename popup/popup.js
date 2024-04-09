
document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let buttonContainer = document.getElementById('buttonContainer');
    let button = document.createElement('button');
    let solvingPuzzle = false;
    const solveButtonText = '노노그램 풀기';
    const stopButtonText = '노노그램 멈춰!';
    const moveButtonText = '노노그램 사이트로 이동';

    
    chrome.runtime.onMessage.addListener((request)=>{     // 퍼즐이 다 풀리면 solvinPuzzle 바꾸고 버튼 텍스트 변경
      if(request.action === "Puzzle Solved" && currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
        button.innerText = solveButtonText;
        solvingPuzzle = false;
      }
    });
    
    if (currentTab.url.includes('https://ko.puzzle-nonograms.com')) { // 현재 노노그램 사이트일때 버튼
      
      chrome.runtime.sendMessage({action : "injectScript", tabId: currentTab.id}, (response)=>{ // 페이지에 컨텐트스크립트 주입.
        if (response) {
          chrome.tabs.sendMessage(currentTab.id, {action:'check solving state'}, (response)=>{  // 주입이 되든 말든 리스폰스 오도록 해놓고 현재 상태 체크.
            if (response && response.solving === true) {
              button.innerText = stopButtonText;
              solvingPuzzle = true;
            } else if(response && response.solving === false && currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
              button.innerText = solveButtonText;
              solvingPuzzle = false;
            }
          });
        }
      });
      button.innerText = solveButtonText;
      button.onclick = function() { 
        if (!solvingPuzzle) {
          chrome.runtime.sendMessage({action : "solve", tabId: currentTab.id});
          button.innerText = stopButtonText;
          solvingPuzzle = true;
          window.close();
        } else {
          chrome.tabs.sendMessage(currentTab.id, {action: "stop"});
          button.innerText = solveButtonText;
          solvingPuzzle = false;
          window.close();
        }
      }
    } else {      // 노노그램 사이트가 아닐때 버튼
      button.innerText = moveButtonText;
      button.onclick = function() {
        chrome.tabs.update(currentTab.id, {url: 'https://ko.puzzle-nonograms.com'});
        window.close();
      }
    }
    buttonContainer.appendChild(button);
  });
});
