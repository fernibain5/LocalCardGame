const turnEl = document.getElementById("turn");
const board = document.querySelector(".board");
const playBtn = document.querySelector("#play");
const readyBtn = document.querySelector("#ready-btn");
const displaySwapDiv = document.getElementById("swap");
const confirmSwapBtn = document.querySelector("#swap-yes");
const declineSwapBtn = document.querySelector("#swap-no");
const resetBtn = document.querySelector("#reset-btn");

// Select empty deck placeholder
const deckPlaceholder = document.querySelector(".container-row");

let currentPlayer = null;
let timer = 40;
let enemyCardDrawn;
let userCardDrawn;
let playerCardEle;
let connectedPlayer = "user";
let ready = false;
let enemyReady = false;
let isGameOver = false;
let isGameJustStarted = true;
let playerTurn = 0;
let deckLength = 52;
let lineClass;
let backCardCounter = 0;

// At the beginning, line 1 of both players are filled, so it starts at line 2
let currentLine = 2;

//creates a back of a card img
const backCard = document.createElement("img");
backCard.classList.add("container");
backCard.src = "images/backImage.webp";
backCard.draggable = false;

playBtn.addEventListener("click", startMultiPlayer);

function startMultiPlayer() {
  const socket = io();

  readyBtn.addEventListener("click", () => playMulti(socket));

  //Get your player number
  socket.on("player-number", (num) => {
    if (num === -1) {
      turnEl.innerHTML = "Sorry, the server is full";
    } else {
      currentPlayer = parseInt(num);
      if (currentPlayer === 1) {
        connectedPlayer = "enemy";
      }

      // Get other player status
      socket.emit("check-players");
    }
  });

  socket.on("check-players", (players) => {
    players.forEach((p, i) => {
      if (p.connected) playerConnectedOrDisconnected(i);
      if (p.ready) {
        playerReady(i);
        if (i !== currentPlayer) enemyReady = true;
      }
    });
  });

  // Another player has connected or disconnected
  socket.on("player-connection", (num) => {
    playerConnectedOrDisconnected(num);
  });

  socket.on("enemy-ready", (num) => {
    enemyReady = true;
    playerReady(num);
    if (ready) playMulti(socket);
  });
  socket.on("enemy-drop-card", (enemyDropObj) => {
    deckLength = enemyDropObj.deckLength;
    let enemyCardId;
    if (deckLength >= 11) {
      enemyCardId = enemyCardDrawn["id"];
    } else {
      enemyCardId = `backCard${backCardCounter}`;
      backCardCounter++;
    }
    const enemyCardEl = document.getElementById(enemyCardId);
    const currentParent = enemyCardEl.parentElement;
    const targetParent = document.getElementById(`${enemyDropObj.idTarget}`);
    // deckPlaceholder.innerHTML = "";
    if (deckLength < 2) targetParent.innerHTML = "";
    // console.log({
    //   enemyCardEl,
    //   enemyCardId,
    //   targetParent,
    //   deckLength,
    //   currentParent,
    // });
    targetParent.appendChild(enemyCardEl);
  });

  socket.on("draw-5-cards", (draw5Obj) => {
    const boxes = document.querySelectorAll(`.line1${currentPlayer + 1}`);

    boxes.forEach((cardPlaceholder, i) => {
      const card = draw5Obj.initialCards[i];
      const newDiv = document.createElement("div");

      const newImg = document.createElement("img");
      newImg.src = `images/${card["id"]}.webp`;
      newImg.draggable = false;
      newImg.className = "container";
      newImg.id = cardPlaceholder["id"];

      newDiv.appendChild(newImg);
      cardPlaceholder.appendChild(newDiv);
      deckLength = draw5Obj.deckLength;
    });
  });

  socket.on("draw-card", (drawCardObj) => {
    userCardDrawn = drawCardObj.card;
    // deckLength = drawCardObj.deckLength;

    const newDiv = document.createElement("div");
    newDiv.className = "layer1";

    playerCardEle = document.createElement("img");
    playerCardEle.src = `images/${drawCardObj.card["id"]}.webp`;
    playerCardEle.draggable = true;
    playerCardEle.className = "container";
    playerCardEle.id = userCardDrawn["id"];

    newDiv.appendChild(playerCardEle);
    console.log(playerCardEle);
    deckPlaceholder.appendChild(newDiv);

    // attach the dragstart event handler
    playerCardEle.addEventListener("dragstart", dragStart);
    deckLength = drawCardObj.deckLength;
  });
  socket.on("enemy-5-cards", (enemyInitialCardsObj) => {
    const boxes = document.querySelectorAll(
      `.line1${parseInt(enemyInitialCardsObj["playerIndex"]) + 1}`
    );

    boxes.forEach((cardPlaceholder, i) => {
      const card = enemyInitialCardsObj["initialCards"][i];
      const newDiv = document.createElement("div");

      const newImg = document.createElement("img");
      newImg.src = `images/${card["id"]}.webp`;
      newImg.draggable = false;
      newImg.className = "container";
      newImg.id = cardPlaceholder["id"];

      newDiv.appendChild(newImg);
      cardPlaceholder.appendChild(newDiv);
    });
  });

  socket.on("enemy-draw-card", (cardObj) => {
    deckLength = cardObj.deckLength;
    const newDiv = document.createElement("div");
    newDiv.className = "layer1";
    deckLength = cardObj.deckLength;
    if (cardObj.deckLength > 11) {
      enemyCardDrawn = cardObj.card;

      const newImg = document.createElement("img");
      newImg.src = `images/${enemyCardDrawn["id"]}.webp`;
      newImg.className = "container";
      newImg.id = enemyCardDrawn["id"];

      newDiv.appendChild(newImg);
      deckPlaceholder.appendChild(newDiv);
    } else {
      const backCard = document.createElement("img");
      backCard.classList.add("container");
      backCard.src = "images/backImage.webp";
      backCard.draggable = false;
      backCard.id = `backCard${backCardCounter}`;

      newDiv.appendChild(backCard);
      console.dir(newDiv);
      deckPlaceholder.append(newDiv);
    }
  });
  socket.on("change-player", (changedPlayer) => {
    playerTurn = changedPlayer;
    playMulti(socket);
  });

  socket.on("timer-update", (countdown) => {
    timer = countdown;
    updateTimer();
  });

  socket.on("auto-place-card", () => {
    const classPlaceholders = `.line${currentLine}${currentPlayer + 1}`;
    const playerCardPlaceholders = document.querySelectorAll(classPlaceholders);

    for (var i = 0; i < playerCardPlaceholders.length; i++) {
      if (!playerCardPlaceholders[i].hasChildNodes()) {
        const idTarget = playerCardPlaceholders[i].id;
        playerCardPlaceholders[i].appendChild(playerCardEle);
        socket.emit("drop-card", { userCardDrawn, idTarget });
        console.log("Drop emitted from autoplaced function");
        break;
      }
    }

    console.log({ removeFrom: "auto-place", lineClass, deckLength });
    // deckPlaceholder.removeChild(cardParentEle);

    timer = 10;
    updateTimer();
  });

  socket.on("display-reset-btn", () => {
    const divReset = document.getElementById("reset");
    divReset.style.display = "inline-block";

    resetBtn.addEventListener("click", () => {
      socket.emit("new-game");
    });
  });
}

