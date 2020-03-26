import React, { Component } from 'react';
import * as actions from "./actions";
import * as Common from "../common";

class Game extends Component {
  state = { hintValue: "", hintNum: 1 };
  renderChatPanel() {
    return (
      <div className="card chatpanel">
        <div className="chatpanel-messages">
        </div>
        <div className="card chatpanel-input-container">
          <input className="chatpanel-input" type="text" />
          <div className="chatpanel-input-submit">
            {String.fromCodePoint(0x2192)}
          </div>
        </div>
      </div>
    );
  }
  renderStatusPanel() {
    return (
      <div className="statuspanel">
        {this.renderTeamStatus(Common.RED_TEAM)}
        {this.renderTeamStatus(Common.BLUE_TEAM)}
      </div>
    );
  }
  renderTeamStatus(teamStr) {
    const { playerId, players, teams, gameState } = this.props;
    const { board, turn } = gameState;
    const team = teams[teamStr];
    const agentList = team.agents;
    const teamClassName = teamStr === Common.RED_TEAM ? "red" : "blue";

    const statusList = agentList.map((agentId) => {
      const player = players[agentId];
      let voteStatus = null;
      for (let cellIndex in turn.votes) {
        if (turn.votes[cellIndex].indexOf(player.id) !== -1) {
          const cell = board[~~(cellIndex/5)][cellIndex % 5];
          voteStatus = (
            <span className="agentstatus-vote">
              {cell.word}
            </span>
          );
          break;
        }
      }
      return (
        <div className="agentstatus">
          <span className="agentstatus-emoji">{String.fromCodePoint(player.emoji)}</span>
          <em className={`agentstatus-name-${teamClassName}`}>
            {player.name}{player.id === playerId ? "(You)" : ""}
          </em>
          {voteStatus}
        </div>
      );
    });
    return (
      <div className="teamstatus">
        {statusList}
      </div>
    );
  }
  renderHintPanel() {
    const { dispatch, playerId, players, teams, gameState } = this.props;
    if (gameState.winner !== null) {
      const hintClassName = gameState.winner === Common.RED_TEAM ? "red" : "blue";
      return (
        <div className={`card hint ${hintClassName}`}>
          <span className="hint-winner">{`${hintClassName} team wins!`}</span>
          <div
            className="hint-winner-lobby button"
            onClick={(e) => {
              dispatch(actions.requestExitGame());
            }}>
            Return to lobby
          </div>
        </div>
      );
    }
    const { turn } = gameState;
    const hintClassName = turn.activeTeam === Common.RED_TEAM ? "red" : "blue";
    if (turn.hint !== null) {
      return (
        <div className={`card hint ${hintClassName}`}>
          <span className="hint-label">HINT:</span>
          <span className="hint-word">{turn.hint.word}</span> for <span className="hint-num">{turn.hint.num}</span>
        </div>
      );
    }
    const player = players[playerId];
    if (player.role === Common.ROLE_SPYMASTER) {
      return (
        <div className={`card hint ${hintClassName}`}>
          <span className="hint-label">HINT:</span>
          <input
            type="text"
            className="hint-word"
            value={this.state.hintValue}
            onChange={(e) => {
              let newHint = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
              newHint = newHint.toLowerCase();
              this.setState({ hintValue: newHint });
            }}
            /> for
          <input
            type="number"
            className="hint-num"
            value={this.state.hintNum}
            onChange={(e) => {
              // TODO: When optional votes is implemented change this to min 0
              let hintNum = Math.max(1, (e.target.value|0));
              hintNum = Math.min(hintNum, gameState.numRemaining[turn.activeTeam]);
              this.setState({ hintNum: hintNum });
            }}
            />
          <div
            className="hint-submit button"
            onClick={(e) => {
              dispatch(
                actions.requestSubmitHint(this.state.hintValue, this.state.hintNum)
              );
            }}
            >Submit</div>
        </div>
      );
    }
    const spymasterPlayer = players[teams[turn.activeTeam].spymaster];
    return (
      <div className={`card hint ${hintClassName}`}>
        <p className="hint-placeholder">
          <em>{spymasterPlayer.name}</em> is thinking of a good hint...
        </p>
      </div>
    );
  }
  renderBoardPreview() {
    const { dispatch, gameState, playerId, teams } = this.props;
    const { turn } = gameState;
    const isGameEnded = gameState.winner !== null;
    // Zero app security, obviously.
    // We assume good faith and no snoopy players that use devtools.
    const isPlayerSpymaster = teams[Common.RED_TEAM].spymaster === playerId ||
      teams[Common.BLUE_TEAM].spymaster === playerId;
    const boardRows = gameState.board.map((row, i) => {
      const cells = row.map((cell, j) => {
        let cellClassName = "";
        if (isPlayerSpymaster || cell.revealed || isGameEnded) {
          if (cell.team !== null) {
            cellClassName = cell.team === Common.RED_TEAM ? "red" : "blue";
          } else {
            cellClassName = cell.isBomb ? "bomb" : "neutral";
          }
        }
        if (cell.revealed) {
          cellClassName += "-revealed";
        }
        let votesMarker = null;
        const cellIndex = i*5 + j;
        if (cellIndex in turn.votes) {
          votesMarker = (
            <div className="board-cell-votes">
              {turn.votes[cellIndex].length}
            </div>
          );
        }
        return (
          <div
            className={`card board-cell ${cellClassName}`}
            key={cellIndex}
            onClick={(e) => {
              if (
                cell.revealed || isPlayerSpymaster ||
                turn.hint === null || isGameEnded) {
                return;
              }
              dispatch(actions.requestChangeVote(cellIndex));
            }}
            >
            {cell.word}
            {votesMarker}
          </div>
        );
      });

      return (
        <div className="board-row" key={i}>
          {cells}
        </div>
      );
    });

    return (
      <div className="board">
        {boardRows}
      </div>
    );
  }
  renderInstructions() {
    const { playerId, players, gameState } = this.props;
    const { turn } = gameState;
    const player = players[playerId];
    if (turn.activeTeam !== player.team) {
      const teamName = turn.activeTeam === Common.RED_TEAM ? "Red" : "Blue";
      return (
        <div className="instructions">
          <p>
            {teamName}'s turn...
          </p>
        </div>
      );
    } else if (player.role === Common.ROLE_AGENT) {
      return (
        <div className="instructions">
          <p className="instructions-header">
            You are an agent {String.fromCodePoint(0x1F575)}
          </p>
          <p>
            {
              turn.hint === null ?
              "Your spymaster is thinking of a good hint." : "Tap a word to vote for it."
            }
          </p>
        </div>
      );
    } else {
      return (
        <div className="instructions">
          <p className="instructions-header">
            You are the spymaster {String.fromCodePoint(0x1F9E0)}
          </p>
          <p>
            {
              turn.hint === null ?
              "Enter a one-word hint at the top." : "Your agents are voting."
            }
          </p>
        </div>
      );
    }
  }
  render() {
    const { hash } = this.props;

    return (
      <div className="game">
        <div className="share card">
          Invite your friends: <span className="share-link">{`spygame.io/#${hash}`}</span>
        </div>
        {this.renderHintPanel()}
        <div className="game-body">
          {this.renderStatusPanel()}
          {this.renderBoardPreview()}
          {this.renderChatPanel()}
        </div>
        {this.renderInstructions()}
      </div>
    );
  }
}

import { connect } from "react-redux";

const mapStateToProps = (state) => {
  return {
    gameState: state.gameState,
    hash: state.hash,
    host: state.host,
    playerId: state.playerId,
    players: state.players,
    teams: state.teams,
  };
};

export default connect(mapStateToProps)(Game);