const express = require("express");
const os = require("os");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);

const fs = require('fs');
const wordList = fs.readFileSync("src/words.txt", 'utf-8').split(" ");

app.use(express.static("dist"));
server.listen(process.env.PORT || 8080, () => console.log(`Listening on port ${process.env.PORT || 8080}!`));

const Common = require("../common");

const rooms = {};
const playerMap = {}; // map of player id to room hash

(function init() {
  io.on("connection", (socket) => {
    console.log(`New player connected ${socket.id}`);
    // Set event handlers here
    socket.on("board-regenerate", () => {
      console.log(`recv: board-regenerate ${socket.id}`);
      const room = rooms[playerMap[socket.id]];
      if (room === undefined) { return; }

      const { gameState, host } = room;
      if (socket.id !== host) { return; }
      if (gameState.phase !== Common.PHASE_LOBBY) { return; }
      gameState.board = createGameBoard();

      console.log("emit: board-regenerate", room.hash);
      io.to(room.hash).emit("board-regenerate", { board: gameState.board });
    });
    socket.on("disconnect", () => {
      console.log(`recv: disconnect ${socket.id}`)
      const room = rooms[playerMap[socket.id]];
      if (room === undefined) { return; }

      const players = room.players;
      const deletedPlayer = players[socket.id];
      delete players[socket.id];
      const playersList = Object.keys(players);
      if (playersList.length > 0) {
        const { gameState, teams } = room;
        // Change hosts if needed
        if (room.host == socket.id) {
          room.host = Object.keys(players)[0];
        }

        const agentIndex = teams[deletedPlayer.team].agents.indexOf(socket.id);
        if (agentIndex !== -1) {
          teams[deletedPlayer.team].agents.splice(agentIndex, 1);

          console.log("emit: player-disconnect", {
            teams: teams,
            players: players,
            host: room.host,
          });
          io.to(room.hash).emit("player-disconnect", {
            teams: teams,
            players: players,
            host: room.host,
          });
          if (gameState.phase === Common.PHASE_GAME) {
            // If there are no more agents on this team, go back to the lobby
            const { turn } = gameState;
            if (teams[deletedPlayer.team].agents.length === 0) {
              gameState.board = createGameBoard();
              gameState.phase = Common.PHASE_LOBBY;
              gameState.numRemaining = {
                [Common.RED_TEAM]: 8,
                [Common.BLUE_TEAM]: 8
              };
              turn.activeTeam = null;
              turn.hint = null;
              turn.votes = {};
              const { players } = room;
              for (let p in players) {
                players[p].ready = false;
              }

              io.to(room.hash).emit("game-exit", {
                gameState: room.gameState
              });
              return;
            }

            if (turn.activeTeam !== deletedPlayer.team) { return; }

            // Delete the player's vote
            for (let cellIndex in turn.votes) {
              const i = turn.votes[cellIndex].indexOf(deletedPlayer.id);
              if (i !== -1) {
                turn.votes[cellIndex].splice(i, 1);
                if (turn.votes[cellIndex].length === 0) {
                  delete turn.votes[cellIndex];
                  break;
                }
              }
            }
            // Check if the voting is now unanimous
            cellIndices = Object.keys(turn.votes);
            if (
              cellIndices.length === 1 &&
              turn.votes[cellIndices[0]] === teams[turn.activeTeam].agents.length
            ) {
              const cellIndex = cellIndices[0];
              const cell = gameState.board[~~(cellIndex/5)][cellIndex % 5];
              // End turn and reveal the cell
              cell.revealed = true;
              turn.votes = {};
              if (cell.team === turn.activeTeam) {
                turn.hint.num -= 1;
                if (turn.hint.num === 0) {
                  // TODO: Allow optional extra guess
                  turn.hint = null;
                  turn.activeTeam = turn.activeTeam === Common.RED_TEAM ?
                    Common.BLUE_TEAM : Common.RED_TEAM;
                }
              } else {
                turn.hint = null;
                turn.activeTeam = turn.activeTeam === Common.RED_TEAM ?
                    Common.BLUE_TEAM : Common.RED_TEAM;
              }

              if (cell.team !== null) {
                gameState.numRemaining[cell.team] -= 1;
                if (gameState.numRemaining[cell.team] === 0) {
                  // Cell's team won
                  turn.hint = null;
                  gameState.winner = cell.team;
                  console.log("emit: game-end", room.hash, {
                    gameState: gameState,
                  });
                  io.to(room.hash).emit("game-end", {
                    gameState: gameState,
                  });
                }
              } else if (cell.isBomb) {
                // Voting team lost, other team won
                turn.hint = null;
                gameState.winner = cell.team;
                console.log("emit: game-end", room.hash, {
                  gameState: gameState,
                });
                io.to(room.hash).emit("game-end", {
                  gameState: gameState,
                });
              }

              io.to(room.hash).emit("game-update", {
                gameState: gameState
              });
            }
          }
        } else {
          teams[deletedPlayer.team].spymaster = null;

          console.log("emit: player-disconnect", {
            teams: teams,
            players: players,
            host: room.host,
          });
          io.to(room.hash).emit("player-disconnect", {
            teams: teams,
            players: players,
            host: room.host,
          });

          if (gameState.phase === Common.PHASE_GAME) {
            // Go back to the lobby.
            gameState.board = createGameBoard();
            gameState.phase = Common.PHASE_LOBBY;
            gameState.numRemaining = {
              [Common.RED_TEAM]: 8,
              [Common.BLUE_TEAM]: 8
            };
            gameState.winner = null;
            const { turn } = gameState;
            turn.activeTeam = null;
            turn.hint = null;
            turn.votes = {};
            const { players } = room;
            for (let p in players) {
              players[p].ready = false;
            }

            io.to(room.hash).emit("game-exit", {
              gameState: room.gameState
            });
          }
        }
      } else {
        delete rooms[room.hash];
      }
      delete playerMap[socket.id];
    });

    socket.on("game-exit", () => {
      console.log("recv: game-exit", socket.id);
      const room = rooms[playerMap[socket.id]];
      if (room === undefined) { return; }

      const { gameState } = room;
      if (gameState.phase !== Common.PHASE_GAME ||
        gameState.winner === null) { return; }

      const { turn } = gameState;
      // Go back to the lobby.
      gameState.board = createGameBoard();
      gameState.phase = Common.PHASE_LOBBY;
      gameState.numRemaining = {
        [Common.RED_TEAM]: 8,
        [Common.BLUE_TEAM]: 8
      };
      gameState.winner = null;
      turn.activeTeam = null;
      turn.hint = null;
      turn.votes = {};
      const { players } = room;
      for (let p in players) {
        players[p].ready = false;
      }
      io.to(room.hash).emit("game-exit", {
        gameState: room.gameState
      });
    });

    socket.on("hint-submit", (data) => {
      console.log(`recv: hint-submit ${socket.id}`, data);
      const room = rooms[playerMap[socket.id]];
      if (room === undefined) { return; }
      if (data.word === undefined || data.num === undefined) { return; }
      // TODO: Check datatypes

      const { gameState, players } = room;
      const { turn } = gameState;
      if (gameState.phase !== Common.PHASE_GAME ||
          gameState.winner !== null) { return; }
      if (players[socket.id].team !== turn.activeTeam) { return; }
      if (players[socket.id].role !== Common.ROLE_SPYMASTER) { return; }
      if (turn.hint !== null) { return; }

      // TODO: Sanitize input
      let word = data.word.replace(/[^a-zA-Z0-9]/g, "");
      let num = Math.min(8, Math.max(0, (data.num|0)));
      turn.hint = {
        word: word,
        num: num
      };
      console.log(`emit: hint-submit ${room.hash}`, {
        word: word,
        num: num
      });
      io.to(room.hash).emit("hint-submit", {
        word: word,
        num: num
      });
    });

    socket.on("room-create", () => {
      // Generate a hash of 5 random alphanumeric chars
      let hash = [...Array(5)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
      while (hash in rooms) {
        hash = [...Array(5)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
      }
      const board = createGameBoard();
      const room = {
        gameState: {
          board: board,
          phase: "LOBBY",
          numRemaining: {
            [Common.RED_TEAM]: 8,
            [Common.BLUE_TEAM]: 8
          },
          turn: {
            activeTeam: null,
            hint: null,
            votes: {}, // map of cell index -> playerId[]
          },
          winner: null,
        },
        hash: hash,
        host: null,
        players: {},
        teams: {
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
        },
      };
      rooms[hash] = room;
      const player = createNewPlayerInRoom(socket.id, room);
      room.host = player.id;

      socket.join(hash);
      socket.emit("room-join", {
        success: true,
        room: room,
        playerId: player.id,
      });
    });

    socket.on("room-join", (data) => {
      const { hash } = data;

      if (hash in rooms) {
        const room = rooms[hash];
        const player = createNewPlayerInRoom(socket.id, room);

        io.to(hash).emit("player-join", {
          teams: room.teams,
          players: room.players,
        });
        socket.join(hash);
        socket.emit("room-join", {
          success: true,
          room: room,
          playerId: player.id,
        });
      } else {
        socket.emit("room-join", {
          success: false,
          error: `Room ${hash} was not found.`
        });
      }
    });

    socket.on("player-set-ready", (isReady) => {
      console.log(`recv: player-set-ready ${socket.id} : isReady=${isReady}`);
      const hash = playerMap[socket.id];
      if (hash === undefined) {
        return;
      }
      const room = rooms[hash];
      if (room.gameState.phase !== Common.PHASE_LOBBY) {
        return;
      }
      const player = room.players[socket.id];
      player.ready = isReady;
      console.log("emit: player-set-ready", room.hash, {
        playerId: player.id,
        ready: player.ready
      })
      io.to(room.hash).emit("player-set-ready", {
        playerId: player.id,
        ready: player.ready
      });
      for (let p in room.players) {
        if (!room.players[p].ready) {
          return;
        }
      }
      // check if game can be started.
      const { teams } = room;
      const blueTeamFull = teams[Common.BLUE_TEAM].agents.length > 0
        && teams[Common.BLUE_TEAM].spymaster !== null;
      const redTeamFull = teams[Common.RED_TEAM].agents.length > 0
        && teams[Common.RED_TEAM].spymaster !== null;
      if (blueTeamFull && redTeamFull) {
        // start the game!
        const { gameState } = room;
        gameState.phase = Common.PHASE_GAME;
        gameState.turn.activeTeam = Common.RED_TEAM;
        console.log("emit: game-start", room.hash);
        io.to(room.hash).emit("game-start", { gameState: gameState });
      }
    });
    socket.on("player-set-role", (data) => {
      console.log(`recv: player-set-role ${socket.id}`, data);
      const hash = playerMap[socket.id];
      if (hash === undefined) { return; }

      const room = rooms[hash];
      if (room.gameState.phase !== Common.PHASE_LOBBY) { return; }
      const { team, role } = data;
      if (team !== Common.RED_TEAM && team !== Common.BLUE_TEAM) { return; }
      if (role !== Common.ROLE_AGENT && role !== Common.ROLE_SPYMASTER) { return; }

      const player = room.players[socket.id];
      const newTeam = room.teams[team];
      const oldTeam = room.teams[player.team];
      if (role === Common.ROLE_SPYMASTER) {
        if (newTeam.spymaster !== null) {
          return;
        }
        if (player.role === Common.ROLE_SPYMASTER) {
          oldTeam.spymaster = null;
        } else {
          oldTeam.agents.splice(oldTeam.agents.indexOf(socket.id), 1);
        }

        newTeam.spymaster = socket.id;
        player.role = role;
        player.team = team;
        player.ready = false;
      } else {
        if (player.role === Common.ROLE_SPYMASTER) {
          oldTeam.spymaster = null;
        } else {
          oldTeam.agents.splice(oldTeam.agents.indexOf(socket.id), 1);
        }

        newTeam.agents.push(socket.id);
        player.role = role;
        player.team = team;
        player.ready = false;
      }
      io.to(room.hash).emit("player-join", {
        teams: room.teams,
        players: room.players
      });
    });
    socket.on("player-set-name", (data) => {
      const { playerId, name } = data;
      const room = rooms[playerMap[playerId]];
      const player = room.players[playerId];
      player.name = name;
      io.to(room.hash).emit("player-set-name", data);
    });

    socket.on("vote-change", (cellIndex) => {
      console.log(`recv: vote-change ${socket.id} cellIndex=${cellIndex}`);
      const room = rooms[playerMap[socket.id]];
      if (room === undefined) { return; }

      const { gameState, players, teams } = room;
      const { turn } = gameState;
      const player = players[socket.id];
      if (gameState.phase !== Common.PHASE_GAME ||
          gameState.winner !== null) { return; }
      if (turn.activeTeam !== player.team) { return; }
      if (turn.hint === null) { return; }
      if (player.role !== Common.ROLE_AGENT) { return; }

      const { board } = gameState;
      if (cellIndex !== (cellIndex|0)) { return; }
      if (cellIndex < 0 || cellIndex >= 25) { return; }
      const cell = board[~~(cellIndex/5)][cellIndex % 5];
      if (cell.revealed) { return; }

      const { votes } = turn;
      for (let otherCellIndex in votes) {
        const i = votes[otherCellIndex].indexOf(player.id);
        if (i !== -1) {
          votes[otherCellIndex].splice(i, 1);
          if (votes[otherCellIndex].length === 0) {
            delete votes[otherCellIndex];
          }
        }
      }
      if (votes[cellIndex] === undefined) {
        votes[cellIndex] = [];
      }
      votes[cellIndex].push(socket.id);
      if (votes[cellIndex].length === teams[turn.activeTeam].agents.length) {
        // If team voted unanimously on this cell, end turn and reveal it.
        cell.revealed = true;
        turn.votes = {};
        if (cell.team === turn.activeTeam) {
          turn.hint.num -= 1;
          if (turn.hint.num === 0) {
            // TODO: Allow optional extra guess
            turn.hint = null;
            turn.activeTeam = turn.activeTeam === Common.RED_TEAM ?
              Common.BLUE_TEAM : Common.RED_TEAM;
          }
        } else {
          turn.hint = null;
          turn.activeTeam = turn.activeTeam === Common.RED_TEAM ?
              Common.BLUE_TEAM : Common.RED_TEAM;
        }

        if (cell.team !== null) {
          gameState.numRemaining[cell.team] -= 1;
          if (gameState.numRemaining[cell.team] === 0) {
            // Cell's team won
            turn.hint = null;
            gameState.winner = cell.team;
            console.log("emit: game-end", room.hash, {
              gameState: gameState,
            });
            io.to(room.hash).emit("game-end", {
              gameState: gameState,
            });
            return;
          }
        } else if (cell.isBomb) {
          // Voting team lost, other team won
          turn.hint = null;
          gameState.winner = turn.activeTeam;
          console.log("emit: game-end", room.hash, {
            gameState: gameState,
          });
          io.to(room.hash).emit("game-end", {
            gameState: gameState,
          });
          return;
        }

        io.to(room.hash).emit("game-update", {
          gameState: gameState
        });
      } else {
        console.log("emit: vote-change", room.hash, {
          votes: votes
        });
        io.to(room.hash).emit("vote-change", { votes: votes });
      }
    });
  });
}());

// Create a new player with the id `socketId` and agent role
// and adds the player to the room object `room`,
// returning the player object.
function createNewPlayerInRoom(socketId, room) {
  const team =
    room.teams[Common.RED_TEAM].agents.length < room.teams[Common.BLUE_TEAM].agents.length ?
    Common.RED_TEAM : Common.BLUE_TEAM;
  const emojiList = Common.EMOJIS[team];
  const player = {
    emoji: emojiList[~~(Math.random()*emojiList.length)],
    id: socketId,
    name: "Anonymous",
    ready: false,
    role: Common.ROLE_AGENT,
    team: team,
  };
  room.players[player.id] = player;
  room.teams[team].agents.push(player.id);
  playerMap[player.id] = room.hash;
  return player;
}

function createGameBoard() {
  let board = [];
  let wordsUsed = new Set();
  let colors = [];
  for (let i = 0; i < 25; i++) {
    if (0 <= i && i < 8) { colors.push(0) }
    else if (8 <= i && i < 16) { colors.push(1) }
    else if (16 <= i && i < 24) { colors.push(2) } // neutral
    else { colors.push(3) } // bomb
  }
  // shuffle colors
  let currentIndex = colors.length;
  let randomIndex;
  while (currentIndex !== 0) {
    // Pick a remaining element
    randomIndex = ~~(Math.random()*currentIndex);
    currentIndex -= 1;
    // Swap it with the current element
    let temp = colors[currentIndex];
    colors[currentIndex] = colors[randomIndex];
    colors[randomIndex] = temp;
  }
  for (let i = 0; i < 5; i++) {
    board.push([]);
    for (let j = 0; j < 5; j++) {
      let idx = ~~(Math.random()*wordList.length);
      while (wordsUsed.has(idx)) {
        idx = ~~(Math.random()*wordList.length);
      }
      const word = wordList[idx];
      wordsUsed.add(word);
      const c = colors[i*5 + j]
      const teamOrNull = c >= 2 ?
        null : [Common.RED_TEAM, Common.BLUE_TEAM][c];
      const cell = {
        isBomb: teamOrNull === 3,
        revealed: false,
        team: teamOrNull,
        word: word,
      };
      board[i].push(cell);
    }
  }
  return board;
}