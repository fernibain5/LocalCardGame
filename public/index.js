// Create an array to represent the deck of cards
const deck = [];

// Players: 1 and 2
let currentPlayer = 1;

// At the beginning, line 1 of both players are filled, so it starts at line 2
let currentLine = 2;

// Setting default line class: player 1 in line 2
let lineClass = `.line${currentLine.toString() + currentPlayer.toString()}`;

const gameState = { 1: [[], [], [], [], []], 2: [[], [], [], [], []] };

// Div element where all cards are stack up together
const deckHolder = document.querySelector(".container-row");

// Timer variables
var timerId,
  timeLeft = 100;

const h1El = document.querySelector("#turn");
const playBtn = document.querySelector("#play");

let ready = false;
let enemyReady = false;

const socket = io();

//Get your player number
socket.on("player-number", (num) => {
  if (num === -1) {
    h1El.innerHTML = "Sorry, the server is full";
  } else {
    playerNum = Number(num);
    if (playerNum === 1) currentPlayer = 2;
    console.log(playerNum);
  }
});

// Another player has connected or disconnected
socket.on("player-connection", (num) => {
  console.log(`Player number ${num} has connected or disconnected`);
  // playerConnectedOrDisconnected(num);
});

// playerConnectedOrDisconnected(num) {
// }
// Player one starts, if he doesnt act it will automatically drop his card on the first spot available
startTimer();

// Create an array of suits and ranks to use in creating the deck
const suits = ["Diamantes", "Picas", "Treboles", "Corazones"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

// Use nested loops to create the deck, with one loop for the suits and one for the ranks
for (let suit of suits) {
  for (let rank of ranks) {
    let id = rank + suit[0];
    deck.push({ suit, rank, id });
  }
}

// Shufle the deck
for (let i = deck.length - 1; i > 0; i--) {
  let j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}

const initialCards = [];

//Take initial 10 cards
for (let index = 0; index < 10; index++) {
  let card = deck.shift();
  initialCards.push(card);
}

// Select empty deck placeholder
const deckPlaceholder = document.querySelector(".container-row");

// Stack all the cards faced up and set the
deck.forEach((card) => {
  const newDiv = document.createElement("div");
  newDiv.className = "layer1";

  const newImg = document.createElement("img");
  newImg.src = `images/${card["id"]}.webp`;
  newImg.draggable = true;
  newImg.className = "container";
  newImg.id = card["id"];

  newDiv.appendChild(newImg);
  deckPlaceholder.appendChild(newDiv);

  // attach the dragstart event handler
  newImg.addEventListener("dragstart", dragStart);
});

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
}

const board = document.querySelector(".board");

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
      if (i === 0) {
        lineNumber = `line${(5 - h).toString() + (i + 1).toString()}`;
      } else {
        lineNumber = `line${(h + 1).toString() + (i + 1).toString()}`;
      }
      let placeholder = document.createElement("div");
      let id = `${h.toString() + j.toString()}p${(i + 1).toString()}`;

      placeholder.className = `card-placeholder ${lineNumber}`;
      placeholder.id = id;

      dropTarget.appendChild(placeholder);
    }
    playerBoard.appendChild(dropTarget);
  }
  board.appendChild(playerBoard);
}

const boxes = document.querySelectorAll(".line11, .line12");

boxes.forEach((cardPlaceholder, i) => {
  const card = initialCards[i];
  const newDiv = document.createElement("div");

  const newImg = document.createElement("img");
  newImg.src = `images/${card["id"]}.webp`;
  newImg.draggable = false;
  newImg.className = "container";
  newImg.id = cardPlaceholder["id"];

  newDiv.appendChild(newImg);
  cardPlaceholder.appendChild(newDiv);

  if (i < 5) gameState[1][i].push(card);
  if (i > 4) gameState[2][i - 5].push(card);
});

const cardBoxes = document.querySelectorAll(".line21");

