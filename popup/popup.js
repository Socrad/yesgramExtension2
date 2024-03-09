// 상수 선언
const BLOCKED = -1;
const FILLED = 1;
const NEUTRAL = 0;

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    let buttonContainer = document.getElementById('buttonContainer');
    let button = document.createElement('button');
    
    if (currentTab.url.includes('https://ko.puzzle-nonograms.com')) {
      button.innerText = '노노그램 풀기';
      button.onclick = executeScript(currentTab.id)
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

function executeScript(currentTabId) {
  return function(event) {
    chrome.scripting.executeScript({target : {tabId: currentTabId}, files: ["contentScript.js"]}, function() {
      if (chrome.runtime.lastError) {
        console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
        return;
      }
      // 삽입 완료 후, content script에 메시지 보내기
      checkBoardState(currentTabId);
    });
  }
}

function checkBoardState(currentTabId) {
  chrome.tabs.sendMessage(currentTabId, {action: "checkBoardState"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(`Message sending failed: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (response.boardNotEmpty) {
      alert('게임 보드가 비어있지 않습니다. 모든 칸이 비어있는 상태에서 시작해 주세요.');
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
      solve(response.data, currentTabId);  
    } else {
      console.error('Failed to extract data.');
    }
  });
}

function solve(data, currentTabId) {
  const ygram = new Game(data[0],data[1]);
  ygram.solve()
  chrome.tabs.sendMessage(currentTabId, {boardState: ygram.gameBoard.state});
}

class Board {
  constructor(xSize, ySize) {
    this.xSize = xSize;
    this.ySize = ySize;
    this.state = new Array(xSize * ySize).fill(0); // NEUTRAL state
  }

  getRowLine(row) {
    return this.state.slice(row * this.xSize, (row + 1) * this.xSize);
  }

  setRowLine(lineState, row) {
    for (let index = 0; index < lineState.length; index++) {
      this.state[row * this.xSize + index] = lineState[index];
    }
  }

  getColumnLine(column) {
    let lineState = new Array(this.ySize).fill(0);
    for (let index = 0; index < this.ySize; index++) {
      lineState[index] = this.state[index * this.xSize + column];
    }
    return lineState;
  }

  setColumnLine(lineState, column) {
    for (let index = 0; index < this.ySize; index++) {
      this.state[index * this.xSize + column] = lineState[index];
    }
  }
}

class LineCase {
  constructor() {
    this.blockedTiles = [];
    this.filledTiles = [];
  }
}

function getCases(hints, lineSize) {
  const allCases = [];
  for (let hint of hints) {
    const cases = getLineStateCases(hint, lineSize);
    allCases.push(cases);
  }
  return allCases;
}

function getLineStateCases(hint, lineSize) {
  const lineStateCases = [];
  const [lineCasePrototype, freeSpace] = getLineCasePrototype(hint, lineSize);
  const nNumbersTotalCases = getNNumbersTotalCases(lineCasePrototype.blockedTiles.length, freeSpace);

  for (let aCase of nNumbersTotalCases) {
    const aLineCase = new LineCase();
    aLineCase.filledTiles = [...lineCasePrototype.filledTiles];
    
    for (let index = 0; index < aCase.length; index++) {
      aLineCase.blockedTiles.push(lineCasePrototype.blockedTiles[index] + aCase[index]);
    }
    lineStateCases.push(getPaintedState(aLineCase));
  }
  return lineStateCases;
}

function getLineCasePrototype(hint, lineSize) {
  let totalLength = 0;
  const lineCasePrototype = new LineCase();

  lineCasePrototype.blockedTiles.push(0);
  for (let length of hint) {
    lineCasePrototype.filledTiles.push(length);
    totalLength += length;
    lineCasePrototype.blockedTiles.push(1);
    totalLength++;
  }
  lineCasePrototype.blockedTiles[hint.length] = 0;
  totalLength--;
  const freeSpace = lineSize - totalLength;

  return [lineCasePrototype, freeSpace];
}

function getPaintedState(aCase) {
  const lineState = [];
  for (let index = 0; index < aCase.filledTiles.length; index++) {
    for (let i = 0; i < aCase.blockedTiles[index]; i++) {
      lineState.push(BLOCKED);
    }
    for (let i = 0; i < aCase.filledTiles[index]; i++) {
      lineState.push(FILLED);
    }
  }
  for (let i = 0; i < aCase.blockedTiles[aCase.filledTiles.length]; i++) {
    lineState.push(BLOCKED);
  }
  return lineState;
}

const memo = {}; // n개 숫자의 합이 total인 경우의 결과를 저장해뒀다가 재활용할 수 있다. 메모이제이션.

function getNNumbersTotalCases(n, total) {
  // 메모이제이션 키 생성 (n과 total의 조합으로 유니크한 키를 만듭니다)
  const key = `${n},${total}`;

  // 이미 계산된 값이 있다면 메모에서 가져옵니다.
  if (key in memo) {
    return memo[key];
  }

  let result = [];
  
  if (n === 1) {
    // 단일 숫자의 합이 total인 경우는 total 자체밖에 없습니다.
    return [[total]];
  }

  for (let i = 0; i <= total; i++) {
    let subCases = getNNumbersTotalCases(n - 1, total - i); // 나머지 n-1개 숫자의 합이 total-i가 되는 경우의 수를 찾습니다.

    // 각각의 subCase에 현재 숫자 i를 추가하여 결과 배열에 추가합니다.
    for (let subCase of subCases) {
      result.push([i, ...subCase]);
    }
  }

  memo[key] = result;  // 계산 결과를 메모에 저장
  return result;
}

class Game {
  constructor(rowHints, columnHints) {
    this.rowHints = rowHints;
    this.columnHints = columnHints;
    this.gameBoard = new Board(this.columnHints.length, this.rowHints.length);
    this.rowCases = getCases(this.rowHints, this.gameBoard.xSize);
    this.columnCases = getCases(this.columnHints, this.gameBoard.ySize);
  }

  solve() {
    let isComplete = true;
    while (isComplete) {
      isComplete = this.conjunctionCheck();
    }
  }

  conjunctionCheck() {
    let isChanged = false;
    for (let row = 0; row < this.rowCases.length; row++) {
      let originLine = this.gameBoard.getRowLine(row);
      let conformedCases = getConformedCases(originLine, this.rowCases[row]);
      let lineState = getLineStateCasesConjunction(conformedCases);
      lineState = getLineStateDisjunction(originLine, lineState);

      if (!arraysEqual(originLine, lineState)) {
        isChanged = true;
        this.gameBoard.setRowLine(lineState, row);
      }
      this.rowCases[row] = conformedCases;
    }

    for (let column = 0; column < this.columnCases.length; column++) {
      const originLine = this.gameBoard.getColumnLine(column);
      const conformedCases = getConformedCases(originLine, this.columnCases[column]);

      let lineState = getLineStateCasesConjunction(conformedCases);
      lineState = getLineStateDisjunction(originLine, lineState);

      if (!arraysEqual(originLine, lineState)) {
        isChanged = true;
        this.gameBoard.setColumnLine(lineState, column);
      }
      this.columnCases[column] = conformedCases;
    }

    return isChanged;
  }
}

function getConformedCases(lineState, lineStateCases) {
  return lineStateCases.filter(caseState => !caseState.some((state, index) => lineState[index] * state === -1));
}

function getLineStateCasesConjunction(lineStateCases) {
  return lineStateCases.reduce((conjunction, caseState) =>
    conjunction.map((state, index) => state === caseState[index] ? state : NEUTRAL), [...lineStateCases[0]]);
}

function getLineStateDisjunction(a, b) {
  return a.map((state, index) => state === NEUTRAL ? b[index] : state);
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