function updateTimer() {
  document.getElementById("timer").innerHTML = timer;
}

function playerConnectedOrDisconnected(num) {
  let player = `.p${parseInt(num) + 1}`;
  let spanConnection = document.querySelector(`${player} .connected span`);
  spanConnection.classList.toggle("green");
  if (parseInt(num) === currentPlayer) {
    document.querySelector(player).style.fontWeight = "bold";
  }
}

function dropWrapper(socket) {
  return function (e) {
    drop(e, socket);
  };
}
function dropSwapWrapper(socket) {
  return function (e) {
    dropSwap(e, socket);
  };
}

function drop(e, socket) {
  e.preventDefault();
  // get CardPlaceholder
  // currentLine = `.line${currentLine}${currentPlayer + 1}`;
  let target = e.currentTarget;

  if (
    (target.classList.contains(lineClass.substring(1)) &&
      currentPlayer === playerTurn &&
      target.childElementCount === 0) ||
    (deckLength < 2 && target.id[1] === "4")
  ) {
    socket.emit("stop-timer");

    timer = 40;
    updateTimer();

    target.classList.remove("drag-over");

    const idTarget = target.id;
    socket.emit("drop-card", { userCardDrawn, idTarget });
    console.log("Drop emitted from drop function");

    // get the draggable element
    const id = e.dataTransfer.getData("text/plain");
    const draggable = document.getElementById(id);
    const draggableParent = draggable.parentElement;

    draggable.classList.remove("hide");
    draggable.classList.remove("layer");
    draggable.draggable = false;

    // deckPlaceholder.removeChild(draggableParent);
    if (deckLength < 2) target.innerHTML = "";

    // drop card in the cardPlaceholder
    target.appendChild(draggable);

    socket.emit("change-player");
  }
  // else if() {

  // }
  else {
    alert("Invalid Move");
    console.log({ currentLine, lineClass, targetClasslist: target.classList });
  }
}

