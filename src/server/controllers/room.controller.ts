import { EventEmitter } from 'events';

import { RoomState, PRoomState } from 'shared/types/room-state.type';
import { RoomEvent } from 'shared/types/room-event.type';
import { Stateful } from 'shared/helpers/stateful.interface';

import { getRandomTrack } from 'server/services/tracks.service';
import { Commentator } from './commentator.controller';

class RoomEventEmitter {
  private eventEmitter: EventEmitter;
  private socket: SocketIO.Server;
  private roomName: string;
  private attachments: RoomNotifierAttachment[];

  constructor(socket: SocketIO.Server, roomName: string) {
    this.socket = socket;
    this.roomName = roomName;

    this.eventEmitter = new EventEmitter();
    this.attachments = [];
  }

  emit = (name: RoomEvent, ...args: any[]) => {
    this.emitLocal(name, ...args).emitSocket(name, ...args);

    return this;
  };

  emitLocal = (name: RoomEvent, ...args: any[]) => {
    this.eventEmitter.emit(name, ...args);

    return this;
  };

  emitSocket = (name: RoomEvent, ...args: any[]) => {
    this.attachments.forEach((a) => a.emit(name, ...args));

    this.socket.to(this.roomName).emit(name, ...args);
    return this;
  };

  on = (name: RoomEvent, listener: (...args: any[]) => any) => {
    this.eventEmitter.on(name, listener);
    return this;
  };

  addAttachment = (a: RoomNotifierAttachment) => {
    this.attachments.push(a);
  };
}

export class Room implements Stateful<RoomState> {
  state: RoomState;
  notifier: RoomEventEmitter;
  commentator: Commentator;

  countdowner: NodeJS.Timeout | undefined;
  timer: NodeJS.Timeout | undefined;

  constructor(io: SocketIO.Server, givenState?: Partial<PRoomState>) {
    const track = getRandomTrack().text;
    const time = Math.ceil(track.length / 10) * 10;
    const name = Math.random().toString();

    const initialState: RoomState = {
      track,
      time,
      TIME: time,
      name,
      active: false,
      countdown: 15,
      COUNTDOWN: 15,
      progresses: {},
      disconnected: new Set(),
      finished: new Set(),
    };

    this.state = { ...initialState, ...givenState };

    this.notifier = this.initializeRoomNotifier(io);
    this.commentator = new Commentator(io, this.getState);
    this.notifier.addAttachment(this.commentator);

    this.notifier.emit('roomCreated');
  }

  private initializeRoomNotifier = (io: SocketIO.Server) =>
    new RoomEventEmitter(io, this.state.name)
      .on('roomCreated', this.onCreated)
      .on('roomCountdown', this.onCountdown)
      .on('roomStart', this.onStart)
      .on('roomTime', this.onTime)
      .on('roomEnd', this.onEnd)
      .on('playerJoined', this.onPlayerJoined)
      .on('playerLeft', this.onPlayerLeft)
      .on('playerProgress', this.onPlayerProgress);

  private onCreated = () => {
    this.startCountdown();
  };

  private startCountdown = () => {
    console.log('>> Room', this.state.name, 'will start in', this.state.countdown);
    this.countdowner = setInterval(() => {
      this.notifier.emitLocal('roomCountdown', this.state.countdown);
    }, 1000);
  };

  private onCountdown = (countdown: number) => {
    if (countdown > 0) {
      this.notifier.emitSocket('roomCountdown', this.state.countdown);
      this.setState({ countdown: countdown - 1 });
    } else {
      this.notifier.emitLocal('roomStart');
    }
  };

  private onStart = () => {
    console.log('>> Room', this.state.name, 'starting, time:', this.state.time);
    this.countdowner && clearInterval(this.countdowner);

    const { progresses } = this.state;
    Object.keys(progresses).forEach((name) => {
      progresses[name] = 0;
    });

    this.setState({ active: true, progresses });

    this.timer = setInterval(() => {
      this.notifier.emit('roomTime', this.state.time);
    }, 1000);

    this.notifier.emitSocket('roomStart', this.state);
  };

  private onTime = (time: number) => {
    if (time > 0) {
      this.setState({ time: time - 1 });
    } else {
      this.notifier.emitLocal('roomEnd');
    }
  };

  private onEnd = () => {
    console.log('>> Room', this.state.name, 'ended');

    this.timer && clearInterval(this.timer);

    const track = getRandomTrack().text;
    const time = Math.ceil(track.length / 10) * 10;

    this.setState({
      track,
      time,
      TIME: time,
      active: false,
      countdown: 30,
      COUNTDOWN: 30,
    });

    this.notifier.emitSocket('roomEnd', this.state.countdown, this.state.time);

    this.startCountdown();
  };

  private onPlayerJoined = (username: string) => {
    console.log('>>>', username, 'joined room', this.state.name);

    const { disconnected, progresses } = this.state;

    const newDisconnected = new Set(disconnected);
    newDisconnected.delete(username);

    if (progresses[username] === undefined) {
      console.log('>>>', username, 'is a newbie to this one');
      progresses[username] = 0;
    }

    this.setState({
      progresses,
      disconnected: newDisconnected,
    });

    // Delegate event further
    this.notifier.emitSocket('playerJoined', username, this.state.progresses[username]);
  };

  private onPlayerLeft = (username: string, deleteRoom?: () => void) => {
    console.log('>>>', username, 'left');

    const { disconnected, progresses } = this.state;

    const newDisconnected = new Set(disconnected);
    newDisconnected.add(username);

    const shouldStopRoom = Object.keys(progresses).reduce((should, user) => {
      return should && newDisconnected.has(user);
    }, true);

    if (shouldStopRoom) {
      this.stop();
      deleteRoom && deleteRoom();
      return;
    }

    this.setState({
      disconnected: newDisconnected,
    });

    this.checkIfShouldFinishRace();

    this.notifier.emitSocket('playerLeft', username);
  };

  stop = () => {
    console.log('>> Room', this.state.name, 'STOPPED');

    this.countdowner && clearInterval(this.countdowner);
    this.timer && clearInterval(this.timer);
  };

  private onPlayerProgress = (username: string, progress: number) => {
    const { progresses, track } = this.state;

    progresses[username] = progress;

    if (progress === track.length) {
      const finished = new Set(this.state.finished);
      finished.add(username);
      this.setState({ finished });

      this.checkIfShouldFinishRace();
    }

    this.setState({
      progresses,
    });
  };

  checkIfShouldFinishRace = () => {
    const { progresses, finished, disconnected } = this.state;

    const shouldFinish = Object.keys(progresses).reduce((should, name) => {
      return should && (finished.has(name) || disconnected.has(name));
    }, true);

    if (shouldFinish) this.notifier.emitLocal('roomEnd');
  };

  getState = () => this.state;

  setState = (changes: Partial<RoomState>) => {
    this.state = { ...this.state, ...changes };
  };
}

export interface RoomNotifierAttachment {
  emit: (name: RoomEvent, ...args: any[]) => this;
}
