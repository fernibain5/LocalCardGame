const express = require("express");
const dotenv = require("dotenv");
const port = process.env.PORT || 3000;
let cors = require("cors");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");
const app = express();
const httpServer = http.createServer(app);
const createDeck = require("./deck");
const compareHands = require("./poker");
const shortid = require("shortid");
const connectDB = require("./app");
const Room = require("./models/Room");

dotenv.config();

const socketServer = socketIO(httpServer, {
  // cors: {
  //   origin: "*",
  // },
});

connectDB();

// Start server
httpServer.listen(port, () => console.log(`Server running in port ${port}`));

// Set static folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ extended: false }));
// app.use(cors({ origin: true, credentials: true }));

app.get("/game/game.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.js"));
});

app.get("/game/:roomId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

app.get("/api/rooms", (req, res) => {
  Room.find({}, (err, rooms) => {
    if (err) {
      console.error("Error fetching rooms:", err);
      res.status(500).send("Error fetching rooms");
      return;
    }
    res.json(rooms);
  });
});

app.get("/api/rooms/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  Room.findOne({ roomId }, (err, room) => {
    if (err) {
      console.error("Error fetching room:", err);
      res.status(500).send("Error fetching room");
      return;
    }
    res.json(room);
  });
});

app.post("/api/rooms/create", (req, res) => {
  const roomId = shortid.generate(); // Implement this function to generate a unique room ID
  const newRoom = new Room({ roomId, roomTitle: `Room ${roomId}`, players: 1 }); // Set players to 1
  newRoom.save((err, savedRoom) => {
    if (err) {
      console.error("Error creating room:", err);
      res.status(500).send("Error creating room");
      return;
    }
    res.json(savedRoom);
  });
});

// Handle a socket connection request from web client
const gameStates = {};
const connections = {};
const timers = {};
const countdowns = {};

let interval;
let countdown = 20;

