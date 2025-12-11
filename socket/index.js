import { Server } from "socket.io"
import { GAME_STATE_INIT, WEBSOCKET_SERVER_PORT } from "../config.mjs"
import Manager from "./roles/manager.js"
import Player from "./roles/player.js"
import { abortCooldown } from "./utils/cooldown.js"
import deepClone from "./utils/deepClone.js"
import supabase from "../supabaseClient.js"
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
  pingInterval: 25000,         // server sends ping every 25s
  pingTimeout: 60000,          // wait 60s for pong before disconnecting
  maxHttpBufferSize: 1e8
});


let gameState = deepClone(GAME_STATE_INIT)

const PORT = process.env.PORT || WEBSOCKET_SERVER_PORT;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server listening on port ${PORT}`);
});

io.on("connection", (socket) => {
  console.log(`A user connected ${socket.id}`)

  socket.on("player:checkRoom", (roomId) =>
    Player.checkRoom(gameState, io, socket, roomId)
  )

  socket.on("player:join", (player) =>
    Player.join(gameState, io, socket, player)
  )

  socket.on("manager:createRoom", (password) =>
    Manager.createRoom(gameState, io, socket, password)
  )

  socket.on("manager:kickPlayer", (playerId) =>
    Manager.kickPlayer(gameState, io, socket, playerId)
  )

  socket.on("manager:startGame", () =>
    Manager.startGame(gameState, io, socket)
  )

  socket.on("player:selectedAnswer", (answerKey) =>
    Player.selectedAnswer(gameState, io, socket, answerKey)
  )

  socket.on("manager:abortQuiz", () =>
    Manager.abortQuiz(gameState, io, socket)
  )

  socket.on("manager:nextQuestion", () =>
    Manager.nextQuestion(gameState, io, socket)
  )

  socket.on("manager:showLeaderboard", () =>
    Manager.showLeaderboard(gameState, io, socket)
  )

  socket.on("disconnect", async (reason) => {
    console.log(`User disconnected: ${socket.id} — reason:`, reason);

    // If manager disconnects, reset the room
    if (gameState.manager === socket.id && gameState.roomId) {
      console.log("Manager disconnected → Resetting room")
      io.to(gameState.room).emit("game:reset")

      // Delete all players and answers for this room
      await supabase.from("answers").delete().eq("room_question_id", gameState.roomId)
      await supabase.from("players").delete().eq("room_id", gameState.roomId)
      await supabase.from("room_questions").delete().eq("room_id", gameState.roomId)
      await supabase.from("rooms").delete().eq("id", gameState.roomId)

      gameState = deepClone(GAME_STATE_INIT)
      abortCooldown()
      return
    }

    // If a player disconnects
    const player = gameState.players.find((p) => p.socket_id === socket.id)
    if (player) {
      // Remove from in-memory
      gameState.players = gameState.players.filter((p) => p.socket_id !== socket.id)

      // Notify manager
      socket.to(gameState.manager).emit("manager:removePlayer", player.id)

      // Update DB: mark player as disconnected
      await supabase
        .from("players")
        .update({ disconnected: true })
        .eq("id", player.id)
    }
  })
})
