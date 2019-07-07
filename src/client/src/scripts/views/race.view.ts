import socketIO from 'socket.io-client';

import { View } from './base.view';
import { RaceState } from 'shared/types/racestate.type';

type State = {
  track: string;
  progress: number;
  username: string;
  waiting: boolean;
  countdown: number;
};

export class RaceView extends View {
  private io: SocketIOClient.Socket;
  private state: State = {
    track: '',
    progress: 0,
    username: '',
    waiting: true,
    countdown: 30,
  };

  constructor() {
    super('Race', false);
    this.io = socketIO.connect();

    const token = localStorage.getItem('jwt');
    if (!token) {
      location.replace('/login');
    } else {
      this.io.on('checkJWT', (check: any) => check(token));
      this.io.on('checkJWTFailed', () => {
        localStorage.removeItem('jwt');
        location.replace('/login');
      });

      this.io.on(
        'subscribeResponse',
        (login: string, track: string, raceState: RaceState, roomName: string) => {
          console.log('got track:', track);

          this.setState({
            track: track,
            username: login,
            progress: raceState.progresses[login],
            waiting: !raceState.active,
            countdown: raceState.time,
          });

          document.getElementById('app-title')!.innerText += ` "${roomName}"`;

          this.addContents();
          if (this.state.waiting && raceState.time) {
            this.showCountdown();
          } else {
            this.addInteractivity();
          }
          Object.entries(raceState.progresses).forEach((player) =>
            this.addPlayer(...player)
          );
        }
      );

      this.io.on('roomCountdown', this.onCountdown);
      this.io.on('roomStart', this.onRoomStart);

      this.io.on('playerConnected', ({ userLogin, progress }: any) => {
        this.addPlayer(userLogin, progress);
      });

      this.io.on('playerDisconnected', this.onPlayerDisconnected);

      this.io.on('opponentProgress', ({ login, progress }: any) => {
        this.updatePlayer(login, progress);
      });
    }
  }

  onPlayerDisconnected(name: string) {
    const playerNode = document.getElementById(`player-${name}`);
    playerNode && playerNode.classList.add('player--disconnected');
  }

  onCountdown = (countdown: number) => {
    if (this.state.waiting) {
      this.setState({ countdown });
      document.getElementById('countdown')!.innerText = countdown.toString();
    }
  };

  onRoomStart = (raceState: RaceState) => {
    this.addContents();
    this.addInteractivity();
    Object.entries(raceState.progresses).forEach((player) => this.addPlayer(...player));
  };

  showCountdown() {
    const cd = this.create('h1', {
      id: 'countdown',
      innerText: this.state.countdown.toString(),
    });

    document.getElementById('track')!.replaceWith(cd);
  }

  clearRoot(...nodes: HTMLElement[]) {
    while (this.root.lastChild && this.root.firstChild !== this.root.lastChild) {
      this.root.removeChild(this.root.lastChild);
    }

    this.root.append(...nodes);
  }

  addContents() {
    const { track, progress } = this.state;

    this.clearRoot();

    const content = this.create('div', {
      className: 'columns',
    });

    const trackText = this.create('p', {
      innerHTML: `
      <span class="track__completed">${
        progress ? track.slice(0, progress) : ''
      }</span><span>${track.slice(progress, track.length)}</span>`,
      className: 'track',
      id: 'track',
    });

    const players = this.create('div', {
      className: 'players',
      id: 'players',
    });

    content.append(trackText, players);
    this.root.append(content);
  }

  addInteractivity() {
    window.addEventListener('keypress', (e) => {
      e.preventDefault();

      const { track, progress } = this.state;

      if (e.key === track[progress]) {
        const trackElement = document.getElementById('track') as HTMLSpanElement;

        this.setState({
          progress: progress + 1,
        });

        this.io.emit('progressChange', {
          login: this.state.username,
          progress: this.state.progress,
        });

        trackElement.innerHTML = `
        <span class="track__completed">${
          progress + 1 ? track.slice(0, progress + 1) : ''
        }</span><span>${track.slice(progress + 1, track.length)}</span>`;

        this.updatePlayer(this.state.username, progress + 1);
      }
    });
  }

  addPlayer(name: string, progress = 0) {
    const players = document.getElementById('players');

    const player = this.create('div', {
      className: 'player',
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

  setState = (change: Partial<State>) => {
    this.state = { ...this.state, ...change };
  };
}
