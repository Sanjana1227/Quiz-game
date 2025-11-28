import { GAME_STATE_INIT } from "../../config.mjs"
import { abortCooldown, cooldown, sleep } from "../utils/cooldown.js"
import deepClone from "../utils/deepClone.js"
import generateRoomId from "../utils/generateRoomId.js"
import { startRound } from "../utils/round.js"
import supabase from "../../supabaseClient.js"
import { v4 as uuidv4 } from "uuid"

const Manager = {
  createRoom: async (game, io, socket, password) => {
    if (game.password !== password) {
      io.to(socket.id).emit("game:errorMessage", "Bad Password")
      return
    }
    
    if (game.manager || game.room) {
      io.to(socket.id).emit("game:errorMessage", "Already manager")
      return
    }

    const roomInvite = generateRoomId()
    const roomUUID = uuidv4()

    game.room = roomInvite
    game.roomId = roomUUID
    game.manager = socket.id
    game.players = []
    game.currentQuestion = 0
    game.playersAnswer = []

    socket.join(roomInvite)
    io.to(socket.id).emit("manager:inviteCode", roomInvite)

    console.log("✅ New room created:", roomInvite, `(UUID: ${roomUUID})`)

    // Insert room into DB
    const { error: roomError } = await supabase.from("rooms").insert([
      {
        id: roomUUID,
        room_code: roomInvite,
        manager_id: null,
        started: false,
      },
    ])

    if (roomError) {
      console.error("❌ Supabase room insert error:", roomError)
      io.to(socket.id).emit("game:errorMessage", "Error creating room in database")
      return
    }

    console.log(`✅ Room inserted into database: ${roomInvite}`)

    // Load questions from DB
    const { data: dbQuestions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .limit(18)

    if (qErr) {
      console.error("❌ Error fetching questions:", qErr)
      return
    }

    const roomQuestionsInsert = dbQuestions.map((q) => ({
      room_id: roomUUID,
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      time_limit: q.time_limit || 15,
      image: q.image || null,
    }))

    const { data: roomQuestions, error: rqErr } = await supabase
      .from("room_questions")
      .insert(roomQuestionsInsert)
      .select()

    if (rqErr) {
      console.error("❌ Supabase room_questions insert error:", rqErr)
      return
    }

    // Normalize questions (answers string → array)
    game.questions = roomQuestions.map((rq) => ({
      id: rq.id, //  this is the room_question_id
      question: rq.question_text,
      answers: rq.options,
      solution: rq.correct_index,
      time: rq.time_limit,
      cooldown: 5,
      image: rq.image,
    }))

    console.log(`✅ Loaded ${game.questions.length} questions from DB`)
    io.to(socket.id).emit("game:dbConfirmation", "Room successfully created")
  },

  startGame: async (game, io, socket) => {
    if (game.started || !game.room) return
    game.started = true

    io.to(game.room).emit("game:status", { name: "SHOW_START", data: { time: 3 } })

    await supabase.from("game_logs").insert([
      { game_id: game.roomId, event: "SHOW_START", payload: { time: 3 } },
    ])

    await sleep(3)
    io.to(game.room).emit("game:startCooldown")
    await cooldown(3, io, game.room)

    startRound(game, io, socket)
  },

  nextQuestion: (game, io, socket) => {
    if (!game.started || socket.id !== game.manager) return
    if (!game.questions[game.currentQuestion + 1]) return

    game.currentQuestion++
    startRound(game, io, socket)
  },

  abortQuiz: async (game, io, socket) => {
    if (!game.started || socket.id !== game.manager) return

    abortCooldown(game, io, game.room)

    const payload = {
      top: game.players.slice().sort((a, b) => b.points - a.points),
      aborted: true,
    }

    io.to(game.room).emit("game:status", { name: "FINISH", data: payload })

    await supabase.from("game_logs").insert([
      { game_id: game.roomId, event: "FINISH", payload },
    ])

    game = deepClone(GAME_STATE_INIT)
  },

  showLeaderboard: (game, io, socket) => {
    if (!game.questions[game.currentQuestion + 1]) {
      socket.emit("game:status", {
        name: "FINISH",
        data: {
          subject: game.subject,
          top: game.players.slice().sort((a, b) => b.points - a.points),
        },
      })
      game = deepClone(GAME_STATE_INIT)
      return
    }

    socket.emit("game:status", {
      name: "SHOW_LEADERBOARD",
      data: {
        leaderboard: game.players
          .sort((a, b) => b.points - a.points)
          .slice(),
      },
    })
  },
}

export default Manager