function dropSwap(e, socket) {
  e.preventDefault();
  console.log(`running DROPSWAP FUNCTION`);

  timer = 40;
  updateTimer();

  // get CardPlaceholder
  let target = e.currentTarget;
  target.classList.remove("drag-over");

  const idTarget = target.id;

  socket.emit("drop-card", { userCardDrawn, idTarget });
  console.log("Drop emitted from drop SWAP function");

  // get the draggable element
  const id = e.dataTransfer.getData("text/plain");
  const draggable = document.getElementById(id);
  const draggableParent = draggable.parentElement;

  draggable.classList.remove("hide");
  draggable.classList.remove("layer");
  draggable.draggable = false;

  // deckPlaceholder.innerHTML = "";
  console.dir(target);
  target.innerHTML = "";
  console.dir(target);

  target.appendChild(draggable);
  // }
  lineClass = `.line${currentLine}${currentPlayer + 1}`;
  removeEventsToALine(lineClass, socket);

  socket.emit("change-player");
  console.log(`FINISH DROPSWAP FUNCTION`);
}

function addEventsToALine(lineClass, socket) {
  const cardPlaceholdersToAdd = document.querySelectorAll(lineClass);
  console.dir(cardPlaceholdersToAdd);

  cardPlaceholdersToAdd.forEach((cardPlaceholder) => {
    if (cardPlaceholder.childElementCount === 0 && deckLength > 2) {
      cardPlaceholder.addEventListener("dragenter", dragEnter);
      cardPlaceholder.addEventListener("dragover", dragOver);
      cardPlaceholder.addEventListener("dragleave", dragLeave);
      cardPlaceholder.addEventListener("drop", dropWrapper(socket));
      cardPlaceholder.style.borderColor = "red";
    } else if (deckLength < 3) {
      cardPlaceholder.addEventListener("dragenter", dragEnter);
      cardPlaceholder.addEventListener("dragover", dragOver);
      cardPlaceholder.addEventListener("dragleave", dragLeave);
      cardPlaceholder.addEventListener("drop", dropSwapWrapper(socket));
      cardPlaceholder.style.borderColor = "red";
    }
  });
}

function removeEventsToALine(lineClass) {
  const cardPlaceholdersToRemove = document.querySelectorAll(lineClass);

  cardPlaceholdersToRemove.forEach((cardPlaceholder) => {
    cardPlaceholder.removeEventListener("dragenter", dragEnter);
    cardPlaceholder.removeEventListener("dragover", dragOver);
    cardPlaceholder.removeEventListener("dragleave", dragLeave);
    cardPlaceholder.removeEventListener("drop", drop);
    cardPlaceholder.style.borderColor = "gray";
  });

  console.log({ cardPlaceholdersToRemove, deckLength, lineClass });
}
// Player one starts, if he doesnt act it will automatically drop his card on the first spot available
// startTimer();

