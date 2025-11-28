import { cooldown, sleep } from "./cooldown.js"
import supabase from "../../supabaseClient.js"

export const startRound = async (game, io, socket) => {
  if (!game.started) return

  console.log("▶️ startRound called | total questions:", game.questions.length, "current:", game.currentQuestion)

  const question = game.questions[game.currentQuestion]

  if (!question) {
    console.error("❌ No question found at index:", game.currentQuestion)
    return
  }

  // ✅ Ensure answers is always an array
  const answers = Array.isArray(question.answers) ? question.answers : []

  io.to(game.room).emit("game:updateQuestion", {
    current: game.currentQuestion + 1,
    total: game.questions.length,
  })

  await supabase.from("game_logs").insert([
    {
      game_id: game.roomId,
      event: "UPDATE_QUESTION",
      payload: { current: game.currentQuestion + 1, total: game.questions.length },
    },
  ])

  io.to(game.room).emit("game:status", {
    name: "SHOW_PREPARED",
    data: {
      totalAnswers: answers.length,
      questionNumber: game.currentQuestion + 1,
    },
  })
  await sleep(2)


  await supabase.from("game_logs").insert([
    {
      game_id: game.roomId,
      event: "SHOW_PREPARED",
      payload: {
        totalAnswers: answers.length,
        questionNumber: game.currentQuestion + 1,
      },
    },
  ])

  // await sleep(2)
  if (!game.started) return

  io.to(game.room).emit("game:status", {
    name: "SHOW_QUESTION",
    data: { question: question.question, answers, cooldown: 3, image: question.image || null, },
  })
  await sleep(5)

  await supabase.from("game_logs").insert([
    {
      game_id: game.roomId,
      event: "SHOW_QUESTION",
      payload: { question: question.question, answers, cooldown: question.time, image: question.image || null, },
    },
  ])

  // await sleep(question.time)
  if (!game.started) return

  game.roundStartTime = Date.now()

  io.to(game.room).emit("game:status", {
    name: "SELECT_ANSWER",
    data: {
      question: question.question,
      answers,
      time: question.time,
      totalPlayer: game.players.length,
      image: question.image || null, // add image
    },
  })

  await supabase.from("game_logs").insert([
    {
      game_id: game.roomId,
      event: "SELECT_ANSWER",
      payload: {
        question: question.question,
        answers,
        time: question.time,
        totalPlayer: game.players.length,
        image: question.image || null, // add image
      },
    },
  ])
  await cooldown(question.time, io, game.room) 

  const answersMap = new Map((game.playersAnswer || []).map(a => [String(a.id), a]));

// PASS 1: update scores
     for (let player of game.players) {
        const pa = answersMap.get(String(player.id));
        const isCorrect = pa ? pa.answer === question.solution : false;
        const gained = isCorrect ? (pa.points || 0) : 0;
        player.points = (Number(player.points) || 0) + gained;
      }

    // PASS 2: compute ranks once and emit SHOW_RESULT for each player
    const sortedPlayers = (game.players || []).slice().sort((a, b) => b.points - a.points);
    const rankMap = new Map();
    sortedPlayers.forEach((p, idx) => rankMap.set(String(p.id), idx + 1));

    for (let player of game.players) {
    const pa = answersMap.get(String(player.id));
    const isCorrect = pa ? pa.answer === question.solution : false;
    const points = isCorrect ? (pa.points || 0) : 0;

    const rank = rankMap.get(String(player.id)) || (sortedPlayers.findIndex(p => String(p.id) === String(player.id)) + 1);
    const aheadPlayer = rank > 1 ? sortedPlayers[rank - 2] : null;

    io.to(player.socket_id).emit("game:status", {
      name: "SHOW_RESULT",
      data: {
        correct: isCorrect,
        message: isCorrect ? "Nice!" : "Bad",
        points,
        myPoints: player.points,
        rank,
        aheadOfMe: aheadPlayer ? aheadPlayer.username : null,
      },
    })

    await supabase.from("game_logs").insert([
      {
        game_id: game.roomId,
        player_id: player.id,
        event: "SHOW_RESULT",
        payload: {
          correct: isCorrect,
          points,
          myPoints: player.points,
          rank,
          aheadOfMe: aheadPlayer ? aheadPlayer.username : null,
        },
      },
    ])

    await supabase
      .from("players")
      .update({ total_points: player.points })
      .eq("id", player.id)
  }

  const totalType = {}
  game.playersAnswer.forEach(({ answer }) => {
    totalType[answer] = (totalType[answer] || 0) + 1
  })

  io.to(game.manager).emit("game:status", {
    name: "SHOW_RESPONSES",
    data: {
      question: question.question,
      responses: totalType,
      correct: question.solution,
      answers,
      image: question.image || null, // add image
    },
  })

  await supabase.from("game_logs").insert([
    {
      game_id: game.roomId,
      event: "SHOW_RESPONSES",
      payload: {
        question: question.question,
        responses: totalType,
        correct: question.solution,
        answers,
        image: question.image || null, // add image
      },
    },
  ])

  game.playersAnswer = []
}
