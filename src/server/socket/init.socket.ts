import jwt from 'jsonwebtoken';

import { User } from 'shared/types/user.type';
import { Room } from 'server/controllers/room.controller';

const rooms: Map<string, Room> = new Map();

const onConnection = (io: SocketIO.Server) => {
  return (socket: SocketIO.Socket) => {
    let username: string;
    let room: Room;

    try {
      if (!(socket.handshake.query && socket.handshake.query.token)) {
        throw 'No token sent!';
      }

      const user = jwt.verify(socket.handshake.query.token, 'secret') as User | string;
      if (typeof user === 'string' || !user.hasOwnProperty('login'))
        throw 'Invalid token';

      username = user.login;
      room = findRoom(io, username);

      socket.join(room.state.name);

      socket.emit('authSuccess', username, room.state);
      room.notifier.emitLocal('playerJoined', username);
    } catch (error) {
      socket.emit('authFail');
      socket.disconnect(true);
      return;
    }

    socket.emit('checkJWT', (token: string) => {
      try {
        const user = jwt.verify(token, 'secret') as User | string;

        if (typeof user === 'string' || !user.hasOwnProperty('login'))
          throw 'Invalid token';

        username = user.login;

        room = findRoom(io, username);
        socket.join(room.state.name);

        room.notifier.emitLocal('playerJoined', username);
        socket.emit('subscribeResponse', username, room.state);
      } catch (error) {
        socket.emit('checkJWTFailed');
        socket.disconnect(true);
      }
    });

    socket.on('playerProgress', (username: string, progress: number) => {
      room.notifier.emit('playerProgress', username, progress);
    });

    socket.on('disconnect', () => {
      room.notifier.emitLocal('playerLeft', username, () =>
        rooms.delete(room.state.name)
      );
    });
  };
};

/**
 * Finds a room in which user taken part earlier or not an active one
 */
function findRoom(io: SocketIO.Server, username: string): Room {
  for (const [_, room] of rooms.entries()) {
    if (room.state.progresses[username] !== undefined || !room.state.active) {
      return room;
    }
  }

  const newRoom = new Room(io);
  rooms.set(newRoom.state.name, newRoom);
  return newRoom;
}

export const initializeSocket = (io: SocketIO.Server) => {
  io.on('connect', onConnection(io));
};
