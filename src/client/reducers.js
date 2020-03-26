import * as Common from "../common";
import * as types from "./actions";

const initialGameState = {
  board: null,
  phase: Common.PHASE_BOOT,
  numRemaining: {
    [Common.RED_TEAM]: 8,
    [Common.BLUE_TEAM]: 8
  },
  turn: {
    activeTeam: null,
    hint: null,
    votes: {},
  },
  winner: null,
};

const gameState = (state = initialGameState, action) => {
  switch (action.type) {
    case types.HINT_SUBMIT: {
      if (state.phase !== Common.PHASE_GAME) {
        console.error("Hint submit dispatched out of PHASE_GAME");
      }
      const turn = { ...state.turn };
      turn.hint = {
        word: action.word,
        num: action.num
      };
      return { ...state, turn };
    }
    case types.GAME_START: {
      if (state.phase !== Common.PHASE_LOBBY) {
        console.error("Game start dispatched out of PHASE_LOBBY");
      }
      return action.gameState;
    }
    case types.GAME_END: {
      if (state.phase !== Common.PHASE_GAME) {
        console.error("Game end dispatched out of PHASE_GAME");
      }
      return action.gameState;
    }
    case types.GAME_EXIT: {
      if (state.phase !== Common.PHASE_GAME) {
        console.error("Game exit dispatched out of PHASE_GAME");
      }
      return action.gameState;
    }
    case types.GAME_UPDATE: {
      if (state.phase !== Common.PHASE_GAME) {
        console.error("Game update dispatched out of PHASE_GAME");
      }
      return action.gameState;
    }
    case types.BOARD_REGENERATE: {
      if (state.phase !== Common.PHASE_LOBBY) {
        console.error("Regenerate board dispatched out of PHASE_LOBBY");
      }
      return { ...state, board: action.board };
    }
    case types.ROOM_JOINED: {
      return action.gameState;
    }
    case types.VOTE_CHANGE: {
      if (state.phase !== Common.PHASE_GAME) {
        console.error("Vote change dispatched out of PHASE_GAME");
      }
      return { ...state, turn: { ...state.turn, votes: action.votes } };
    }
    default: {
      return state;
    }
  }
};

const initialPlayersState = {}

const players = (state = initialPlayersState, action) => {
  switch (action.type) {
    case types.GAME_EXIT: {
      const players = { ...state };
      for (let p in players) {
        players[p] = { ...players[p], ready: false };
      }
      return players;
    }
    case types.PLAYER_DISCONNECT: {
      return action.players;
    }
    case types.ROOM_JOINED: {
      return action.players;
    }
    case types.PLAYER_JOIN: {
      return action.players;
    }
    case types.PLAYER_SET_READY: {
      return { ...state, [action.playerId]: { ...state[action.playerId], ready: action.ready } }
    }
    default: {
      return state;
    }
  }
};

const initialTeamState = {
  [Common.RED_TEAM]: {
    str: Common.RED_TEAM,
    spymaster: null,
    agents: [],
  },
  [Common.BLUE_TEAM]: {
    str: Common.BLUE_TEAM,
    spymaster: null,
    agents: [],
  },
};

const teams = (state = initialTeamState, action) => {
  switch (action.type) {
    case types.PLAYER_DISCONNECT: {
      return action.teams;
    }
    case types.ROOM_JOINED: {
      return action.teams;
    }
    case types.PLAYER_JOIN: {
      return action.teams;
    }
    default: {
      return state;
    }
  }
};

const initialState = {
  gameState: initialGameState,
  players: initialPlayersState,
  teams: initialTeamState,
  // top-level state
  hash: null,
  host: null,
  playerId: null,
};
const rootReducer = (state = initialState, action) => {
  let newState = {
    ...state,
    gameState: gameState(state.gameState, action),
    players: players(state.players, action),
    teams: teams(state.teams, action),
  };
  switch (action.type) {
    case types.ROOM_JOINED: {
      return {
        ...newState,
        hash: action.hash,
        host: action.host,
        playerId: action.playerId
      };
    }
    case types.PLAYER_DISCONNECT: {
      return {
        ...newState,
        host: action.host,
      };
    }
    case types.RESET: {
      return initialState;
    }
    default: {
      return newState;
    }
  }
};

export default rootReducer;

