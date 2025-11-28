export const WEBSOCKET_PUBLIC_URL = "http://localhost:5505/"
export const WEBSOCKET_SERVER_PORT = 5505

const QUIZZ_CONFIG = {
  password: "PASSWORD",
  subject: "Adobe",

}

// DONT CHANGE
export const GAME_STATE_INIT = {
  started: false,
  players: [],
  playersAnswer: [],
  manager: null,
  room: null,
  currentQuestion: 0,
  roundStartTime: 0,
  ...QUIZZ_CONFIG,
}