function playMulti(socket) {
  if (isGameOver) return;
  if (!ready) {
    socket.emit("player-ready");
    ready = true;
    playerReady(currentPlayer);
  }

  if (enemyReady) {
    if (isGameJustStarted === true) {
      createPlayersBoard(socket);

      socket.emit("draw-5-cards");
      isGameJustStarted = false;
    }
    if (currentPlayer === playerTurn) {
      if (deckLength === 0) {
        socket.emit("who-wins");
      } else if (deckLength <= 2) {
        socket.emit("stop-timer");
        console.log({ deckLength });
        socket.emit("draw-card");
        displaySwapDiv.style.display = "inline-block";

        confirmSwapBtn.addEventListener("click", () => {
          displaySwapDiv.style.display = "none";
          // lineClass = `.line${currentLine}${currentPlayer + 1}`;
          // addEventsToALine(lineClass, socket);
        });

        declineSwapBtn.addEventListener("click", () => {
          displaySwapDiv.style.display = "none";
          deckPlaceholder.innerHTML = "";
          socket.emit("change-player");
        });
      } else {
        socket.emit("draw-card");
        socket.emit("start-timer");
        turnEl.innerHTML = "Your Go";

        // returns Boolean if all currentLine CardPlaceholders of the player have a child (img tag of a card)
        let isNextLine = doesAllHaveAChild();

        // if isNextLine True, proceed to the next line of player, it caps at 5.
        if (isNextLine && currentLine < 5) currentLine++;

        // each cardPlaceholder has a class describing its placing. Example of player 1 line 3: "line31"
        lineClass = `.line${currentLine}${currentPlayer + 1}`;

        // add events listeners for the player to be able to drag/drop its card his current active line
        // addEventsToALine(lineClass, socket);
      }
    }
  }
}

function createPlayersBoard(socket) {
  // Creates two players boards
  for (let i = 0; i < 2; i++) {
    let playerBoard = document.createElement("div");
    playerBoard.className = "player-board";
    // Creates 5 drop-targets poker hands per player
    for (let h = 0; h < 5; h++) {
      let dropTarget = document.createElement("div");
      dropTarget.className = "drop-targets";
      // Adds to each poker hands its line and which player in a class
      for (var j = 0; j < 5; j++) {
        let lineNumber;
        let id;
        if (i === 0) {
          lineNumber = `line${5 - h}${i + 1}`;
          id = `${j}${4 - h}p${i + 1}`;
        } else {
          lineNumber = `line${h + 1}${i + 1}`;
          id = `${j}${h}p${i + 1}`;
        }
        let placeholder = document.createElement("div");

        placeholder.className = `card-placeholder ${lineNumber}`;
        placeholder.id = id;
        placeholder.addEventListener("dragenter", dragEnter);
        placeholder.addEventListener("dragover", dragOver);
        placeholder.addEventListener("dragleave", dragLeave);
        placeholder.addEventListener("drop", dropWrapper(socket));

        dropTarget.appendChild(placeholder);
      }
      playerBoard.appendChild(dropTarget);
    }
    board.appendChild(playerBoard);
  }
}

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
}

function dragEnter(e) {
  e.preventDefault();
  e.target.classList.add("card-placeholder.drag-over");
}

function dragOver(e) {
  e.preventDefault();
  e.target.classList.add("card-placeholder.drag-over");
}
function dragLeave(e) {
  e.target.classList.remove("card-placeholder.drag-over");
}

function playerReady(num) {
  let player = `.p${parseInt(num) + 1}`;
  let readySpan = document.querySelector(`${player} .ready span`);
  readySpan.classList.toggle("green");
}

// function startTimer() {
//   document.getElementById("timer").innerHTML = timeLeft / 1000;
//   if (timeLeft <= 0) {
//     clearTimeout(timerId);
//     autoDropCard();
//     return;
//   }
//   timeLeft -= 1000;
//   timerId = setTimeout(startTimer, 100);
// }

// function autoDropCard() {
//   const cardDrawn = deck.pop();
//   const cardEle = document.getElementById(cardDrawn["id"]);
//   const cardParentDiv = cardEle.parentElement;
//   const classPlaceholders = lineClass;

//   //creates a back of a card img
//   const backCard = document.createElement("img");
//   backCard.classList.add("container");
//   backCard.src = "images/backImage.webp";
//   backCard.draggable = false;

//   const playerCardPlaceholders = document.querySelectorAll(classPlaceholders);
//   for (var i = 0; i < playerCardPlaceholders.length; i++) {
//     if (!playerCardPlaceholders[i].hasChildNodes()) {
//       const idNumOfTarget = playerCardPlaceholders[i].id[1];

//       if (deck.length < 11 && currentPlayer === 2) {
//         playerCardPlaceholders[i].appendChild(cardEle);
//         gameState[currentPlayer][idNumOfTarget].push(cardDrawn);
//       } else {
//         playerCardPlaceholders[i].appendChild(cardEle);
//         gameState[currentPlayer][idNumOfTarget].push(cardDrawn);
//       }
//       break;
//     }
//   }
//   deckPlaceholder.removeChild(cardParentDiv);

