const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  roomTitle: { type: String, required: true },
  players: { type: Number, required: true },
  status: { type: String, default: "Waiting" }
});

const Room = mongoose.model("Room", RoomSchema);
module.exports = Room;
