import convertTimeToPoint from "../utils/convertTimeToPoint.js"
import { abortCooldown } from "../utils/cooldown.js"
import { inviteCodeValidator, usernameValidator } from "../validator.js"
import supabase from "../../supabaseClient.js"

const Player = {
  join: async (game, io, socket, player) => {
    try {
      await usernameValidator.validate(player.username)
    } catch (error) {
      socket.emit("game:errorMessage", error.errors[0])
      return
    }

    if (!game.room || player.room !== game.room) {
      socket.emit("game:errorMessage", "Room not found")
      return
    }

    if (game.players.find((p) => p.username === player.username)) {
      socket.emit("game:errorMessage", "Username already exists")
      return
    }

    if (game.started) {
      socket.emit("game:errorMessage", "Game already started")
      return
    }

    console.log("✅ New Player joining:", player)
    socket.join(player.room)

    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          username: player.username,
          room_id: game.roomId,
          socket_id: socket.id,
          total_points: 0,
        },
      ])
      .select()

    if (error) {
      console.error("❌ Supabase player insert error:", error)
      socket.emit("game:errorMessage", "Error joining the game")
      return
    }

    const dbPlayer = data[0]
    const playerData = {
      id: dbPlayer.id,
      username: player.username,
      room: player.room,
      socket_id: socket.id,
      points: 0,
    }

    socket.to(player.room).emit("manager:newPlayer", { ...playerData })
    game.players.push(playerData)

    console.log("✅ Player inserted into DB:", dbPlayer)
    socket.emit("game:successJoin")
  },

  selectedAnswer: async (game, io, socket, answerIndex) => {
    const player = game.players.find((p) => p.socket_id === socket.id)
    const question = game.questions[game.currentQuestion]

    if (!player || !question) return
    if (game.playersAnswer.find((p) => p.id === player.id)) return

    const rawPoints = convertTimeToPoint(game.roundStartTime, question.time)
    const points = Math.floor(rawPoints)

    game.playersAnswer.push({
      id: player.id,
      answer: answerIndex,
      points,
    })

    // Update the player's total points
// const playerIndex = game.players.findIndex(p => p.id === player.id)
// if (playerIndex !== -1) {
//   game.players[playerIndex].points += points
// }


    console.log("🟢 Answer received:", {
      playerId: player.id,
      username: player.username,
      answer: answerIndex,
      points,
    })

    try {
      const { error } = await supabase.from("answers").insert([
        {
          player_id: player.id,
          room_question_id: question.id,
          selected_index: answerIndex,
          points_awarded: points,
        },
      ])
      if (error) console.error("❌ Supabase answer insert error:", error)
    } catch (err) {
      console.error("❌ Unexpected answer insert error:", err)
    }

    socket.emit("game:status", {
      name: "WAIT",
      data: { text: "Waiting for the players to answer" },
    })
    

    socket.to(game.room).emit("game:playerAnswer", game.playersAnswer.length)

    if (game.playersAnswer.length === game.players.length) {
      console.log("✅ All players answered, aborting cooldown early")
      abortCooldown(game, io, game.room)
    }
  },
}

export default Player
