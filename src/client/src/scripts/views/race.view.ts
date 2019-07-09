import socketIO from 'socket.io-client';

import { StatefulView } from './base.view';
import { RoomState } from 'shared/types/room-state.type';

type State = {
  track: string;
  progress: number;
  username: string;
  waiting: boolean;
  countdown: number;
};

export class RaceView extends StatefulView<State> {
  state: State = {
    track: '',
    progress: 0,
    username: '',
    waiting: true,
    countdown: 30,
  };

  private io: SocketIOClient.Socket;

  constructor() {
    super('🏎️ Race', false);
    this.io = socketIO.connect();

    const token = localStorage.getItem('jwt');
    if (!token) {
      location.replace('/login');
      return;
    }

    this.io.on('checkJWT', (check: (t: string) => void) => check(token));
    this.io.on('checkJWTFailed', () => {
      localStorage.removeItem('jwt');
      location.replace('/login');
      return;
    });

    this.io.on('subscribeResponse', this.onSubscribeResponse);

    this.io.on('roomCountdown', this.onCountdown);
    this.io.on('roomStart', this.onRoomStart);

    this.io.on('playerConnected', this.onPlayerConnected);

    this.io.on('playerDisconnected', this.onPlayerDisconnected);

    this.io.on('opponentProgress', this.onOpponentProgress);
  }

  onSubscribeResponse = (
    username: string,
    track: string,
    roomState: RoomState,
    roomName: string
  ) => {
    this.setState({
      track: track,
      username: username,
      progress: roomState.progresses[username],
      waiting: !roomState.active,
      countdown: roomState.countdown,
    });

    document.getElementById('app-title')!.innerText = `🏎️ Race "${roomName}"`;

    this.clearRoot();
    this.addContents();
    if (this.state.waiting && this.state.countdown) {
      this.showCountdown();
    } else {
      this.showTrack();
    }
    Object.entries(roomState.progresses).forEach((player) => this.addPlayer(...player));
  };

  onPlayerConnected = ({ username, progress }: Player) =>
    this.addPlayer(username, progress);

  onPlayerDisconnected = (name: string) => {
    const playerNode = document.getElementById(`player-${name}`);
    playerNode && playerNode.classList.add('player--disconnected');
  };

  onCountdown = (countdown: number) => {
    this.setState({ countdown });
    document.getElementById('countdown')!.innerText = countdown.toString();
  };

  onRoomStart = () => {
    this.showTrack();
  };

  onOpponentProgress = ({ username, progress }: Player) =>
    this.updatePlayer(username, progress);

  onTrackKeystroke = (e: KeyboardEvent) => {
    e.preventDefault();

    const { track, progress } = this.state;

    if (e.key === track[progress]) {
      const trackElement = document.getElementById('track');

      this.setState({
        progress: progress + 1,
      });

      this.io.emit('progressChange', {
        username: this.state.username,
        progress: this.state.progress,
      });

      trackElement!.innerHTML = `
      <span class="track__completed">${
        this.state.progress ? track.slice(0, this.state.progress) : ''
      }</span><span>${track.slice(this.state.progress, track.length)}</span>`;

      this.updatePlayer(this.state.username, this.state.progress);
    }
  };

  showCountdown() {
    const cd = this.create('h1', {
      className: 'countdown',
      id: 'countdown',
      innerText: this.state.countdown.toString(),
    });

    const placeholder = document.getElementById('placeholder');
    placeholder!.hasChildNodes()
      ? placeholder!.replaceChild(cd, placeholder!.firstChild!)
      : placeholder!.append(cd);
  }

  showTrack() {
    const { track, progress } = this.state;

    const trackText = this.create('p', {
      innerHTML: `
      <span class="track__completed">${
        progress ? track.slice(0, progress) : ''
      }</span><span>${track.slice(progress, track.length)}</span>`,
      className: 'track',
      id: 'track',
    });

    const placeholder = document.getElementById('placeholder');

    placeholder!.hasChildNodes()
      ? placeholder!.replaceChild(trackText, placeholder!.firstChild!)
      : placeholder!.append(trackText);

    this.addInteractivity();
  }

  clearRoot(...nodes: HTMLElement[]) {
    while (this.root.lastChild && this.root.firstChild !== this.root.lastChild) {
      this.root.removeChild(this.root.lastChild);
    }

    this.root.append(...nodes);
  }

  addContents() {
    const content = this.create('div', {
      className: 'columns',
    });

    const placeholderContent = this.create('div', {
      className: 'placeholder',
      id: 'placeholder',
    });

    const players = this.create('div', {
      className: 'players',
      id: 'players',
    });

    content.append(placeholderContent, players);
    this.root.append(content);
  }

  addInteractivity() {
    window.addEventListener('keypress', this.onTrackKeystroke);
  }

  addPlayer(name: string, progress = 0) {
    const players = document.getElementById('players');

    const player = this.create('div', {
      className: `player${name === this.state.username ? ' player--self' : ''}`,
      id: `player-${name}`,
      innerHTML: `
        <h3 class="player__name">${name}</h3>
        <progress class="player__progress" value="${progress}" max="${
        this.state.track.length
      }" />
      `,
    });

    const oldPlayerNode = document.getElementById(`player-${name}`);

    if (oldPlayerNode) {
      oldPlayerNode.replaceWith(player);
    } else {
      players!.append(player);
    }
  }

  updatePlayer(name: string, progress: number) {
    const playerNode = document.getElementById(`player-${name}`);
    playerNode!.classList.remove('player--disconnected');
    playerNode!.querySelector('progress')!.value = progress;
  }
}

type Player = {
  username: string;
  progress: number;
};