cardBoxes.forEach((cardPlaceholder) => {
  cardPlaceholder.addEventListener("dragenter", dragEnter);
  cardPlaceholder.addEventListener("dragover", dragOver);
  cardPlaceholder.addEventListener("dragleave", dragLeave);
  cardPlaceholder.addEventListener("drop", drop);
});

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

function drop(e) {
  e.preventDefault();
  clearTimeout(timerId);
  timeLeft = 100;
  startTimer();

  deck.pop();

  // get CardPlaceholder
  let target = e.currentTarget;
  target.classList.remove("drag-over");

  const idNumOfTarget = target.id[1];

  gameState[currentPlayer][idNumOfTarget];

  //creates a back of a card img
  const backCard = document.createElement("img");
  backCard.classList.add("container");
  backCard.src = "images/backImage.webp";
  backCard.draggable = false;

  // get the draggable element
  const id = e.dataTransfer.getData("text/plain");
  const draggable = document.getElementById(id);
  const draggableParent = draggable.parentElement;

  // When final two cards left, removes the card to be swap if player decides to swap.
  if (deck.length < 2) {
    target.removeChild(target.firstChild);
  }
  if (currentPlayer === 2 && deck.length < 11) {
    deckHolder.removeChild(draggableParent);
    target.appendChild(backCard);
  } else {
    // display the draggable element
    draggable.classList.remove("hide");
    draggable.classList.remove("layer");
    draggable.draggable = false;

    deckHolder.removeChild(draggableParent);
    // drop card in the cardPlaceholder
    target.appendChild(draggable);
  }

  // remove current player events, switch to the other player and enable its cardplaceholders events
  removeAndAddEvents();
}

function startTimer() {
  document.getElementById("timer").innerHTML = timeLeft / 1000;
  if (timeLeft <= 0) {
    clearTimeout(timerId);
    autoDropCard();
    return;
  }
  timeLeft -= 1000;
  timerId = setTimeout(startTimer, 100);
}

function autoDropCard() {
  const cardDrawn = deck.pop();
  const cardEle = document.getElementById(cardDrawn["id"]);
  const cardParentDiv = cardEle.parentElement;
  const classPlaceholders = lineClass;

  //creates a back of a card img
  const backCard = document.createElement("img");
  backCard.classList.add("container");
  backCard.src = "images/backImage.webp";
  backCard.draggable = false;

  const playerCardPlaceholders = document.querySelectorAll(classPlaceholders);
  for (var i = 0; i < playerCardPlaceholders.length; i++) {
    if (!playerCardPlaceholders[i].hasChildNodes()) {
      const idNumOfTarget = playerCardPlaceholders[i].id[1];

      if (deck.length < 11 && currentPlayer === 2) {
        playerCardPlaceholders[i].appendChild(cardEle);
        gameState[currentPlayer][idNumOfTarget].push(cardDrawn);
      } else {
        playerCardPlaceholders[i].appendChild(cardEle);
        gameState[currentPlayer][idNumOfTarget].push(cardDrawn);
      }
      break;
    }
  }
  deckHolder.removeChild(cardParentDiv);

  removeAndAddEvents();

  timeLeft = 100;

  if (deck.length !== 0) {
    startTimer();
  } else {
    let pokerHandsP1 = gameState[1];
    let pokerHandsP2 = gameState[2];

    const board = document.querySelector(".board");
    const winLoseColEle = document.createElement("div");
    winLoseColEle.className = "win-lose-col";

    // a poker hand always has a lenght of 5
    p1Record = pokerHandsP1.map((handP1, i) => {
      record = compareHands(handP1, pokerHandsP2[i]);
      const winLoseEle = document.createElement("p");
      winLoseEle.className = "win-lose-container";
      winLoseEle.innerText = record;
      winLoseColEle.appendChild(winLoseEle);

      return record;
    });

    const referenceNode = board.childNodes[1];

    board.insertBefore(winLoseColEle, referenceNode);

    let winCount = 0;
    let loseCount = 0;

    p1Record.forEach((record) => {
      if (record === "Win") winCount++;
      if (record === "Lose") loseCount++;
    });

    let resultPlayerOne;

    if (winCount === loseCount) resultPlayerOne = "Tied";
    if (winCount > loseCount) resultPlayerOne = "Won";
    if (winCount < loseCount) resultPlayerOne = "Lost";

    h1El.innerText = `Player 1 has ${resultPlayerOne} the game.`;
  }
}

