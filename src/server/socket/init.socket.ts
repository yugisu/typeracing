import jwt from 'jsonwebtoken';

import { User } from 'shared/types/user.type';
import { RoomState } from 'shared/types/room-state.type';
import { trackRepository } from 'server/repository/tracks.repository';

const rooms: { [roomName: string]: RoomState } = {};

const onConnection = async () => {
  const track = await trackRepository.getById('1');

  return (socket: SocketIO.Socket) => {
    let roomName: string;
    let room: RoomState;
    let userLogin: string;
    let roomCountdown: NodeJS.Timeout;

    socket.emit('checkJWT', (token: string) => {
      try {
        const userFromToken = jwt.verify(token, 'secret') as User;
        userLogin = userFromToken!.login;

        [roomName, room] = findRoom(userLogin);

        socket.join(roomName);
        room.disconnected.delete(userLogin);

        // Set countdown
        if (room.progresses[userLogin] === undefined) {
          room.progresses[userLogin] = 0;

          if (Object.keys(room.progresses).length === 1) {
            roomCountdown = setInterval(() => {
              if (room.time > 0) {
                socket.in(roomName).emit('roomCountdown', room.time);
                room.time = room.time - 1;
              } else {
                room.active = true;

                socket.emit('roomStart', room);
                clearInterval(roomCountdown);
              }
            }, 500);
          }
        }

        socket.emit('subscribeResponse', userLogin, track!.text, room, roomName);

        socket.to(roomName).emit('playerConnected', {
          userLogin,
          progress: room.progresses[userLogin],
        });
      } catch (error) {
        socket.emit('checkJWTFailed');
      }
    });

    socket.on('disconnect', () => {
      socket.to(roomName).emit('playerDisconnected', userLogin);

      room.disconnected.add(userLogin);

      const shouldStopRace = Object.keys(room.progresses).reduce((should, user) => {
        return should && room.disconnected.has(user);
      }, true);

      if (shouldStopRace) {
        addRoom(roomName);
        clearInterval(roomCountdown);
      }
    });

    socket.on('progressChange', ({ login, progress }) => {
      room.progresses[login] = progress;

      socket.broadcast.emit('opponentProgress', { login, progress });
    });
  };
};

/**
 * Finds not active room in which given user did not take part earlier
 */
function findRoom(username: string): [string, RoomState] {
  const freeRoom = Object.entries(rooms).find(
    ([_, state]) => state.progresses[username] !== undefined || !state.active
  );

  if (!freeRoom) {
    return addRoom();
  } else {
    return freeRoom;
  }
}

function addRoom(name?: string): [string, RoomState] {
  const roomName = name || Math.random().toString();

  rooms[roomName] = {
    active: false,
    time: 30,
    progresses: {},
    disconnected: new Set(),
  };

  return [roomName, rooms[roomName]];
}

export const initializeSocket = async (io: SocketIO.Server) => {
  io.on('connect', await onConnection());
};
