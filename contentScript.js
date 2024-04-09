// contentScript.js


// 플랫폼 체크 함수
function checkPlatform() {
  let isMacPlatform;
  if (navigator.userAgentData && navigator.userAgentData.platform) {
    isMacPlatform = navigator.userAgentData.platform.includes('Mac');
  } else {
    // navigator.userAgentData가 없는 경우 대체 방법 사용
    isMacPlatform = navigator.userAgent.includes('Mac');
  }
  return isMacPlatform;
}

// 모달 열기
function showModal() {
  const modal = document.getElementById('myModal');
  const span = document.getElementsByClassName('close')[0];
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

function createOverlay() {
  // 오버레이 생성
  const overlay = document.createElement('div');
  overlay.setAttribute('id', 'interactionBlocker');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '1000'; // 다른 요소 위에 표시되도록 높은 값 설정
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center'; // 가운데 정렬
  overlay.style.alignItems = 'center'; // 가운데 정렬
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)'; // 반투명 배경
  // overlay.style.pointerEvents = 'none';

  // 안내 메시지 표시를 위한 요소 생성
  const message = document.createElement('div');
  message.textContent = '퍼즐을 풀고 있어요!';
  message.style.color = 'white'; // 텍스트 색상
  message.style.fontSize = '24px'; // 폰트 크기
  message.style.padding = '20px'; // 안쪽 여백
  message.style.backgroundColor = 'rgba(0,0,0,0.8)'; // 메시지 배경색
  message.style.borderRadius = '10px'; // 둥근 모서리

  // 메시지를 오버레이에 추가
  overlay.appendChild(message);

  // 오버레이를 문서에 추가
  document.body.appendChild(overlay);

}

function passOverlay() {
  const overlay = document.getElementById('interactionBlocker');
  if (overlay) {
    overlay.style.pointerEvents = 'none';
  }
}

function activeOverlay() {
  const overlay = document.getElementById('interactionBlocker');
  if (overlay) {
    overlay.style.pointerEvents = '';
  }
}

