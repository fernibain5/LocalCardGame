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

socketServer.on("connection", (socket) => {
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      // Add the player to the game state
      gameState.players.playerIndex = {
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
      gameState.players.playerIndex.hands[i].push(cardDrawn);
    }
    // console.log("Deck length after draw:", gameState.deck.length);

    socket.emit("draw-5-cards", initialCards);

    // Broadcast to the enemy the cards you drawn
    socket.broadcast.emit("enemy-5-cards", { initialCards, playerIndex });
  });

  socket.on("player-turn", () => {
    socket.emit("player-turn", gameState["currentTurn"]);
  });

  socket.on("draw-card", () => {
    if (connections !== [true, true]) {
      let card = gameState.deck.pop();
      // console.log("Card drawn: ", card);
      // Check the length of the deck
      // console.log("Deck length after draw: ", gameState.deck.length);
      socket.emit("draw-card", card);
      // socket.broadcast.emit("enemy-draw-card", card);
    }
  });

  socket.on("change-player", () => {
    console.log("Player Index: ", playerIndex);
    gameState.players.playerIndex.currentPlayer;
    // Change the player turn
    console.log("gameState before: ", gameState.currentTurn);
    gameState.currentTurn = (gameState.currentTurn + 1) % 2;
    console.log("GameState im passing: ", gameState.currentTurn);
    console.log(playerIndex !== gameState.currentTurn);
    if (!Object.is(playerIndex, gameState.currentTurn)) {
      socket.broadcast.emit("change-player", gameState.currentTurn);
    } else {
      console.log("i dont know why im printing but here i am");
    }
  });

  socket.on("drop-card", (dropCardObj) => {
    const columnDropped = dropCardObj["idTarget"][1];
    gameState.players.playerIndex.hands[columnDropped].push(
      dropCardObj["userCardDrawn"]
    );
    socket.broadcast.emit("enemy-drop-card", dropCardObj["idTarget"]);
  });

  socket.on("enemy-to-act", () => {
    socket.broadcast.emit("enemy-to-act");
  });
});

// app.use("/api/users", userRoutes);
