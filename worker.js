

// 상수 선언
const BLOCKED = -1;
const FILLED = 1;
const NEUTRAL = 0;
const NOT_INITIALIZED = 2;

onmessage = function (e) {
  solve(e.data);
  postMessage('Puzzle Solved');
};

function solve(data) {
  const ygram = new Game(data[0],data[1]);
  ygram.solve();
}

class Board {
  constructor(xSize, ySize) {
    this.xSize = xSize;
    this.ySize = ySize;
    this.state = new Array(xSize * ySize).fill(0); // NEUTRAL state
  }

  getRowLine(row, line = new Int8Array(this.xSize)) {
    for (let i=0; i<line.length; i++) {
      line[i] = this.state[row*this.xSize + i];
    }
    return line;
  }

  setRowLine(lineState, row) {
    for (let index = 0; index < lineState.length; index++) {
      this.state[row * this.xSize + index] = lineState[index];
    }
  }

  getColumnLine(column, line = new Int8Array(this.ySize)) {
    for (let index = 0; index < this.ySize; index++) {
      line[index] = this.state[index * this.xSize + column];
    }
    return line;
  }

  setColumnLine(lineState, column) {
    for (let index = 0; index < this.ySize; index++) {
      this.state[index * this.xSize + column] = lineState[index];
    }
  }
}

class Game {
  constructor(rowHints, columnHints) {
    this.rowHints = rowHints;
    this.columnHints = columnHints;
    this.gameBoard = new Board(this.columnHints.length, this.rowHints.length);
    this.conflictCasesRow = Array.from({length:rowHints.length},()=>({}));
    this.conflictCasesColumn = Array.from({length:columnHints.length},()=>({}));
    this.prevRowLines = Array.from({length:rowHints.length}, ()=>([]));
    this.prevColumnLines = Array.from({length:columnHints.length}, ()=>([]));
  }

  solve() {
    
    let notFinished = true;
    const rowLine = new Int8Array(this.columnHints.length);
    const columnLine = new Int8Array(this.rowHints.length);
    let leftRows = Array.from({ length: this.rowHints.length }, (_, index) => index);
    let leftColumns = Array.from({ length: this.columnHints.length }, (_, index) => index);
    while (notFinished) {
      
      // 업데이트할 라인을 선택하여 업데이트한다.
      
      if(leftRows.length > 0) {
        let index = -1;
        let canSkip = true;
        while(canSkip && leftRows.length > 0) {
          index = selectLine(this.rowHints, leftRows);
          this.gameBoard.getRowLine(index, rowLine);
          canSkip = checkSkip(this.rowHints[index], rowLine);
        }

        if(!isEqual(this.prevRowLines[index], rowLine)) {
          this.updateLine(rowLine,this.rowHints[index],this.conflictCasesRow[index]);

          this.prevRowLines[index] = [...rowLine];
          this.gameBoard.setRowLine(rowLine, index);
          postMessage(this.gameBoard.state);
        }
        
      }
      if(leftColumns.length > 0) {
        let index = -1;
        let canSkip = true;
        while(canSkip && leftColumns.length >0) {
          index = selectLine(this.columnHints, leftColumns);
          this.gameBoard.getColumnLine(index, columnLine);
          canSkip = checkSkip(this.columnHints[index], columnLine);
        }
        
        if (!isEqual(this.prevColumnLines[index], columnLine)) {
          this.updateLine(columnLine, this.columnHints[index], this.conflictCasesColumn[index]);

          this.prevColumnLines[index] = [...columnLine];
          this.gameBoard.setColumnLine(columnLine, index);
          postMessage(this.gameBoard.state);
        }
        
      }

      // 모든 라인이 업데이트되면 빈칸이 있는지 검증한다.
      if(leftRows.length == 0 && leftColumns.length == 0) {
        if (!this.gameBoard.state.includes(NEUTRAL)) {
          notFinished = false;
        } else {
          // 밝혀지지 않은 타일이 있으면 leftRows와 leftColumns를 초기화한다.
          leftRows = Array.from({ length: this.rowHints.length }, (_, index) => index);
          leftColumns = Array.from({ length: this.columnHints.length }, (_, index) => index);
        }
      }
    }
  }


