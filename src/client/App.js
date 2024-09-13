import React, { Component } from 'react';
import * as Common from "../common";

import Lobby from "./Lobby";
import Game from "./Game";
import * as actions from "./actions";

class App extends Component {
  state = { isLoadingRoom: false };

  componentDidMount() {
    const { dispatch } = this.props;
    // Setup event handlers
    socket.on("board-regenerate", (data) => {
      dispatch(actions.boardRegenerate(data.board));
    });
    socket.on("disconnect", () => {
      window.location.hash = "";
      dispatch(actions.reset());
    });
    socket.on("game-end", ({ gameState }) => {
      dispatch(actions.gameEnd(gameState));
    });
    socket.on("game-exit", ({ gameState }) => {
      dispatch(actions.gameExit(gameState));
    });
    socket.on("game-start", (data) => {
      dispatch(actions.gameStart(data.gameState));
    });
    socket.on("game-update", ({ gameState }) => {
      dispatch(actions.gameUpdate(gameState));
    });
    socket.on("hint-submit", ({word, num}) => {
      dispatch(actions.hintSubmit(word, num));
    });
    socket.on("room-join", (data) => {
      if (data.success) {
        dispatch(actions.roomJoined(data.room, data.playerId));
      } else {
        console.warn("room-join failed.", data.error);
        this.setState({ isLoadingRoom: false });
        window.location.hash = "";
      }
    });
    socket.on("player-disconnect", ({ teams, players, host }) => {
      dispatch(actions.playerDisconnect(teams, players, host));
    });
    socket.on("player-join", (data) => {
      dispatch(actions.playerJoin(data.teams, data.players));
    });
    socket.on("player-set-ready", (data) => {
      dispatch(actions.playerSetReady(data.playerId, data.ready));
    });
    socket.on("vote-change", ({ votes }) => {
      dispatch(actions.voteChange(votes));
    });
    if (window.location.hash !== "") {
      const { hash } = this.props;
      if (hash !== window.location.hash.slice(1)) {
        socket.emit("room-join", { hash: window.location.hash.slice(1) });
        console.log("mounted hash")
        this.setState({ isLoadingRoom: true });
      }
    }
    window.addEventListener("hashchange", (e) => {
      const { hash } = this.props;
      if (hash !== window.location.hash.slice(1) && hash !== "") {
        socket.emit("room-join", { hash: window.location.hash.slice(1) });
        console.log("hash change", e.oldURL, e.newURL)
        this.setState({ isLoadingRoom: true });
      }
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.hash && this.props.hash !== prevProps.hash) {
      window.location.hash = this.props.hash;
      if (this.state.isLoadingRoom) {
        this.setState({ isLoadingRoom: false });
      }
    }
  }

  onClickCreateRoom(e) {
    this.props.dispatch(actions.requestCreateRoom());
    this.setState({ isLoadingRoom: true });
  }

  renderBody() {
    const { hash, phase } = this.props;
    const { isLoadingRoom } = this.state;
    if (isLoadingRoom) {
      return (
        <div className="card body">
          Loading...
        </div>
      );
    } else if (hash === null) {
      return (
        <div className="card body">
          <p>
            Welcome to Spygame!
          </p>
          <div className="button" onClick={(e) => this.onClickCreateRoom(e)}>
            Create private room
          </div>
        </div>
      );
    } else if (phase === Common.PHASE_LOBBY) {
      return <Lobby />;
    } else {
      return <Game />;
    }
  }

  render() {
    return (
      <div className="container">
        <div className="header">
          <h1>Spygame</h1>
        </div>
        {this.renderBody()}
      </div>
    );
  }
}

import { connect } from "react-redux";

const mapStateToProps = (state) => {
  return {
    hash: state.hash,
    phase: state.gameState.phase,
  };
};

export default connect(mapStateToProps)(App);