function removeAndAddEvents() {
  // removes active drag/drop events listeners of current players
  removeEventsToALine(lineClass);

  // change turn to the other player
  currentPlayer = (currentPlayer % 2) + 1;

  // returns Boolean if all currentLine CardPlaceholders of the player have a child (img tag of a card)
  let isNextLine = doesAllHaveAChild();

  // if isNextLine True, proceed to the next line of player, it caps at 5.
  if (isNextLine && currentLine < 5) currentLine++;

  // each cardPlaceholder has a class describing its placing. Example of player 1 line 3: "line31"
  lineClass = `.line${currentLine.toString() + currentPlayer.toString()}`;

  // add events listeners for the player to be able to drag/drop its card his current active line
  if (deck.length !== 0) addEventsToALine(lineClass);

  // Update player's turn h1 tag
  h1El.innerText = `Player ${currentPlayer.toString()}`;
}

function addEventsToALine(lineClass) {
  const cardPlaceholdersToAdd = document.querySelectorAll(lineClass);

  cardPlaceholdersToAdd.forEach((cardPlaceholder) => {
    if (cardPlaceholder.childElementCount === 0 || deck.length < 3) {
      cardPlaceholder.addEventListener("dragenter", dragEnter);
      cardPlaceholder.addEventListener("dragover", dragOver);
      cardPlaceholder.addEventListener("dragleave", dragLeave);
      cardPlaceholder.addEventListener("drop", drop);
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
}

function doesAllHaveAChild() {
  const cardPlaceholders = document.querySelectorAll(
    `.line${currentLine.toString() + currentPlayer.toString()}`
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

// Use the Fisher-Yates shuffle algorithm to shuffle the deck
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
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
  let onlyRanks1 = hand1.map((card) => card.rank);
  let onlyRanks2 = hand2.map((card) => card.rank);

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

function reverseList(list) {
  return list.reduce((acc, cur) => [cur, ...acc], []);
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

function initializeGame(deck, player1, player2) {
  let card = initialCards[i];
  for (let i = 0; i < 10; i++) {
    if (i < 5) playOneLines[i].push(card);
    if (i > 4) playerTwoLines[i - 5].push(card);
  }
  gameState[player1] = playOneLines;
  gameState[player2] = playerTwoLines;
}

// Draw a card from the top of the deck
function isMoveValid(cardDrawn, player, validLines, line) {
  let isContained = validLines.includes(line);
  if (!isContained) {
    return false;
  }
  cardDrawn["isHidden"] = false;
  gameState[player][line - 1].push(cardDrawn);
  return true;
}

function swapFinalCard(cardDrawn, player, line) {
  gameState[player][line - 1].pop();
  gameState[player][line - 1].push(cardDrawn);
}

function getValidLines(playerLines) {
  const validLines = [];
  let lengthOfLines = playerLines.map((line) => line.length);
  let smallestLine = lengthOfLines.reduce((a, b) => Math.min(a, b));

  for (let i = 0; i < 5; i++) {
    if (smallestLine === lengthOfLines[i]) validLines.push(i + 1);
  }
}

function turnToActOfPlayer(player, opponent, deck, currentLine) {
  let didHeAct = false;
  let lineNum = currentLine;
  const turnEl = document.getElementById("turn");
  turnEl.innerText = `Player turn: ${player}`;
  const cardPlaceholders = document.querySelectorAll(`.line${lineNum}1`);

  let allHaveAChild = true;
  for (const cardPlaceholder of cardPlaceholders) {
    if (cardPlaceholder.childElementCount === 0) {
      allHaveAChild = false;
      break;
    }
  }
  if (allHaveAChild) {
    cardPlaceholders = document.querySelectorAll(
      `.line${(lineNum + 1).toString()}1`
    );
    lineNum++;
  }
  const cardDrawn = deck.shift();
  // const boxes

  // while (!didHeAct) {
  //   let playerState = gameState[player];
  //   let playerStateStr = displayPlayerLines(playerState);
  //   let opponentStateStr = displayPlayerLines(gameState[opponent]);
  //   let validLines = getValidLines(playerState);
  //   let lineToPutCard;
  //   if (validLines.length === 1) {
  //     lineToPutCard = validLines[0];
  //     isMoveValid(cardDrawn, player, validLines, lineToPutCard);

  //
  //       `Forced ${rankOfCard} ${suitOfCard} on line ${lineToPutCard} for player ${player}`
  //     );
  //     didHeAct = true;
  //   } else if (deck.length === 1 || deck.length === 0) {
  //     let wantToSwap = prompt(
  //       `Your final card is ${rankOfCard}${suitOfCard[0]}. Would you like to make a swap? (Y/N)\n\n` +
  //         `${playerStateStr}`
  //     );
  //     if (wantToSwap === "Y") {
  //       let userSwapInput = prompt("Which line would you like to swap?");
  //       swapFinalCard(cardDrawn, player, parseInt(userSwapInput));
  //     }
  //     didHeAct = true;
  //   } else {
  //     let userInput = prompt(
  //       `Lines ${validLines.join(
  //         ", "
  //       )} are available. Which line you'd like to place the ${rankOfCard}${
  //         suitOfCard[0]
  //       }?\n` +
  //         `Your board:\n${playerStateStr}\nOpponent's board:\n${opponentStateStr}`
  //     );
  //     lineToPutCard = parseInt(userInput);
  //     let isValid = isMoveValid(cardDrawn, player, validLines, lineToPutCard);
  //     if (isValid) {
  //
  //         `${player} placed ${rankOfCard} ${suitOfCard} on line ${lineToPutCard}.`
  //       );
  //       didHeAct = true;
  //     } else {
  //
  //         `Ooops, invalid move. Try in valid lines: ${validLines.join(", ")}`
  //       );
  //     }
  //   }
  // }
}

function displayPlayerLines(playerState) {
  let ferHand = playerState
    .map((cards, i) => {
      let cardsString = cards
        .map((card) => `${card.rank}${card.suit[0]}`)
        .join(",");
      return `${i + 1}: ${cardsString}`;
    })
    .join("\n");
  return ferHand;
}

function playGame(deck, player1, player2) {
  let turnPlayer = 1;
  let currentLine = 2;

  while (deck.length !== 0) {
    if (deck.length === 42) {
      initializeGame(deck, player1, player2);
    }

    if (turnPlayer === currentPlayer) {
      turnToActOfPlayer(player1, player2, deck, currentLine);
      turnPlayer = player2;
    }

    if (turnPlayer === player2) {
      turnToActOfPlayer(player2, player1, deck, currentLine);
      turnPlayer = player1;
    }

    if (deck.length === 0) {
      let pokerHandsP1 = gameState[player1];
      let pokerHandsP2 = gameState[player2];

      // a poker hand always has a lenght of 5
      p1Record = pokerHandsP1.map((hand, i) =>
        compareHands(hand, pokerHandsP2[4 - i])
      );

      let winCount = 0;
      let loseCount = 0;

      p1Record.forEach((record) => {
        if (record === "Win") winCount++;
        if (record === "Lose") loseCount++;
      });
    }
  }
}
