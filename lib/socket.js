import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("send_review", async (review) => {
    try {
      socket.broadcast.emit(`send_review_${review.property_id}`, review);
    } catch (err) {
      console.error("Error in send_review socket event:", err);
    }
  });

  socket.on("update_review", async (review) => {
    try {
      socket.broadcast.emit(`update_review_${review.property_id}`, review);
    } catch (err) {
      console.error("Error in update_review socket event:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };