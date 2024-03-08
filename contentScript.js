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

if (!window.myContentScriptHasRun) {
  // background script 혹은 팝업 스크립트로부터 메시지를 받으면 데이터를 추출하여 응답합니다.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      const data = extractData();
      sendResponse({data: data});
    } else if (request.boardState) {
      paintTiles(request.boardState)
    }
  });
}

window.myContentScriptHasRun = true;