import socketIO from 'socket.io-client';

import { StatefulView } from './base.view';
import { RoomState } from 'shared/types/room-state.type';
import { RoomEvent } from 'shared/types/room-event.type';

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

  private io!: SocketIOClient.Socket;

  constructor() {
    super(undefined, false);

    const token = localStorage.getItem('jwt');
    if (!token) {
      location.replace('/login');
      return;
    }

    this.io = socketIO.connect({ query: { token } });

    this.io
      .on('authFail', this.onAuthFail)
      .on('authSuccess', this.onAuthSuccess)

      .on('roomCountdown', this.onCountdown)
      .on('roomStart', this.onRoomStart)
      .on('roomTime', this.onRoomTime)
      .on('roomEnd', this.onRoomEnd)

      .on('playerJoined', this.onPlayerJoined)
      .on('playerLeft', this.onPlayerLeft)
      .on('playerProgress', this.onPlayerProgress);
  }

  onAuthFail = () => {
    localStorage.removeItem('jwt');
    location.replace('/login');
  };

  onAuthSuccess = (username: string, roomState: RoomState) => {
    const { track, progresses, active, countdown } = roomState;

    this.setState({
      track,
      username: username,
      progress: progresses[username],
      waiting: !active,
      countdown,
    });

    this.addContents();
    this.modifyTopBar(roomState);
    this.showPlayers(progresses);
    if (this.state.waiting && this.state.countdown) {
      this.showCountdown();
    } else {
      this.showTrack();
    }
  };

  onPlayerJoined = (username: string, progress: number) => {
    this.addPlayer(username, progress);

    const playerAmount = document.getElementById('player-amount__value');
    if (username !== this.state.username) {
      playerAmount!.innerText = +playerAmount!.innerText + 1 + '';
    }
  };

  onPlayerLeft = (name: string) => {
    const playerNode = document.getElementById(`player-${name}`);
    playerNode && playerNode.classList.add('player--disconnected');

    const playerAmount = document.getElementById('player-amount__value');
    playerAmount!.innerText = +playerAmount!.innerText - 1 + '';
  };

  onCountdown = (countdown: number) => {
    this.setState({ countdown });
    document.getElementById('countdown')!.innerText = countdown.toString();
  };

  onRoomStart = ({ track, progresses, active }: RoomState) => {
    this.setState({
      track,
      progress: progresses[this.state.username],
      waiting: !active,
    });

    Object.entries(progresses).forEach(([name, progress]) => {
      this.updatePlayer(name, progress, false);
    });
    this.showTrack();
  };

  onRoomTime = (time: number) => {
    document.getElementById('room-time__value')!.innerText = time.toString();
  };

  onRoomEnd = (countdown: number, time: number) => {
    this.setState({
      countdown,
      waiting: true,
    });

    this.onRoomTime(time);
    this.showCountdown();
  };

  onPlayerProgress = (username: string, progress: number) => {
    if (username !== this.state.username) {
      this.updatePlayer(username, progress);
    }
  };

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

  removeInteractivity() {
    window.removeEventListener('keypress', this.onTrackKeystroke);
  }

  onTrackKeystroke = (e: KeyboardEvent) => {
    e.preventDefault();

    const { track, username } = this.state;
    let { progress } = this.state;

    if (e.key === track[progress]) {
      progress += 1;

      const trackElement = document.getElementById('track');

      this.io.emit('playerProgress', username, progress);

      trackElement!.innerHTML = `
      <span class="track__completed">${
        progress ? track.slice(0, progress) : ''
      }</span><span>${track.slice(progress, track.length)}</span>`;

      this.updatePlayer(username, progress);

      this.setState({
        progress,
      });
    }
  };

  showCountdown() {
    this.removeInteractivity();

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

  showPlayers(progresses: { [player: string]: number }) {
    const players = document.getElementById('players');
    players!.childNodes.forEach((child) => players!.removeChild(child));

    Object.entries(progresses).forEach((player) => this.addPlayer(...player));
  }

  modifyTopBar({ time, progresses, name }: RoomState) {
    const topBar = document.getElementById('top-bar');
    topBar!.childNodes.forEach((child) => topBar!.removeChild(child));

    const createBarElem = (name: string, value: string, id?: string) => {
      const barElem = this.create('div', {
        className: 'top-bar__elem',
        innerHTML: `
          <h5 ${id ? `id="${id + '__name'}"` : ''} class="top-bar__elem__name">
            ${name}</h5>
          <h2 ${id ? `id="${id + '__value'}"` : ''} class="top-bar__elem__value">
            ${value}</h2>`,
      });
      if (id) barElem.id = id;
      return barElem;
    };

    const roomNameElem = createBarElem('Room', name);

    const timeLeftElem = createBarElem('Time', time.toString(), 'room-time');

    let playerAmount = Object.keys(progresses).length.toString();
    const playerAmountElem = createBarElem('Players', playerAmount, 'player-amount');

    topBar!.append(roomNameElem, timeLeftElem, playerAmountElem);
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

  updatePlayer(username: string, progress: number, hard = true) {
    const playerNode = document.getElementById(`player-${username}`);
    hard && playerNode!.classList.remove('player--disconnected');
    playerNode!.querySelector('progress')!.value = progress;
  }
}
