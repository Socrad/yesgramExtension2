// contentScript.js



function extractData() {
  
  const columnHintContainers = document.querySelector('div#taskTop').querySelectorAll('div.task-group');
  const rowHintContainers = document.querySelector('div#taskLeft').querySelectorAll('div.task-group');
  if (columnHintContainers && rowHintContainers) {
    let columnHints = [];
    let rowHints = [];
    columnHintContainers.forEach((aColumn)=> {
      const hintsContainer = aColumn.querySelectorAll('div.task-cell.selectable');
      let aColumnHints = [];
      hintsContainer.forEach((hint)=>{
        aColumnHints.push(Number(hint.textContent));
      });
      columnHints.push(aColumnHints);
    });

    rowHintContainers.forEach((aRow)=> {
      const hintsContainer = aRow.querySelectorAll('div.task-cell.selectable');
      let aRowHints = [];
      hintsContainer.forEach((hint)=>{
        aRowHints.push(Number(hint.textContent));
      });
      rowHints.push(aRowHints);
    });
    return [rowHints, columnHints];
  }
  return null;
}

function paintTiles(boardState) {
  const FILLED = 1;
  const BLOCKED = -1;
  const tiles = document.querySelectorAll('div.cell.selectable.cell-off');
  boardState.forEach((state, index) =>{
    // const clickEvent = new MouseEvent('click', {
    //   bubbles: true,    // 이벤트가 상위 요소로 전파되도록 설정
    //   cancelable: true, // 이벤트의 기본 동작이 취소될 수 있도록 설정
    //   view: window      // 이벤트와 관련된 추상 뷰를 설정 (보통 window 객체를 사용)
    // });

    if (state == FILLED) {
      // tiles[index].dispatchEvent(clickEvent)
    } else if (state == BLOCKED) {
      // tiles[index].dispatchEvent(clickEvent)
      // tiles[index].dispatchEvent(clickEvent)
      tiles[index].className = 'cell selectable cell-x icon-cancel';
    }

  });
}

function isBoardNotEmpty() {
  const tiles = document.querySelectorAll('div.cell.selectable');
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].classList.contains('cell-on')) { // 예시로 'cell-on' 클래스를 사용, 실제 클래스는 페이지에 따라 다를 수 있음
      alert('게임 보드가 비어있지 않습니다. 모든 칸이 비어있는 상태에서 시작해 주세요.');
      return true;
    } else if (tiles[i].classList.contains('cell-x')) {
      alert('게임 보드가 비어있지 않습니다. 모든 칸이 비어있는 상태에서 시작해 주세요.');
      return true;
    }
  }
  return false;
}

if (!window.myContentScriptHasRun) {
  // background script 혹은 팝업 스크립트로부터 메시지를 받으면 데이터를 추출하여 응답합니다.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      const data = extractData();
      if (data[0].length > 30 || data[1].length > 30) {
        alert("현재 브라우저에 의해 제한된 자원 한계로는 월간노노그램을 풀 수 없습니다. 다른 방법을 연구하는 중입니다.");
        return;
      }
      sendResponse({data: data});
    } else if (request.action === "checkBoardState") {
      const notEmpty = isBoardNotEmpty();
      sendResponse({boardNotEmpty: notEmpty});
    } else if (request.action === 'solve') {
      fetch(chrome.runtime.getURL('worker.js'))
      .then(response => response.text())
      .then(script => {
          const blob = new Blob([script], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));
          
          // 워커 사용

          worker.onmessage = function(e) {
            if (e && e.data) {
              paintTiles(e.data);
            }
          };
          
          worker.postMessage(request.data);
      })
      .catch(error => console.error('Fetching worker script failed:', error));
    }
  });
}

window.myContentScriptHasRun = true;