function removeOverlay() {
  const overlay = document.getElementById('interactionBlocker');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

function lockScroll() {
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
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
async function paintTiles(boardState, tiles, cellBack, isMacPlatform) {
  const FILLED = 1;
  const BLOCKED = -1;
  
  for(let index=0; index<boardState.length; index++) {

    const state = boardState[index];
    const tile = tiles[index];
    
    if (state === FILLED && tile.classList.contains('cell-off')) {
      // tiles[index].classList.replace('cell-off', 'cell-on')
      // await scrollToViewport(tile);
      
      passOverlay();
      clickTiles(tile, cellBack);
      activeOverlay();
      
    } else if (state === BLOCKED && tile.classList.contains('cell-off')) {
      // tiles[index].classList.replace('cell-off', 'cell-x'); 
      // tiles[index].classList.add('icon-cancel');
      // await scrollToViewport(tile);
    
      passOverlay();
      ctrlClickTiles(tile, cellBack, isMacPlatform);
      activeOverlay();
    }
  }
}

function ensureTilesInViewPort(tiles) {
  return new Promise((resolve) => {
    let tilesInViewPort = true;
    const firstTile = tiles[0]; // 가장 첫 번째 타일 선택
    const lastTile = tiles[tiles.length - 1]; // 가장 마지막 타일 선택
    const bannerHeight = 120;

    // 타일의 위치를 가져옵니다.
    const firstTileRect = firstTile.getBoundingClientRect();
    const lastTileRect = lastTile.getBoundingClientRect();

    // 뷰포트의 크기를 확인합니다.
    const effectiveViewportHeight = window.innerHeight - bannerHeight;

    // 뷰포트 크기가 첫 번째 타일과 마지막 타일을 동시에 포함할 수 있는지 확인합니다.
    if (lastTileRect.bottom - firstTileRect.top > effectiveViewportHeight) {
      // 타일이 모두 들어갈 수 없는 경우, 사용자에게 메시지를 출력합니다.
      alert('창 크기를 조정하여 모든 타일이 보이도록 해주세요.');
      tilesInViewPort = false;
      resolve(tilesInViewPort);
      return;
    }

    // 타일 그룹의 중앙이 뷰포트의 중앙에 위치하도록 스크롤 위치를 계산합니다.
    const tilesCenter = (firstTileRect.top + lastTileRect.bottom) / 2;
    const viewportCenter = effectiveViewportHeight / 2 + bannerHeight;
    const scrollOffset = tilesCenter - viewportCenter;

    // 스크롤을 첫 번째 타일의 위치로 이동합니다.
    window.scrollTo({ top: document.documentElement.scrollTop + scrollOffset, behavior: 'instant' });
    setTimeout(()=>{
      resolve(tilesInViewPort);
    }, 300);

  });
  
}



function ctrlClickTiles(tile, cellBack, isMacPlatform) {
  const rect = tile.getBoundingClientRect();
  const clickX = rect.left + rect.width / 2;
  const clickY = rect.top + rect.height / 2;

  let clickEvent = new MouseEvent('mousedown', {
    'view': window,
    'bubbles': true,
    'cancelable': true,
    'clientX': clickX,
    'clientY': clickY,
    'ctrlKey': !isMacPlatform, // 윈도우에서는 ctrlKey를 사용
    'metaKey': isMacPlatform,  // 맥에서는 metaKey를 사용
  });
  
  cellBack.dispatchEvent(clickEvent);
  clickEvent = new MouseEvent('mouseup', {
    'view': window,
    'bubbles': true,
    'cancelable': true,
    'clientX': clickX,
    'clientY': clickY,
    'ctrlKey': !isMacPlatform, // 윈도우에서는 ctrlKey를 사용
    'metaKey': isMacPlatform,  // 맥에서는 metaKey를 사용
  });
  cellBack.dispatchEvent(clickEvent);
}


function clickTiles(tile, cellBack) {
  const rect = tile.getBoundingClientRect();
  const clickX = rect.left + rect.width / 2;
  const clickY = rect.top + rect.height / 2;

  let clickEvent = new MouseEvent('mousedown', {
    'view': window,
    'bubbles': true,
    'cancelable': true,
    'clientX': clickX,
    'clientY': clickY,
  });
  
  cellBack.dispatchEvent(clickEvent);
  clickEvent = new MouseEvent('mouseup', {
    'view': window,
    'bubbles': true,
    'cancelable': true,
    'clientX': clickX,
    'clientY': clickY,
  });
  cellBack.dispatchEvent(clickEvent);
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

function enqueueBoardState(data, queue, processing, tiles, cellBack, isMacPlatform) {
  queue.push(data);
  processQueue(queue, processing, tiles, cellBack, isMacPlatform);
}

async function processQueue(queue, processing, tiles, cellBack, isMacPlatform) {
  if (processing || queue.length === 0 ) {
    return;
  }
  processing = true;
  while(queue.length > 0) {
    const data = queue.shift();
    await paintTiles(data, tiles, cellBack, isMacPlatform);
  }
  processing = false;
}

if (!window.myContentScriptHasRun) {  // 이벤트 리스너 중복 추가 방지용 검사
  let boardStateQue = [];
  let processing = false;
  let isSolving = false;
  let worker;
  
  const modal = document.createElement('div');
  modal.innerHTML = `
  <div id="myModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <p>다 풀었어요! 또 풀고 싶어요!</p>
    </div>
  </div>
  `;
  document.body.appendChild(modal);
  // 서비스워커나 팝업 스크립트로부터 메시지를 받으면 응답
  const robotElement = document.getElementById('robot');
  if (robotElement) {
    robotElement.value = '1';
  }
  const style = document.createElement('style');
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

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'extractData') {     // 힌트 읽기
      const data = extractData();
      xSize = data[1].length;
      sendResponse({data: data});
    } else if (request.action === "checkBoardState") {    // 페이지 보드판이 비어있는지 체크
      const notEmpty = isBoardNotEmpty();
      sendResponse({boardNotEmpty: notEmpty});
    } else if (request.action === 'solve') {              // 노노그램 풀기
      
      // const tiles = document.querySelectorAll('div.cell.selectable.cell-off');
      const rows = document.querySelectorAll('div.nonograms-cell-back > div.row');
      const tiles = Array.from(rows).flatMap(row => Array.from(row.children));
      // nonograms-cell-back 요소의 참조를 얻습니다.
      const cellBack = document.querySelector('div.nonograms-cell-back');
      ensureTilesInViewPort(tiles).then((tilesInViewPort)=>{
        if (tilesInViewPort === false) {
          isSolving = false;
          return;
        }

        isSolving = true;
        lockScroll();
        createOverlay();
        const isMacPlatform = checkPlatform();
        fetch(chrome.runtime.getURL('worker.js'))  // CORS 때문에 워커스크립트를 컨텐츠 스크립트에서 읽어와서 블롭으로 처리
        .then(response => response.text())
        .then(script => {
          const blob = new Blob([script], { type: 'application/javascript' }); 
          worker = new Worker(URL.createObjectURL(blob));
          try {      
            worker.onmessage = function(e) {
              if (e && e.data === 'Puzzle Solved') {
                isSolving = false;
                chrome.runtime.sendMessage({action:'Puzzle Solved'}); 
                removeOverlay();
                unlockScroll();
                worker.terminate();
              } else if (e && e.data) {
                // paintTiles(e.data, tiles, cellBack, isMacPlatform);
                enqueueBoardState(e.data, boardStateQue, processing, tiles, cellBack, isMacPlatform);
              }
            };
            worker.postMessage(request.data);
          } catch(error) {
            console.error(error);
            removeOverlay();
            unlockScroll();
          }
        })
        .catch(error => console.error('Fetching worker script failed:', error));
      });
    } else if (request.action === "check solving state") {
      sendResponse({solving:isSolving});
    } else if (request.action === 'stop') {
      if(worker) {
        worker.terminate();
        isSolving = false;
        removeOverlay();
        unlockScroll();
      }
    }
  });
}

window.myContentScriptHasRun = true;


