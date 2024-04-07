// contentScript.js

var modal = document.createElement('div');
modal.innerHTML = `
<div id="myModal" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <p>다 풀었어요! 또 풀고 싶어요!</p>
  </div>
</div>
`;
document.body.appendChild(modal);

var style = document.createElement('style');
style.textContent = `
.modal {
  display: none; /* 초기 상태는 숨김 */
  position: fixed; /* 화면에 고정 */
  z-index: 1; /* 다른 요소들 위에 표시 */
  left: 0;
  top: 0;
  width: 100%; /* 너비 전체 */
  height: 100%; /* 높이 전체 */
  overflow: auto; /* 내용이 넘치면 스크롤 */
  background-color: rgba(0, 0, 0, 0.4); /* 반투명한 검은색 배경 */
}

.modal-content {
  background-color: #fefefe;
  margin: auto;
  padding: 20px;
  border: 1px solid #888;
  width: 40%; /* 너비 조정 */
  /* 중앙 정렬을 위한 설정 */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  animation-name: animatetop;
  animation-duration: 0.4s;
}

@keyframes animatetop {
  from {top: -300px; opacity: 0} 
  to {top: 0; opacity: 1}
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

.modal-content p {
  font-size: 40px; /* 글자 크기 */
    color: #333; /* 글자 색상 */
    text-align: center; /* 텍스트 수평 중앙 정렬 */
    margin: 15px 0; /* 상하 여백으로 수직 위치 조정 */
}

`;
document.head.appendChild(style);

// 모달 열기
function showModal() {
  var modal = document.getElementById('myModal');
  var span = document.getElementsByClassName('close')[0];
  modal.style.display = 'block';

  // 'X' 아이콘을 클릭하면 모달 닫기
  span.onclick = function() {
      modal.style.display = 'none';
  }

  // 모달 외부 영역을 클릭하면 모달 닫기
  window.onclick = function(event) {
      if (event.target == modal) {
          modal.style.display = 'none';
      }
  }
}


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
  // const tiles = document.querySelectorAll('div.cell.selectable.cell-off');
  const rows = document.querySelectorAll('div.nonograms-cell-back > div.row');
  const tiles = Array.from(rows).flatMap(row => Array.from(row.children));

  boardState.forEach((state, index) =>{
    
    if (state == FILLED && tiles[index].classList.contains('cell-off')) {
      tiles[index].classList.replace('cell-off', 'cell-on')
      
    } else if (state == BLOCKED && tiles[index].classList.contains('cell-off')) {
      tiles[index].classList.replace('cell-off', 'cell-x'); 
      tiles[index].classList.add('icon-cancel');
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
            if (e && e.data === 'Puzzle Solved') {
              chrome.runtime.sendMessage({action:'Puzzle Solved'});
              showModal();
            } else if (e && e.data) {
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