  /** 힌트와 라인 상태를 반영하여 라인을 업데이트한다.
   * 
   * @param {*} currentLine 업데이트할 라인, 
   * @param {*} hint 해당 라인의 힌트
   * @param {*} conflictCases 해당 라인의 상충되는 케이스인덱스의 맵
   */
  updateLine(currentLine, hint, conflictCases) {   
    // 1. 힌트를 토대로 라인을 생성한다
    // 2. 생성한 라인을 currentLine과 대조한다
    // 3. currentLine과 상충되지 않는 라인끼리 비교하여 공통되는 부분을 currentLine에 칠하거나 막는다.
    // 주어진 힌트에서 가능한 모든 경우에 대해 위 과정을 반복한다.
  
    // 가지치기 전략
    // 경우의 수를 생성할 때 항상 같은 순서로 생성된다. 부합하는 경우가 상충하게 될 수 있지만 상충하던 경우가 부합하게 되지는 않는다.
    // 몇번째 경우의 수인지 세면서, 몇번째 경우의 수가 상충하는지 기억해 놓으면 그 경우의 수에 대해서는 건너뛸 수 있다.

    const line = new Array(currentLine.length).fill(NOT_INITIALIZED);
    const conjunctioned = new Int8Array(currentLine.length).fill(NOT_INITIALIZED);
    let index = 0;
    let notFinish = true;
    let firstConflictedIndex = -1;

    while (notFinish) {
      if (conflictCases[index]) {   // 상충하는 것으로 기억했던 라인은 건너뛴다.
        for(let i=0; i<line.length; i++) {
          line[i] = conflictCases[index].jumpedLine[i];
        }
        notFinish = checkFinished(line);
        index = conflictCases[index].jumpedIndex;
        if(firstConflictedIndex !== -1) {
          delete conflictCases[index];  //연속으로 상충중이면 현재 키값은 삭제해서 다음 상충하지 않을 때 한번에 점프되도록 처리
        }
      } else {
        notFinish = makeLine(line, hint); // 1. 힌트를 토대로 라인을 생성한다. 이전 line상태가 있으면 line 상태를 다음 경우로 바꾼다.
      }
      
      let isConflict = confirmLine(currentLine, line); // 2. 생성한 라인을 currentLine과 대조
      if (isConflict) {
        if (firstConflictedIndex === -1) {
          firstConflictedIndex = index;  // 상충하기 시작하면 몇번째 케이스인지 기억해둔다.
        } else if (notFinish === false) { // 루프 마지막까지 연속으로 상충하는 경우만 나오면 마지막 경우로 점프하도록 설정
          conflictCases[firstConflictedIndex] = {jumpedLine:[...line], jumpedIndex:index};  
          firstConflictedIndex = -1;
        }
      } else {
        if (firstConflictedIndex !== -1) {
          conflictCases[firstConflictedIndex] = {jumpedLine:[...line], jumpedIndex:index};  // 상충이 풀리면 상충 시작한 인덱스에서 점프할 수 있도록 설정
          firstConflictedIndex = -1;
        }
        
        if (conjunctioned[0] === NOT_INITIALIZED) {   // 첫번째 얻어진 라인이면 첫 라인이 conjunctioned가 된다.
          conjunctioned.set(line);
        } else {
          conjunctionLine(conjunctioned, line); // conjunctioned와 line이 일치하는 타일만 conjunctioned에 남긴다.
        }
      }
      index++;
    }
    disjunctionLine(currentLine, conjunctioned); // currentLine 에 conjuntioned를 업데이트
  }
}

function checkSkip(hint, line) {
  let size = 0;
  if (!line.includes(FILLED) && !line.includes(BLOCKED)) {
    for ( length of hint) {
      size += length;
      size++;
    }
    size--;
    if (line.length >= 2 * size) {
      return true;
    }
  }
  return false;
}

