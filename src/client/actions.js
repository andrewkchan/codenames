export const BOARD_REGENERATE = "BOARD_REGENERATE";
export const GAME_START = "GAME_START";
export const GAME_END = "GAME_END";
export const GAME_EXIT = "GAME_EXIT";
export const GAME_UPDATE = "GAME_UPDATE";
export const HINT_SUBMIT = "HINT_SUBMIT";
export const REQUEST_CHANGE_VOTE = "REQUEST_CHANGE_VOTE";
export const REQUEST_CREATE_ROOM = "REQUEST_CREATE_ROOM";
export const REQUEST_EXIT_GAME = "REQUEST_EXIT_GAME";
export const REQUEST_REGENERATE_BOARD = "REQUEST_REGENERATE_BOARD";
export const REQUEST_SET_READY = "REQUEST_SET_READY";
export const REQUEST_SET_ROLE = "REQUEST_SET_ROLE";
export const REQUEST_SUBMIT_HINT = "REQUEST_SUBMIT_HINT";
export const RESET = "RESET";
export const ROOM_JOINED = "ROOM_JOINED";
export const PLAYER_DISCONNECT = "PLAYER_DISCONNECT";
export const PLAYER_JOIN = "PLAYER_JOIN";
export const PLAYER_SET_READY = "PLAYER_SET_READY";
export const VOTE_CHANGE = "VOTE_CHANGE";

export const boardRegenerate = (board) => {
  return {
    type: BOARD_REGENERATE,
    board
  };
};

export const gameStart = (gameState) => {
  return {
    type: GAME_START,
    gameState
  };
};

export const gameEnd = (gameState) => {
  return {
    type: GAME_END,
    gameState,
  };
};

export const gameExit = (gameState) => {
  return {
    type: GAME_EXIT,
    gameState
  };
};

export const gameUpdate = (gameState) => {
  return {
    type: GAME_UPDATE,
    gameState
  };
};

export const hintSubmit = (word, num) => {
  return {
    type: HINT_SUBMIT,
    word,
    num
  };
};

export const requestChangeVote = (cellIndex) => {
  socket.emit("vote-change", cellIndex);
  return {
    type: REQUEST_CHANGE_VOTE,
    cellIndex
  };
};

export const requestCreateRoom = () => {
  socket.emit("room-create");
  return {
    type: REQUEST_CREATE_ROOM
  };
};

export const requestExitGame = () => {
  socket.emit("game-exit");
  return {
    type: REQUEST_EXIT_GAME
  };
};

export const requestRegenerateBoard = () => {
  socket.emit("board-regenerate");
  return {
    type: REQUEST_REGENERATE_BOARD
  };
};

export const requestSetRole = (team, role) => {
  socket.emit("player-set-role", { team, role});
  return {
    type: REQUEST_SET_ROLE
  };
};

export const requestSetReady = (isReady) => {
  socket.emit("player-set-ready", isReady);
  return {
    type: REQUEST_SET_READY
  };
};

export const requestSubmitHint = (hintWord, hintNum) => {
  socket.emit("hint-submit", {
    word: hintWord,
    num: hintNum
  });
  return {
    type: REQUEST_SUBMIT_HINT,
    word: hintWord,
    num: hintNum
  };
};

export const reset = () => {
  return {
    type: RESET,
  };
};

export const roomJoined = (room, playerId) => {
  return {
    ...room,
    playerId,
    type: ROOM_JOINED,
  };
};

export const playerDisconnect = (teams, players, host) => {
  return {
    type: PLAYER_DISCONNECT,
    teams,
    players,
    host
  };
};

export const playerJoin = (teams, players) => {
  return {
    type: PLAYER_JOIN,
    teams,
    players
  };
};

export const playerSetReady = (playerId, ready) => {
  return {
    type: PLAYER_SET_READY,
    playerId,
    ready
  };
};

export const voteChange = (votes) => {
  return {
    type: VOTE_CHANGE,
    votes
  };
};
