const express = require("express");
const dotenv = require("dotenv");
const port = process.env.PORT || 3000;
let cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const { log } = require("console");
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

socketServer.on("connection", (socket) => {
  // console.log("New WS Connection");
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
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
    connections[playerIndex] = null;

    //Tell everyone what player just disconnected
    socket.broadcast.emit("player-connection", playerIndex);
  });
});

// app.use("/api/users", userRoutes);
