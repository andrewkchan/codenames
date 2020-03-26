import React, { Component } from 'react';
import * as actions from "./actions";
import * as Common from "../common";

class Lobby extends Component {
  renderPlayer(player, teamClassName) {
    if (player === null) {
      return (
        <div className={`card agent ${teamClassName}`}>
        </div>
      );
    }
    const { playerId } = this.props;
    return (
      <div className={`card agent ${teamClassName}`} key={player.id}>
        <div className="agent-icon">
          {String.fromCodePoint(player.emoji)}
        </div>
        <div className="agent-name">
          {`${player.name}${playerId === player.id ? " (You)" : ""}`}
        </div>
        <div className="agent-ready">
          {player.ready ? `${String.fromCodePoint(0x2705)} Ready` : "Not ready"}
        </div>
      </div>
    );
  }
  renderTeam(teamStr) {
    const { dispatch } = this.props;
    const teamClassName = teamStr == Common.RED_TEAM ? "red" : "blue"
    const { players } = this.props;
    const team = this.props.teams[teamStr];
    const { spymaster, agents } = team;
    const agentElements = agents.map((agentId) => {
      const player = players[agentId];
      if (player === undefined) {
        console.error("Undefined player", players, agents);
      }
      return this.renderPlayer(player, teamClassName);
    });
    const spymasterPlayer = spymaster !== null && spymaster in players ?
      players[spymaster] : null
    return (
      <div className={`card team-container ${teamClassName}`}>
        <div className="team-roster">
          <div
            className={`team-roster-spymaster ${spymasterPlayer === null ? "empty" : ""}`}
            onClick={(e) => {
              dispatch(actions.requestSetRole(teamStr, Common.ROLE_SPYMASTER));
            }}>
            {this.renderPlayer(spymasterPlayer, teamClassName)}
            <span className="team-roster-spymaster-label">SPYMASTER</span>
          </div>
          <div
            className={`team-roster-agent-list`}
            onClick={(e) => {
              dispatch(actions.requestSetRole(teamStr, Common.ROLE_AGENT));
            }}>
            {agentElements}
          </div>
        </div>
      </div>
    );
  }
  renderSettings() {
    const { host, playerId, players, dispatch } = this.props;
    let hostText;
    let regenerateBoardButton = null;
    if (host === playerId) {
      hostText = "You are the host.";
      regenerateBoardButton = (
        <div
          className="button"
          onClick={(e) => {
            dispatch(actions.requestRegenerateBoard());
          }}>
          Pick a different board
        </div>
      );
    } else {
      const { players } = this.props;
      const hostPlayer = players[host];
      console.log(hostPlayer, players, host);
      hostText = `${String.fromCodePoint(hostPlayer.emoji)} ${hostPlayer.name} is the host.`;
    }

    const player = players[playerId];
    return (
      <div className="settings card">
        <div>
          <p>{hostText}</p>
        </div>
        <div className="settings-controls">
          <div
            className={`button ${player.ready ? "ready-button-active" : "ready-button"}`}
            onClick={(e) => {
              dispatch(actions.requestSetReady(!player.ready));
            }}
            >
            {`${String.fromCodePoint(0x2705)} Ready`}
          </div>
          {regenerateBoardButton}
        </div>
        {this.renderBoardPreview()}
      </div>
    );
  }
  renderBoardPreview() {
    const { gameState, playerId, teams } = this.props;
    // Zero app security, obviously.
    // We assume good faith and no snoopy players that use devtools.
    const isPlayerSpymaster = teams[Common.RED_TEAM].spymaster === playerId ||
      teams[Common.BLUE_TEAM].spymaster === playerId;
    const boardRows = gameState.board.map((row) => {
      const cells = row.map((cell) => {
        let cellClassName = "";
        // if (isPlayerSpymaster) {
        //   if (cell.team !== null) {
        //     cellClassName = cell.team === Common.RED_TEAM ? "red" : "blue";
        //   } else {
        //     cellClassName = cell.isBomb ? "bomb" : "neutral";
        //   }
        // }
        return (
          <div className={`card board-cell ${cellClassName}`}>
            {cell.word}
          </div>
        );
      });

      return (
        <div className="board-row">
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
  render() {
    const { hash } = this.props;

    return (
      <div className="lobby">
        <div className="share card">
          Invite your friends: <span className="share-link">{`spygame.io/#${hash}`}</span>
        </div>
        <div className="lobby-body">
          {this.renderTeam(Common.RED_TEAM)}
          {this.renderSettings()}
          {this.renderTeam(Common.BLUE_TEAM)}
        </div>
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

export default connect(mapStateToProps)(Lobby);