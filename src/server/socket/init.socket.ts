import jwt from 'jsonwebtoken';

import { User } from 'shared/types/user.type';
import { RaceState } from 'shared/types/racestate.type';
import { trackRepository } from 'server/repository/tracks.repository';

const races: { [roomName: string]: RaceState } = {
  first: {
    active: false,
    time: 30,
    progresses: {},
    disconnected: new Set(),
  },
};

const onConnection = async () => {
  const track = await trackRepository.getById('1');

  let roomName: string;

  return (socket: SocketIO.Socket) => {
    let userLogin: string;
    let roomCountdown: NodeJS.Timeout;

    socket.emit('checkJWT', (token: string) => {
      try {
        const userFromToken = jwt.verify(token, 'secret') as User;
        userLogin = userFromToken!.login;

        roomName = findRoom(userLogin);

        socket.join(roomName);
        races[roomName].disconnected.delete(userLogin);

        // Set countdown
        if (races[roomName].progresses[userLogin] === undefined) {
          if (Object.keys(races[roomName].progresses).length === 0) {
            roomCountdown = setInterval(() => {
              if (races[roomName].time > 0) {
                socket.in(roomName).emit('roomCountdown', races[roomName].time);
                races[roomName].time = races[roomName].time - 1;
              } else {
                races[roomName].active = true;

                socket.emit('roomStart', races[roomName]);
                clearInterval(roomCountdown);
              }
            }, 500);
          }

          races[roomName].progresses[userLogin] = 0;
        }

        socket.emit(
          'subscribeResponse',
          userLogin,
          track!.text,
          races[roomName],
          roomName
        );

        socket.to(roomName).emit('playerConnected', {
          userLogin,
          progress: races[roomName].progresses[userLogin],
        });
      } catch (error) {
        socket.emit('checkJWTFailed');
      }
    });

    socket.on('disconnect', () => {
      socket.to(roomName).emit('playerDisconnected', userLogin);
      races[roomName].disconnected.add(userLogin);
      let shouldStopRace = true;
      Object.keys(races[roomName].progresses).forEach((user) => {
        shouldStopRace = shouldStopRace && races[roomName].disconnected.has(user);
      });

      if (shouldStopRace) {
        addRoom(roomName);
      }
    });

    socket.on('progressChange', ({ login, progress }) => {
      races[roomName].progresses[login] = progress;

      socket.broadcast.emit('opponentProgress', { login, progress });
    });
  };
};

/**
 * Finds not active room in which given user did not take part earlier
 */
function findRoom(username: string) {
  const freeRoom = Object.entries(races).find(
    ([name, state]) => state.progresses[username] !== undefined || !state.active
  );

  if (!freeRoom) {
    return addRoom();
  } else {
    return freeRoom[0];
  }
}

function addRoom(name?: string) {
  const roomName = name || Math.random().toString();

  races[roomName] = {
    active: false,
    time: 30,
    progresses: {},
    disconnected: new Set(),
  };

  return roomName;
}

export const initializeSocket = async (io: SocketIO.Server) => {
  io.on('connect', await onConnection());
};
