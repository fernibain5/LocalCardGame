const express = require("express");
const dotenv = require("dotenv");
const port = process.env.PORT || 3000;
let cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const httpServer = http.createServer(app);

const socketServer = socketIO(httpServer, {
  // cors: {
  //   origin: "*",
  // },
});

// Set static folder
app.use(express.static("./public"));
app.use(express.json({ extended: false }));
// app.use(cors({ origin: true, credentials: true }));

// Start server
httpServer.listen(port, () => console.log(`Server running in port ${port}`));

// Handle a socket connection request from web client
const connections = [null, null];

const gameState = {
  players: {
    0: null,
    1: null,
  },
  deck: require("./deck"),
  currentTurn: 0,
};

let interval;
let countdown = 15;

socketServer.on("connection", (socket) => {
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      // Add the player to the game state
      gameState.players[playerIndex] = {
        socket: socket,
        hands: [[], [], [], [], []],
        currentPlayer: playerIndex,
      };
      break;
    }
  }

  socket.emit("player-number", playerIndex);
  console.log(`Player ${playerIndex} has connected`);

  // Ignore player 3
  if (playerIndex === -1) return;

  connections[playerIndex] = false;

  socket.broadcast.emit("player-connection", playerIndex);

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Player ${playerIndex} disconnected`);
    delete gameState.players[playerIndex];
    connections[playerIndex] = null;
    // if (connections === [null, null]) gameState.deck = require('./deck')

    //Tell everyone what player just disconnected
    socket.broadcast.emit("player-connection", playerIndex);
  });

  socket.on("player-ready", () => {
    socket.broadcast.emit("enemy-ready", playerIndex);
    connections[playerIndex] = true;
  });

  // Check players connections
  socket.on("check-players", () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit("check-players", players);
  });
  // Draw user Initial 5 Cards
  socket.on("draw-5-cards", () => {
    const initialCards = [];
    let cardDrawn;
    for (let i = 0; i < 5; i++) {
      cardDrawn = gameState.deck.pop();
      initialCards.push(cardDrawn);
      gameState.players[playerIndex].hands[i].push(cardDrawn);
      console.log({ deckLength: gameState.deck.length, cardDrawn });
    }
    console.log("Deck length after draw:", gameState.deck.length);

    socket.emit("draw-5-cards", {
      initialCards,
      deckLength: gameState.deck.length,
    });

    // Broadcast to the enemy the cards you drawn
    socket.broadcast.emit("enemy-5-cards", { initialCards, playerIndex });
  });

  socket.on("player-turn", () => {
    socket.emit("player-turn", gameState["currentTurn"]);
  });

  socket.on("draw-card", () => {
    if (gameState.deck.length !== 0) {
      let card = gameState.deck.pop();
      console.log({
        drawCardFrom: "draw-card",
        playerIndex,
        deckLength: gameState.deck.length,
        card,
      });
      // Check the length of the deck
      socket.emit("draw-card", { card, deckLength: gameState.deck.length });
      socket.broadcast.emit("enemy-draw-card", {
        card,
        deckLength: gameState.deck.length,
      });
    }
  });

  socket.on("change-player", () => {
    console.log({
      changePlayer: "starting running",
      previousPlayer: gameState.currentTurn,
    });
    // Change the player turn
    gameState.currentTurn = (gameState.currentTurn + 1) % 2;
    console.log({
      changePlayer: "finish running",
      currentPlayer: gameState.currentTurn,
    });
    socket.broadcast.emit("change-player", gameState.currentTurn);
  });

  socket.on("drop-card", (dropCardObj) => {
    const columnDropped = dropCardObj["idTarget"][1];
    gameState.players[playerIndex].hands[columnDropped].push(
      dropCardObj["userCardDrawn"]
    );
    socket.broadcast.emit("enemy-drop-card", {
      idTarget: dropCardObj["idTarget"],
      deckLength: gameState.deck.length,
    });
    console.log({
      playerIndex,
      deckLength: gameState.deck.length,
      columnDropped,
      userCardDrawn: dropCardObj["userCardDrawn"],
    });
  });

  socket.on("start-timer", () => {
    if (interval) {
      clearInterval(interval);
    }

    // Start the countdown timer
    interval = setInterval(() => {
      countdown--;
      socket.emit("timer-update", countdown);

      // If the countdown reaches 0, switch to the next player
      if (countdown <= 0 && gameState.deck.length > 1) {
        countdown = 10;
        gameState.currentTurn = (gameState.currentTurn + 1) % 2;
        if (gameState.deck.length > 1) {
          socket.emit("auto-place-card", gameState.deck.length);
        }
        socket.broadcast.emit("change-player", gameState.currentTurn);
      }
    }, 10);
  });

  socket.on("stop-timer", () => {
    clearInterval(interval);
  });
  socket.on("who-wins", () => {
    console.log({ players: gameState.players });
  });
});

// app.use("/api/users", userRoutes)
