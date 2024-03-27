
onmessage = function (e) {
  const result = solve(e.data);
  postMessage(result);
};

// 상수 선언
const BLOCKED = -1;
const FILLED = 1;
const NEUTRAL = 0;

function solve(data) {
  const ygram = new Game(data[0],data[1]);
  ygram.solve()
  return ygram.gameBoard.state;
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

function getLineStateCases(hint, lineSize) {
  const [lineCasePrototype, freeSpace] = getLineCasePrototype(hint, lineSize);
  const lineStateCases = getNNumbersTotalCases(lineCasePrototype.blockedTiles.length, freeSpace, false, lineCasePrototype);
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
  let lineState = [];
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
  lineState = new Int8Array(lineState);
  return lineState;
}
/*
const memo = {}; // n개 숫자의 합이 total인 경우의 결과를 저장해뒀다가 재활용할 수 있다. 메모이제이션.
*/
function getNNumbersTotalCases(n, total, recursive, prototype) {
  // 메모이제이션 키 생성 (n과 total의 조합으로 유니크한 키를 만듭니다)
  
  // const key = `${n},${total}`;

  // 이미 계산된 값이 있다면 메모에서 가져옵니다.
  /*
  if (key in memo) {
    return memo[key];
  }
  */
  let lineStateCases = [];
  let result = [];
  if (n === 1) {
    // 단일 숫자의 합이 total인 경우는 total 자체밖에 없습니다.
    return [[total]];
  }

  for (let i = 0; i <= total; i++) {
    let subCases = getNNumbersTotalCases(n - 1, total - i, true, null); // 나머지 n-1개 숫자의 합이 total-i가 되는 경우의 수를 찾습니다.
    
    // 각각의 subCase에 현재 숫자 i를 추가하여 결과 배열에 추가합니다.
    while (subCases.length > 0) {
      let aCase = subCases.pop();
      aCase.unshift(i);
       
      if (!recursive) {      
        let aLineCase = new LineCase();
        aLineCase.filledTiles = [...prototype.filledTiles];
        
        for (let index = 0; index < aCase.length; index++) {
          aLineCase.blockedTiles.push(prototype.blockedTiles[index] + aCase[index]);
        }
        lineStateCases.push(getPaintedState(aLineCase));
      } else {
        result.push(aCase);
      }
    }
  }
 

  // memo[key] = result;  // 계산 결과를 메모에 저장
  if (recursive) {
    return result;
  } else {
    return lineStateCases;
  }
}

class Game {
  constructor(rowHints, columnHints) {
    this.rowHints = rowHints;
    this.columnHints = columnHints;
    this.gameBoard = new Board(this.columnHints.length, this.rowHints.length);
    this.rowCases = new Array(rowHints.length).fill([]);
    this.columnCases = new Array(columnHints.length).fill([]);
  }

  solve() {
    let isComplete = true;
    while (isComplete) {
      isComplete = this.conjunctionCheck();
    }
  }

  conjunctionCheck() {
    let isChanged = false;
    for (let row = 0; row < this.rowHints.length; row++) {

      
      if (row === 8) {
        console.log("now debugging");
      }
      //디버그 코드 끝 */

      let originLine = this.gameBoard.getRowLine(row);
      originLine = new Int8Array(originLine);
      let cases = [];
      if (this.rowCases[row].length === 0) {
        // console.log("now get rowCases",row);
        cases = getLineStateCases(this.rowHints[row], this.gameBoard.xSize);
      } else {
        // console.log("now use stored rowCases",row);
        cases = this.rowCases[row];
      }
      const conformedCases = getConformedCases(originLine, cases);
      cases = null;
      let lineState = getLineStateCasesConjunction(conformedCases);
      lineState = getLineStateDisjunction(originLine, lineState);

      if (!arraysEqual(originLine, lineState)) {
        isChanged = true;
        this.gameBoard.setRowLine(lineState, row);
      }
      if (conformedCases.length < 500) {
        this.rowCases[row] = conformedCases;
      }
    }

    for (let column = 0; column < this.columnHints.length; column++) {
      let originLine = this.gameBoard.getColumnLine(column);
      originLine = new Int8Array(originLine);
      let cases = [];
      if (this.columnCases[column].length === 0) {
        // console.log("now get columnCases",column);
        cases = getLineStateCases(this.columnHints[column], this.gameBoard.ySize);
      } else {
        // console.log("now use stored columnCases",column);
        cases = this.columnCases[column];
      }
      const conformedCases = getConformedCases(originLine, cases);
      cases = [];
      let lineState = getLineStateCasesConjunction(conformedCases);
      lineState = getLineStateDisjunction(originLine, lineState);

      if (!arraysEqual(originLine, lineState)) {
        isChanged = true;
        this.gameBoard.setColumnLine(lineState, column);
      }
      if (conformedCases.length < 500) {
        this.columnCases[column] = conformedCases;
      }
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
