import { EventEmitter } from 'events';

import { RoomEvent } from 'shared/types/room-event.type';
import { RoomState } from 'shared/types/room-state.type';
import { RoomNotifierAttachment } from './room.controller';

export class Commentator implements RoomNotifierAttachment {
  private eventEmitter: EventEmitter = new EventEmitter();
  private stateFinished: Map<string, number> = new Map();
  private jokeTimer: NodeJS.Timeout | undefined;

  private io: SocketIO.Server;
  private getRoomState: () => RoomState;
  roomName: string;

  constructor(io: SocketIO.Server, stateGetter: () => RoomState) {
    this.io = io;
    this.getRoomState = stateGetter;
    this.roomName = this.getRoomState().name;

    this.initializeEvents();
  }

  initializeEvents = () => {
    this.on('roomCreated', this.onCreated)
      .on('roomCountdown', this.onCountdown)
      .on('roomStart', this.onStart)
      .on('roomTime', this.onTime)
      .on('roomEnd', this.onEnd)
      .on('playerJoined', this.onPlayerJoined)
      .on('playerLeft', this.onPlayerLeft)
      .on('playerProgress', this.onPlayerProgress);
  };

  private onCountdown = (countdown: number) => {
    switch (countdown) {
      case 6:
        this.say(`Racers, prepare your keyboards!`);
        break;
      case 4:
        this.say(`Ready...`);
        break;
      case 2:
        this.say('Steady!..');
        break;
    }
  };

  private onStart = () => {
    this.say('Go!');
  };

  private onTime = (time: number) => {
    const { TIME, progresses, track } = this.getRoomState();
    const isMultiplayer = Object.keys(progresses).length > 1;

    if (time !== TIME && (TIME - time) % 30 === 0) {
      const leaders = Object.entries(progresses).sort((a, b) => b[1] - a[1]);
      const [first, second] = leaders;

      this.say(
        `${TIME - time}s past! ` +
          (isMultiplayer
            ? `1st - <em>${first[0]}</em>: ${first[1]}, ` +
              (second
                ? `2nd - <em>${second[0]}</em>: ${second[1]}, distance: ${first[1] -
                    second[1]}`
                : '')
            : `Distance left: ${track.length - first[1]}`)
      );
    }

    if (time === 2) {
      this.say('The time is running out!...');
    }
  };

  private onPlayerJoined = (username: string) => {
    const { active, progresses, finished } = this.getRoomState();

    if (!active) {
      this.say(`Greetings, everyone! Call me D-Cat`);
    } else {
      if (progresses[username]) {
        if (finished.has(username)) {
          this.say(`Hey, ${username}. Came back to get your medal?`);
        } else {
          this.say(
            `Howdy, <em>${username}</em>. Wait what, your score is ${
              progresses[username]
            }?`
          );
        }
      }
    }
  };

  private onPlayerProgress = (username: string, progress: number) => {
    const { progresses, track, finished, disconnected, time, TIME } = this.getRoomState();
    const isMultiplayer = Object.keys(progresses).length > 1;

    if (progress <= 1) {
      if (isMultiplayer) {
        const startedFirst =
          Object.values(progresses).reduce((started, p) => started + +(p !== 0), 0) === 1;
        if (startedFirst)
          this.say(`<em>${username}</em> starts first! Dude, that's 🔥🔥🔥`);
      } else {
        this.say("What a start! Dude, that's 🔥🔥🔥");
      }
    }

    if (progress === track.length) {
      this.stateFinished.set(username, TIME - time);

      if (
        Object.keys(progresses).length !==
        this.stateFinished.size + disconnected.size
      ) {
        this.say(
          `<em>${username}</em> finished!` +
            (finished.size <= 3
              ? ` That's the ${literals[finished.size + '']} place!`
              : '')
        );
      }
    }

    // За 30 літер до фінішу (якщо траса коротша за 90 літер - за третю частину траси)
    if (track.length - progress === (track.length > 90 ? 30 : (track.length / 3) | 0)) {
      this.say(
        isMultiplayer
          ? `<em>${username}</em> is approaching finish!`
          : "Buddy, you're almost there!"
      );
    }
  };

  private onEnd = () => {
    const { progresses, disconnected } = this.getRoomState();

    const leaderboard = Object.entries(progresses)
      .filter(([name, _]) => !disconnected.has(name))
      .map<[string, number, number | undefined]>(([name, p]) => {
        const time = this.stateFinished.get(name);
        return [name, p, time];
      })
      .sort(([_, p1, time1], [__, p2, time2]) => {
        if (time1 !== undefined || time2 !== undefined) {
          return (time2 || 0) - (time1 || 0);
        }
        return p2 - p1;
      });

    const [first, second, third] = leaderboard;

    const resultsMessage =
      `Results: 🏆1st <em>${first[0]}</em> ${first[2] || ''}` +
      (second
        ? `, 🏅2nd <em>${second[0]}</em> ${second[2] || ''}` +
          (third ? `, 👨‍🚀3rd <em>${third[0]}</em> ${third[2] || ''}!` : '! Great job!')
        : '! Congratulations!');

    this.say(resultsMessage);
  };

  private onCreated = () => {};
  private onPlayerLeft = (username: string) => {};

  onJoke = () => {
    const jokes = [
      'I am weaker than wolf, but it has no dino',
      'TYPEracers written in TYPEscript, haha',
      '<em>Careful!</em> Keyboard is electrified ⚡️',
      'You better keep your speed high! ⏱',
    ];

    this.say(jokes[(Math.random() * jokes.length) | 0]);
  };

  say = (message: string) => {
    this.jokeTimer && clearTimeout(this.jokeTimer);
    this.jokeTimer = setTimeout(this.onJoke, 15000);

    this.io.to(this.roomName).emit('commentatorMessage', message);

    return this;
  };

  on = (name: RoomEvent, listener: (...args: any[]) => void) => {
    this.eventEmitter.on(name, listener);

    return this;
  };

  emit = (messageName: RoomEvent, ...args: any[]) => {
    this.eventEmitter.emit(messageName, ...args);

    return this;
  };
}

const literals: { [k: string]: string } = {
  1: 'first',
  2: 'second',
  3: 'third',
};