//   removeAndAddEvents();

//   timeLeft = 100;

//   if (deck.length !== 0) {
//     startTimer();
//   } else {
//     let pokerHandsP1 = gameState[1];
//     let pokerHandsP2 = gameState[2];

//     const board = document.querySelector(".board");
//     const winLoseColEle = document.createElement("div");
//     winLoseColEle.className = "win-lose-col";

//     // a poker hand always has a lenght of 5
//     p1Record = pokerHandsP1.map((handP1, i) => {
//       record = compareHands(handP1, pokerHandsP2[i]);
//       const winLoseEle = document.createElement("p");
//       winLoseEle.className = "win-lose-container";
//       winLoseEle.innerText = record;
//       winLoseColEle.appendChild(winLoseEle);

//       return record;
//     });

//     const referenceNode = board.childNodes[1];

//     board.insertBefore(winLoseColEle, referenceNode);

//     let winCount = 0;
//     let loseCount = 0;

//     p1Record.forEach((record) => {
//       if (record === "Win") winCount++;
//       if (record === "Lose") loseCount++;
//     });

//     let resultPlayerOne;

//     if (winCount === loseCount) resultPlayerOne = "Tied";
//     if (winCount > loseCount) resultPlayerOne = "Won";
//     if (winCount < loseCount) resultPlayerOne = "Lost";

//     turnEl.innerText = `Player 1 has ${resultPlayerOne} the game.`;
//   }
// }

function doesAllHaveAChild() {
  const cardPlaceholders = document.querySelectorAll(
    `.line${currentLine}${currentPlayer + 1}`
  );

  let allHaveAChild = true;
  for (const cardPlaceholder of cardPlaceholders) {
    if (cardPlaceholder.childElementCount === 0) {
      allHaveAChild = false;
      break;
    }
  }
  return allHaveAChild;
}

function convertListToInt(pokerHand) {
  let pokerHands = pokerHand.map((card) => {
    switch (card) {
      case "T":
        return 10;
      case "J":
        return 11;
      case "Q":
        return 12;
      case "K":
        return 13;
      case "A":
        return 14;
      default:
        return Number(card);
    }
  });
  return pokerHands;
}

function isRoyalFlush(hand) {
  let values = hand.map((card) => card.rank);
  if (
    isFlush(hand) &&
    isStraight(hand) &&
    values.includes(10) &&
    values.includes("A")
  ) {
    return true;
  }
  return false;
}

function isStraightFlush(hand) {
  return isFlush(hand) && isStraight(hand);
}

function isFourOfAKind(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  for (let value in counts) {
    if (counts[value] === 4) {
      return true;
    }
  }
  return false;
}

function isFullHouse(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  let three = false;
  let two = false;
  for (let value in counts) {
    if (counts[value] === 3) {
      three = true;
    } else if (counts[value] === 2) {
      two = true;
    }
  }
  return three && two;
}

function isFlush(hand) {
  let suits = hand.map((card) => card["suit"]);
  return new Set(suits).size === 1;
}

function isStraight(hand) {
  let ranks = hand.map((card) => card.rank);
  let values = convertListToInt(ranks);
  values.sort((a, b) => a - b);
  if (values === [2, 3, 4, 5, 14]) return true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] + 1 !== values[i + 1]) {
      return false;
    }
  }
  return true;
}

function isThreeOfAKind(hand) {
  let values = hand.map((card) => card.rank);
  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  for (let value in counts) {
    if (counts[value] === 3) {
      return true;
    }
  }
  return false;
}

function isTwoPairs(hand) {
  let ranks = hand.map((card) => card.rank);
  let rankCount = {};
  for (let i = 0; i < ranks.length; i++) {
    if (rankCount[ranks[i]]) {
      rankCount[ranks[i]]++;
    } else {
      rankCount[ranks[i]] = 1;
    }
  }
  let pairs = 0;
  for (let rank in rankCount) {
    if (rankCount[rank] === 2) {
      pairs++;
    }
  }
  return pairs === 2;
}