function selectLine(hints, leftHintIndexes) {
  let max = 0;
  let choosen = 0;
  for (let i of leftHintIndexes) {
    let sum = hints[i].reduce((acc, curValue) => acc + curValue, 0);
    if (sum > max) {
      max = sum;
      choosen = i;
    }
  } 
  const indexToRemove = leftHintIndexes.indexOf(choosen);
  leftHintIndexes.splice(indexToRemove, 1);
  return choosen;
} 

function isEqual(a,b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
/**
 * 
 * @param {Int8[]} line 초기값이 2로 세팅되어 있으면 초기세팅되지 않은 라인으로 인식한다
 * @param {Int[]} hint 
 * @returns {bool} not Finish 이면 true
 */
function makeLine(line, hint) {
  let notFinished = true;
  if(line[0] === NOT_INITIALIZED) { // 처음이면 라인 초기 세팅해야함. 최초의 경우의 수로 세팅된다.
    startIndex = 0;
    hint.forEach((length)=>{
      line.fill(FILLED,startIndex,startIndex + length);   // 힌트에서 주어진 길이만큼 칠하고
      startIndex = startIndex +length;
      if(startIndex < line.length) {
        line.fill(BLOCKED,startIndex, startIndex + 1);      // 힌트가 끝나고 나면 다음칸은 BLOCKED로 된다.
        startIndex = startIndex + 1;
      }
    });
    if (startIndex < line.length) {
      line.fill(BLOCKED, startIndex); // 다 칠하고 나서 여백이 있으면 여백은 BLOCKED로 채운다.
    }
    // 시프트할 공간이 없이 꽉 차 있으면 notFinish는 false (마지막 인덱스가 FILLED이면 false)
    if (line[line.length-1] === FILLED) {
      notFinished = false;
    }
  } else {
    // 라인을 다음 상태로 바꾼다
    
    // limit = line.length;
    // 가장 오른쪽에서 가장 마지막 힌트길이 타일을 얻어 우측으로 시프트한다. 
    // 타일의 overIndex == limit 이면 그 왼쪽 타일을 우측으로 한칸 시프트한다. 이때 왼쪽 타일의 limit는 startIndex-1.
    // 지금 조작하는 타일을 그 다음으로 보낸다.
    // 시프트할 왼쪽 타일이 존재하지 않으면 notFinish는 false

    notFinished = shiftToNext(line);
  }
  notFinished = checkFinished(line);
  return notFinished;
}

function shiftToNext(line) {
 
  let index = line.length - 1;
  let lastState = line[index];
  let notFinished = true;

  switch(lastState) {
    case BLOCKED:       // 마지막 조각이 BLOCKED 라면, 
      if (!line.includes(FILLED)) {   // 앞에 FILLED가 없으면 시프트할 것이 없다. BLOCKED를 꺼내면서 인덱스를 초과하는 것도 방지된다.
        notFinished = false;
        return notFinished;
      }
      shiftFilledToRightSpace(line);
      break;
    
    case FILLED:        // 마지막 조각이 FILLED 라면,
      notFinished = shiftPrevFilledToRightSpace(line);
      break;
  }
  // notFinished가 true 인 경우 한번 더 검사해야 한다. shift시키는 함수에서는 shift 과정에서 완료가 확인되는 부분에서만 완료를 확인했을 뿐이다.
  if (notFinished) {
    notFinished = checkFinished(line);
  }
  return notFinished;
}

function checkFinished(line) {
  let notFinished = false;
  let blockedLength = 0;
  let index = 0;
  // 마지막 타일이 Filled이고, 
  // filled와 filled 사이의 blocked의 길이가 모두 1이면 끝났다.
  if (line[line.length-1] === BLOCKED) {
    notFinished = true;
    return notFinished;
  }
  while(line[index] === BLOCKED) {
    index++;
  }
  // 이제 인덱스는 가장 왼쪽 FILLED 타일에 위치한다.
 
  while(index<line.length-1) {
    switch(line[index]) {
      case FILLED:
        blockedLength = 0;
        break;
      case BLOCKED:
        blockedLength++;
        if (blockedLength > 1) {
          notFinished = true;
          return notFinished;
        }
        break;    
    }
    index++;
  }  
  return notFinished;
}

function shiftPrevFilledToRightSpace(line) {
  const stack = [];
  let notFinished = true;
  rightPieceToStack(line, stack); // 마지막 FILLED를 스택에 넣는다.
  if (line.length === 0) {        // 모든 스택이 FILLED라면 더 이상 시프트할 공간이 없다. line상태를 호출 전으로 돌려야 한다.
    recoverLine(line, stack);
    notFinished = false;
    return notFinished; 
  }
  line.pop()               // BLOCKED 하나를 stack에 넣는다.
  stack.push([BLOCKED]);
  if (!line.includes(FILLED)) {   // 더 이상 FILLED가 없으면 시프트가 끝났다. line상태를 호출 전으로 돌려놔야 한다.
    notFinished = false;
    recoverLine(line, stack);
    return notFinished;
  } else if (line[line.length - 1] === FILLED) {
    notFinished = shiftPrevFilledToRightSpace(line); // 마지막이 FILLED라면 남은 라인에 대해 재귀호출해서 처리한다.
    notFinished = checkFinished(line);
    if (notFinished === false || line[line.length-1] === FILLED) {    
      // 더이상 시프트가 없다면 line을 복구하고 종료한다. 라인 끝이 FILLED 여도 line을 복구하면 된다.
      recoverLine(line, stack);
      return notFinished;
    }
  } else {                                           // 마지막이 BLOCKED라면 시프트한 후 나머지 타일을 뒤에 당겨 붙여야 한다.
    shiftFilledToRightSpace(line);
    if (line[line.length - 1] === FILLED) {   // 시프트의 결과로 당겨 붙일 공간이 없게 되었다면 그대로 붙이고 종료한다.
      recoverLine(line, stack);
      notFinished = checkFinished(line);
      return notFinished;
    } 
  }
  // 뽑아 놨던 칠해진 타일을 앞의 칠해진 타일 바로 다음으로 붙여야 한다.
  stack.pop() // BLOCKED 하나를 stack에서 뽑는다.
  let piece = stack.pop();  // FILLED 타일을 뽑는다.
  rightPieceToStack(line, stack); // 빈공간을 스택에 넣는다.
  line.push(BLOCKED);
  line.push(...piece);
  piece = stack.pop();
  line.push(...piece);
 
  notFinished = checkFinished(line);
  return notFinished;
}

function recoverLine(line, stack) {
  while (stack.length > 0) {
    let piece = stack.pop();
    line.push(...piece);
  }
}

function shiftFilledToRightSpace(line) {
  const stack = [];
  rightPieceToStack(line, stack); // line 끝의 공백을 스택에 넣는다.
  // 이제 index는 맨 마지막 FILLED 타일을 가리키고 있다.
  rightPieceToStack(line, stack); // line 끝의 FILLED를 스택에 넣는다.
  let piece = stack.pop(); // FILLED를 꺼낸다.
  line.push(BLOCKED); // 한칸 이동을 위한 블록 추가
  line.push(...piece); // 칠해진 타일을 다시 넣는다.
  piece = stack.pop();  // BLOCKED 조각을 스택에서 꺼낸다
  piece.pop() // 한칸 이동을 위해 BLOCKED 하나를 제거한다.
  line.push(...piece);  // 꺼낸 BLOCKED를 다시 붙인다.
}

function rightPieceToStack(line, stack) {
  let index = line.length - 1;
  let piece = [];
  const state = line[index];                
  while(index >= 0 && line[index] === state) {  
    line.pop();
    piece.push(state);
    index --;
  }
  stack.push(piece);
}


function confirmLine(originLine, line) {
  return originLine.some((state, index) => line[index] * state === -1); // BLOCKED와 FILLED를 곱할때만 -1이 나온다.
}

function conjunctionLine(conjunctioned, line) {
  for (let i=0; i<conjunctioned.length; i++) {
    conjunctioned[i] = conjunctioned[i] === line[i] ? conjunctioned[i] : NEUTRAL;
  }
}

function disjunctionLine(originLine, line) {
  for (let i=0; i<originLine.length; i++) {
    originLine[i] = originLine[i] === NEUTRAL ? line[i] : originLine[i];
  }
}

/*
module.exports = { shiftToNext, Game };
*/