socketServer.on("connection", (socket) => {
  // Handle joinRoom
  socket.on("joinRoom", (roomId) => {
    console.log({ roomId });

    if (!countdowns[roomId]) {
      countdowns[roomId] = 20;
    }
    // If the room has no game state, create it
    if (!gameStates[roomId]) {
      gameStates[roomId] = {
        players: [null, null],
        deck: createDeck(),
        countdown: 20,
        currentTurn: 0,
      };
      connections[roomId] = [null, null];
    }

    const gameState = gameStates[roomId];

    // Check if the room is full
    if (connections[roomId].every((conn) => conn !== null)) {
      socket.emit("roomFull");
      return;
    }

    let playerIndex = connections[roomId].indexOf(null);

    // Ignore player 3
    if (playerIndex === -1) return;

    connections[roomId][playerIndex] = false;
    socket.playerIndex = playerIndex;

    // Join the room
    socket.join(roomId);
    socket.roomId = roomId;

    // Add the player to the game state
    gameState.players[playerIndex] = {
      socket: socket,
      hands: [[], [], [], [], []],
      currentPlayer: playerIndex,
    };

    socket.emit("player-number", playerIndex);
    console.log(`Player ${playerIndex} has connected to room ${roomId}`);

    socket.broadcast.to(roomId).emit("player-connection", { playerIndex, connected: true });
    console.log("join room successful");
  });
  // Handle disconnect
  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    const connection = connections[roomId];
    const countdown = countdowns[roomId];
    const timer = timers[roomId];

    const playerIndex = socket.playerIndex;
    console.log(`Player ${playerIndex} disconnected from room ${roomId}`);
    if (gameState) {
      gameState.players[playerIndex] = null;
      gameState.deck = createDeck()
      connection[playerIndex] = null;


      // Check if the room is full
      if (connections[roomId].every((conn) => conn === null)) {
        console.log("Deleting game");
        delete gameState;
        delete connection;
        delete countdown;
        delete timers;
        return;
      }

    }

    // if (gameState.players.every((player) => player === null)) {

    // }

    socket.broadcast.to(roomId).emit("player-connection", playerIndex);
  });

  socket.on("player-ready", () => {
    const roomId = socket.roomId;
    const connection = connections[roomId];
    const playerIndex = socket.playerIndex;
    socket.broadcast.to(roomId).emit("enemy-ready", playerIndex);
    connection[playerIndex] = true;
  });

  // Check players connections
  socket.on("check-players", () => {
    const roomId = socket.roomId;
    const connection = connections[roomId];
    const players = [];
    for (const i in connection) {
      connection[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connection[i] });
    }
    console.log({ players });
    socket.emit("check-players", players);
  });
  // Draw user Initial 5 Cards
  socket.on("draw-5-cards", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    const playerIndex = socket.playerIndex;
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
    socket.broadcast
      .to(roomId)
      .emit("enemy-5-cards", { initialCards, playerIndex });
  });

  socket.on("player-turn", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    socket.emit("player-turn", gameState["currentTurn"]);
  });

  socket.on("draw-card", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    const playerIndex = socket.playerIndex;
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
      socket.broadcast.to(roomId).emit("enemy-draw-card", {
        card,
        deckLength: gameState.deck.length,
      });
    }
  });

  socket.on("change-player", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
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
    socket.emit("change-player", gameState.currentTurn);
    socket.broadcast.to(roomId).emit("change-player", gameState.currentTurn);
  });

  socket.on("drop-card", (dropCardObj) => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    const playerIndex = socket.playerIndex;
    console.log(dropCardObj);
    const columnDropped = dropCardObj["idTarget"][0];
    console.log(columnDropped);
    if (gameState.deck.length >= 2) {
      gameState.players[playerIndex].hands[columnDropped].push(
        dropCardObj["userCardDrawn"]
      );
    } else {
      gameState.players[playerIndex].hands[columnDropped][4] =
        dropCardObj["userCardDrawn"];
    }
    socket.broadcast.to(roomId).emit("enemy-drop-card", {
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
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    if (timers[roomId]) {
      clearInterval(timers[roomId]);
    }

    // Start the countdown timer
    timers[roomId] = setInterval(() => {
      countdowns[roomId]--;
      socket.emit("timer-update", countdowns[roomId]);

      // If the countdown reaches 0, switch to the next player
      if (countdowns[roomId] <= 0 && gameState.deck.length > 1) {
        countdowns[roomId] = 20;
        gameState.currentTurn = (gameState.currentTurn + 1) % 2;
        if (gameState.deck.length > 1) {
          socket.emit("auto-place-card", gameState.deck.length);
        }
        socket.broadcast
          .to(roomId)
          .emit("change-player", gameState.currentTurn);
      }
    }, 10);
  });

  socket.on("stop-timer", () => {
    const roomId = socket.roomId;
    countdowns[roomId] = 20;
    clearInterval(timers[roomId]);
  });
  socket.on("who-wins", () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    const connection = connections[roomId];
    const playerIndex = socket.playerIndex;
    console.log({ players: gameState.players });
    player1Hands = gameState.players[0].hands;
    player2Hands = gameState.players[1].hands;

    const results = [];

    player1Hands.forEach((p1Hand, i) => {
      result = compareHands(p1Hand, player2Hands[i]);
      results.push(result);
    });

    socket.emit("game-over", { player1Hands, player2Hands, results });
    socket.broadcast
      .to(roomId)
      .emit("game-over", { player1Hands, player2Hands, results });

    socket.emit("display-reset-btn");
    socket.broadcast.to(roomId).emit("display-reset-btn");
  });
  socket.on("new-game", () => {
    const roomId = socket.roomId;
    const connection = connections[roomId];
    connection[0] = null;
    connection[1] = null;

    gameState.deck = createDeck();
  });
});

// app.use("/api/users", userRoutes)