function isOnePair(hand) {
  let ranks = hand.map((card) => card.rank);
  let rankCount = {};
  for (let i = 0; i < ranks.length; i++) {
    if (rankCount[ranks[i]]) {
      rankCount[ranks[i]]++;
    } else {
      rankCount[ranks[i]] = 1;
    }
  }
  let pairs = 0;
  for (let rank in rankCount) {
    if (rankCount[rank] === 2) {
      pairs++;
    }
  }
  return pairs === 1;
}

function getHandType(hand) {
  if (isRoyalFlush(hand)) {
    return 10;
  } else if (isStraightFlush(hand)) {
    return 9;
  } else if (isFourOfAKind(hand)) {
    return 8;
  } else if (isFullHouse(hand)) {
    return 7;
  } else if (isFlush(hand)) {
    return 6;
  } else if (isStraight(hand)) {
    return 5;
  } else if (isThreeOfAKind(hand)) {
    return 4;
  } else if (isTwoPairs(hand)) {
    return 3;
  } else if (isOnePair(hand)) {
    return 2;
  } else {
    return 1;
  }
}

function compareHands(hand1, hand2) {
  let hand1Type = getHandType(hand1);
  let hand2Type = getHandType(hand2);

  if (hand1Type > hand2Type) {
    return "Win";
  } else if (hand1Type < hand2Type) {
    return "Lose";
  } else {
    let hand1TieBreaker = getTieBreaker(hand1, hand1Type);
    let hand2TieBreaker = getTieBreaker(hand2, hand2Type);
    for (let i = 0; i < hand1TieBreaker.length; i++) {
      if (hand1TieBreaker[i] > hand2TieBreaker[i]) {
        return "Win";
      } else if (hand1TieBreaker[i] < hand2TieBreaker[i]) {
        return "Lose";
      }
    }
    return "Tie";
  }
}

function getHandType(hand) {
  if (isRoyalFlush(hand)) {
    return 10;
  } else if (isStraightFlush(hand)) {
    return 9;
  } else if (isFourOfAKind(hand)) {
    return 8;
  } else if (isFullHouse(hand)) {
    return 7;
  } else if (isFlush(hand)) {
    return 6;
  } else if (isStraight(hand)) {
    return 5;
  } else if (isThreeOfAKind(hand)) {
    return 4;
  } else if (isTwoPairs(hand)) {
    return 3;
  } else if (isOnePair(hand)) {
    return 2;
  } else {
    return 1;
  }
}

function getTieBreaker(hand, handType) {
  let ranks = hand.map((card) => card.rank);
  let values = convertListToInt(ranks);

  let counts = {};
  values.forEach((value) => {
    if (counts[value]) {
      counts[value]++;
    } else {
      counts[value] = 1;
    }
  });
  if (handType === 10) {
    return [14];
  } else if (handType === 9) {
    return [Math.max(...values)];
  } else if (handType === 8) {
    for (let value in counts) {
      if (counts[value] === 4) {
        return [Number(value)];
      }
    }
  } else if (handType === 7) {
    let three = 0,
      two = 0;
    for (let value in counts) {
      if (counts[value] === 3) {
        three = Number(value);
      } else if (counts[value] === 2) {
        two = Number(value);
      }
    }
    return [three, two];
  } else if (handType === 6) {
    return values.sort((a, b) => b - a);
  } else if (handType === 5) {
    if (values.includes(14) && values.includes(2)) return [0];

    return [Math.max(...values)];
  } else if (handType === 4) {
    let three = 0;
    for (let value in counts) {
      if (counts[value] === 3) {
        three = Number(value);
      }
    }
    return [three];
  } else if (handType === 3) {
    let twoPairs = [];
    let highCard;
    for (let value in counts) {
      if (counts[value] === 2) {
        twoPairs.push(Number(value));
      }
      if (counts[value] === 1) {
        highCard = Number(value);
      }
    }
    twoPairs.sort((a, b) => b - a);
    return [...twoPairs, highCard];
  } else if (handType === 2) {
    let pair;
    let highCards = [];
    for (let value in counts) {
      if (counts[value] === 2) {
        pair = Number(value);
      } else {
        highCards.push(Number(value));
      }
    }
    highCards.sort((a, b) => b - a);

    return [pair, ...highCards];
  } else if (handType === 1) {
    return values.sort((a, b) => b - a);
  }
}
