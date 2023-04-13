const turnEl = document.getElementById("turn");
const board = document.querySelector(".board");
const playBtn = document.querySelector("#play");
const readyBtn = document.querySelector("#ready-btn");
const displaySwapDiv = document.getElementById("swap");
const confirmSwapBtn = document.querySelector("#swap-yes");
const declineSwapBtn = document.querySelector("#swap-no");
const resetBtn = document.querySelector("#reset-btn");

// Select empty deck placeholder
const deckPlaceholder = document.querySelector("#deck-placeholder");

let currentPlayer = null;
let timer = 20;
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
let timerRunning = false;

function getRoomIdFromPath() {
  const pathSegments = window.location.pathname.split("/");
  return pathSegments[pathSegments.length - 1];
}

const roomId = getRoomIdFromPath();

// At the beginning, line 1 of both players are filled, so it starts at line 2
let currentLine = 2;

//creates a back of a card img
const backCard = document.createElement("img");
backCard.classList.add("container");
backCard.src = "/images/backImage.webp";
backCard.draggable = false;

playBtn.addEventListener("click", startMultiPlayer);

function startMultiPlayer() {
  const socket = io();
  socket.emit("joinRoom", roomId);

  readyBtn.addEventListener("click", () => {
    if (!ready) {
      socket.emit("player-ready");
      ready = true;
      playerReady(currentPlayer);
      playMulti(socket);
    }
  });

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
    players.forEach((player, i) => {
      if (player.connected) playerConnectedOrDisconnected(i);
      if (player.connected && currentPlayer === i) {
        if (player)
          playBtn.removeEventListener("click", startMultiPlayer)
      }
      if (player.ready) {
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
    if (deckLength > 11 || deckLength === 11 && currentPlayer === 0) {
      console.log({ enemyCardDroppedId: enemyCardDrawn["id"] });
      enemyCardId = enemyCardDrawn["id"];
    } else {
      enemyCardId = `backCard${backCardCounter}`;
      backCardCounter++;
    }
    const enemyCardEl = document.getElementById(enemyCardId);
    const targetParent = document.getElementById(`${enemyDropObj.idTarget}`);

    if (deckLength < 2) targetParent.innerHTML = "";
    targetParent.appendChild(enemyCardEl);
  });

  socket.on("draw-5-cards", (draw5Obj) => {
    const boxes = document.querySelectorAll(`.line1${currentPlayer + 1}`);

    boxes.forEach((cardPlaceholder, i) => {
      const card = draw5Obj.initialCards[i];
      const newImg = document.createElement("img");
      newImg.src = `/images/${card["id"]}.webp`;
      newImg.draggable = false;
      newImg.className = "container";
      newImg.id = card["id"];

      cardPlaceholder.appendChild(newImg);
      deckLength = draw5Obj.deckLength;
    });
  });

  socket.on("draw-card", (drawCardObj) => {
    userCardDrawn = drawCardObj.card;
    // deckLength = drawCardObj.deckLength;


    playerCardEle = document.createElement("img");
    playerCardEle.src = `/images/${drawCardObj.card["id"]}.webp`;
    playerCardEle.draggable = true;
    playerCardEle.className = "container";
    playerCardEle.id = userCardDrawn["id"];
    deckPlaceholder.appendChild(playerCardEle)
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
      const newImg = document.createElement("img");
      newImg.src = `/images/${card["id"]}.webp`;
      newImg.className = "container";
      newImg.id = card["id"];

      cardPlaceholder.appendChild(newImg);
    });
  });

  socket.on("enemy-draw-card", (cardObj) => {
    deckLength = cardObj.deckLength;
    if (cardObj.deckLength > 11) {
      enemyCardDrawn = cardObj.card;

      const newImg = document.createElement("img");
      newImg.src = `/images/${enemyCardDrawn["id"]}.webp`;
      newImg.className = "container";
      newImg.id = enemyCardDrawn["id"];

      deckPlaceholder.appendChild(newImg);
    } else {
      const backCard = document.createElement("img");
      backCard.classList.add("container");
      backCard.src = "/images/backImage.webp";
      backCard.draggable = false;
      backCard.id = `backCard${backCardCounter}`;

      deckPlaceholder.append(backCard);
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
    timerRunning = false;
    const classPlaceholders = `.line${currentLine}${currentPlayer + 1}`;
    const playerCardPlaceholders = document.querySelectorAll(classPlaceholders);

    for (var i = 0; i < playerCardPlaceholders.length; i++) {
      if (!playerCardPlaceholders[i].hasChildNodes()) {
        const idTarget = playerCardPlaceholders[i].id;
        playerCardPlaceholders[i].appendChild(playerCardEle);
        socket.emit("drop-card", { userCardDrawn, idTarget });
        break;
      }
    }

    // deckPlaceholder.removeChild(cardParentEle);

    timer = 20;
    updateTimer();
  });

  socket.on("display-reset-btn", () => {
    const divReset = document.getElementById("reset");
    divReset.style.display = "inline-block";

    resetBtn.addEventListener("click", () => {
      socket.emit("new-game");
    });
  });

  socket.on("game-over", (gameState) => {
    const enemyPlayerHands = gameState[`player${currentPlayer + 1}Hands`];
    const enemyPlayerIndex = (currentPlayer + 1) % 2;
    const results = gameState["results"];
    const winLoseColEle = document.createElement("div");
    winLoseColEle.className = "win-lose-col";

    enemyPlayerHands.forEach((enemyHand, i) => {
      let enemyHiddenCardId = enemyHand[4]["id"];

      const enemyHiddenCardEle = document.createElement("img");
      enemyHiddenCardEle.src = `/images/${enemyHiddenCardId}.webp`;
      enemyHiddenCardEle.className = "container";
      enemyHiddenCardEle.id = enemyHiddenCardId;

      const cardPlaceholderId = `${i}4p${enemyPlayerIndex + 1}`;
      const enemyPlaceholderTarget = document.getElementById(cardPlaceholderId);

      enemyPlaceholderTarget.innerHTML = "";
      enemyPlaceholderTarget.appendChild(enemyHiddenCardEle);

      const winLoseEle = document.createElement("p");
      winLoseEle.className = "win-lose-container";
      winLoseEle.innerText = results[i];
      winLoseColEle.appendChild(winLoseEle);
    });

    const referenceNode = board.childNodes[1];

    board.insertBefore(winLoseColEle, referenceNode);

    let winCount = 0;
    let loseCount = 0;

    results.forEach((result) => {
      if (result === "Win") winCount++;
      if (result === "Lose") loseCount++;
    });

    let resultPlayerOne;

    if (winCount === loseCount) resultPlayerOne = "Tied";
    if (winCount > loseCount) resultPlayerOne = "Won";
    if (winCount < loseCount) resultPlayerOne = "Lost";

    turnEl.innerText = `Player 1 has ${resultPlayerOne} the game.`;
  });
}

