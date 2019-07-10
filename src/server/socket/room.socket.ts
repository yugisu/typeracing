import { verify } from 'jsonwebtoken';

import { Room } from 'server/controllers/room.controller';
import { User } from 'shared/types/user.type';
import { RoomState } from 'shared/types/room-state.type';

const rooms: Map<string, Room> = new Map();

const findRoom = (username: string) => {
  for (const room of rooms.values()) {
    if (room.state.progresses[username] !== undefined || !room.state.active) {
      return room;
    }
  }

  return null;
};

// Паттерн Проксі ( Proxy )
const proxyHandler: ProxyHandler<Room> = {
  set: () => {
    console.warn("Please, don't try to set property on Room object!");
    return true;
  },
  has: (target, prop) => {
    return ['state', 'commentator', 'notifier', 666].includes(prop as string | number);
  },
};

// Патерн Фабрична функція ( Factory Function )
const createRoom = (io: SocketIO.Server): Room => {
  const room = new Proxy(new Room(io), proxyHandler);
  room.state = {} as RoomState;
  return room;
};

const recordRoom = (roomMap: Map<string, Room>) => (room: Room): Room => {
  roomMap.set(room.state.name, room);
  return room;
};

export const initRoomSocket = (io: SocketIO.Server) => (socket: SocketIO.Socket) => {
  try {
    if (!(socket.handshake.query && socket.handshake.query.token)) {
      throw 'AuthError: No token sent';
    }
    const user = verify(
      socket.handshake.query.token,
      process.env.SECRET_KEY || 'secret'
    ) as User | string;

    if (typeof user === 'string' || !user.hasOwnProperty('login'))
      throw `AuthError: Invalid token: ${user}`;

    const username = user.login;
    const room = findRoom(username) || recordRoom(rooms)(createRoom(io));

    socket.join(room.state.name);

    socket.emit('authSuccess', username, room.state);
    room.notifier.emitLocal('playerJoined', username);

    // Add event listeners if success
    socket.on('playerProgress', (username: string, progress: number) => {
      room.notifier.emit('playerProgress', username, progress);
    });

    socket.on('disconnect', () => {
      room.notifier.emitLocal('playerLeft', username, () =>
        rooms.delete(room.state.name)
      );
    });
  } catch (error) {
    console.error(error);
    socket.emit('authFail');
    socket.disconnect(true);
  }
};
