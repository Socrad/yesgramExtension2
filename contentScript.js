// contentScript.js
/** 페이지의 가로힌트와 세로힌트를 읽어서 [힌트, 힌트]배열로 반환함.
 * 
 * @returns {[int[][], int[][]] | null} 
 */
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

/** 보드 상태를 받아와 페이지의 노노그램 판에 X표시
 * 
 * @param {int[]} boardState 
 */
function paintTiles(boardState) {
  const FILLED = 1;
  const BLOCKED = -1;
  const tiles = document.querySelectorAll('div.cell.selectable.cell-off');
  boardState.forEach((state, index) =>{
    if (state == FILLED) {
      
    } else if (state == BLOCKED) {
      tiles[index].className = 'cell selectable cell-x icon-cancel';
    }
  });
}

/** 페이지의 노노그램 보드가 비어있지 않으면 true를 반환
 * 
 * @returns {bool}
 */
function isBoardNotEmpty() {
  const tiles = document.querySelectorAll('div.cell.selectable');
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].classList.contains('cell-on')) { 
      alert('게임 보드가 비어있지 않습니다. 모든 칸이 비어있는 상태에서 시작해 주세요.');
      return true;
    } else if (tiles[i].classList.contains('cell-x')) {
      alert('게임 보드가 비어있지 않습니다. 모든 칸이 비어있는 상태에서 시작해 주세요.');
      return true;
    }
  }
  return false;
}

if (!window.myContentScriptHasRun) {  // 이벤트 리스너 중복 추가 방지용 검사
  // 서비스워커나 팝업 스크립트로부터 메시지를 받으면 응답
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'extractData') {     // 힌트 읽기
      const data = extractData();
      if (data[0].length > 30 || data[1].length > 30) {
        alert("현재 브라우저에 의해 제한된 자원 한계로는 월간노노그램을 풀 수 없습니다. 다른 방법을 연구하는 중입니다.");
        return;
      }
      sendResponse({data: data});
    } else if (request.action === "checkBoardState") {    // 페이지 보드판이 비어있는지 체크
      const notEmpty = isBoardNotEmpty();
      sendResponse({boardNotEmpty: notEmpty});
    } else if (request.action === 'solve') {              // 노노그램 풀기
      fetch(chrome.runtime.getURL('worker.js'))  // CORS 때문에 워커스크립트를 컨텐츠 스크립트에서 읽어와서 블롭으로 처리
      .then(response => response.text())
      .then(script => {
          const blob = new Blob([script], { type: 'application/javascript' }); 
          const worker = new Worker(URL.createObjectURL(blob));

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