function updateTimer() {
  document.getElementById("timer").innerHTML = timer;
}

function playerConnectedOrDisconnected(num) {
  let playerNum = parseInt(num)
  let player = `.p${playerNum + 1}`;
  let spanConnection = document.querySelector(`${player} .connected span`);
  spanConnection.classList.toggle("green");
  if (playerNum === currentPlayer) {
    document.querySelector(player).style.fontWeight = "bold";
  }

}

function dropWrapper(socket) {
  return function (e) {
    drop(e, socket);
  };
}

function drop(e, socket) {
  // if the timer is not running, return
  if (!timerRunning) {
    return;
  }

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

    timer = 20;
    updateTimer();

    target.classList.remove("drag-over");

    const idTarget = target.id;
    socket.emit("drop-card", { userCardDrawn, idTarget });

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
  }
}

function playMulti(socket) {
  if (isGameOver) return;
  // if (!ready) {
  //   socket.emit("player-ready");
  //   ready = true;
  //   playerReady(currentPlayer);
  // }

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
        socket.emit("draw-card");
        displaySwapDiv.style.display = "inline-block";

        confirmSwapBtn.addEventListener("click", () => {
          timerRunning = true;

          displaySwapDiv.style.display = "none";
        });

        declineSwapBtn.addEventListener("click", () => {
          displaySwapDiv.style.display = "none";
          deckPlaceholder.innerHTML = "";
          socket.emit("change-player");
        });
      } else {
        socket.emit("draw-card");
        socket.emit("start-timer");
        timerRunning = true;
        turnEl.innerHTML = "Your Go";

        // returns Boolean if all currentLine CardPlaceholders of the player have a child (img tag of a card)
        let isNextLine = doesAllHaveAChild();

        // if isNextLine True, proceed to the next line of player, it caps at 5.
        if (isNextLine && currentLine < 5) currentLine++;

        // each cardPlaceholder has a class describing its placing. Example of player 1 line 3: "line31"
        lineClass = `.line${currentLine}${currentPlayer + 1}`;
      }
    }
  }
}

function createPlayersBoard(socket) {
  // Creates two players boards
  for (let i = 0; i < 2; i++) {
    console.log({ currentPlayer });
    const playerBoard = document.createElement("div");
    playerBoard.className = "player-board";
    // Creates 5 drop-targets poker hands per player
    for (let h = 0; h < 5; h++) {
      let dropTarget = document.createElement("div");
      dropTarget.className = "drop-targets";
      // Adds to each poker hands its line and which player in a class
      for (var j = 0; j < 5; j++) {
        let lineNumber;
        let id;

        if (currentPlayer === 1) {
          if (i === 0) {
            lineNumber = `line${5 - j}1`;
            id = `${4 - j}${h}p1`;
          }

          if (i === 1) {
            lineNumber = `line${j + 1}2`;
            id = `${j}${h}p2`;
          }

        } else {
          if (i === 0) {
            lineNumber = `line${5 - j}2`;
            id = `${4 - j}${h}p2`;
          }

          if (i === 1) {
            lineNumber = `line${j + 1}1`;
            id = `${j}${h}p1`;
          }
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
    if (i === 0) board.insertBefore(playerBoard, board.firstChild)
    if (i === 1) board.appendChild(playerBoard);
  }
}

function createPlayerBoard() { }

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
