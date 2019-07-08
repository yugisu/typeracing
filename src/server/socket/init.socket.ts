import jwt from 'jsonwebtoken';

import { User } from 'shared/types/user.type';
import { RoomState } from 'shared/types/room-state.type';
import { getRandomTrack } from 'server/services/tracks.service';

const rooms: Map<string, RoomState> = new Map();

const onConnection = async (io: SocketIO.Server) => {
  return (socket: SocketIO.Socket) => {
    let roomName: string;
    let room: RoomState;
    let username: string;
    let roomCountdown: NodeJS.Timeout;

    socket.emit('checkJWT', async (token: string) => {
      try {
        const userFromToken = jwt.verify(token, 'secret') as User;
        username = userFromToken!.login;

        [roomName, room] = await findRoom(username);

        socket.join(roomName);
        room.disconnected.delete(username);

        console.log('>>>', username, 'joined room', roomName);
        if (room.progresses[username] === undefined) {
          room.progresses[username] = 0;

          console.log('>>>', username, 'is a newbie to this one');
        }

        socket.emit('subscribeResponse', username, room.track, room, roomName);

        // Set countdown if room was empty before
        if (Object.keys(room.progresses).length <= 1) {
          console.log('>> Room', roomName, 'will start soon');

          roomCountdown = setInterval(() => {
            if (room.countdown > 0) {
              io.in(roomName).emit('roomCountdown', room.countdown);
              room.countdown = room.countdown - 1;

              console.log('>> Room', roomName, 'countdown:', room.countdown);
            } else {
              room.active = true;

              console.log('>> Room', roomName, 'starting');
              io.in(roomName).emit('roomStart', room);
              clearInterval(roomCountdown);
            }
          }, 500);
        }

        socket.to(roomName).emit('playerConnected', {
          username,
          progress: room.progresses[username],
        });
      } catch (error) {
        socket.emit('checkJWTFailed');
        socket.disconnect(true);
      }
    });

    socket.on('disconnect', () => {
      try {
        console.log('>>>', username, 'disconnected');
        io.to(roomName).emit('playerDisconnected', username);

        room.disconnected.add(username);

        const shouldStopRace = Object.keys(room.progresses).reduce((should, user) => {
          return should && room.disconnected.has(user);
        }, true);

        if (shouldStopRace) {
          console.log('>> Room', roomName, 'STOPPED');
          clearInterval(roomCountdown);
          rooms.delete(roomName);
        }
      } catch (err) {
        socket.disconnect(true);
        console.error(err);
      }
    });

    socket.on('progressChange', ({ username, progress }) => {
      room.progresses[username] = progress;

      socket.broadcast.emit('opponentProgress', { username, progress });
    });
  };
};

/**
 * Finds a room in which user taken part earlier or not an active one
 */
async function findRoom(username: string): Promise<[string, RoomState]> {
  let freeRoom: [string, RoomState] | undefined = undefined;
  for (const [name, state] of rooms.entries()) {
    if (state.progresses[username] !== undefined || !state.active) {
      freeRoom = [name, state];
    }
  }

  if (!freeRoom) {
    return await addRoom();
  } else {
    return freeRoom;
  }
}

async function addRoom(name?: string): Promise<[string, RoomState]> {
  const roomName = name || Math.random().toString();

  const track = (await getRandomTrack())!.text;

  const newRoom: RoomState = {
    active: false,
    countdown: 15,
    track,
    progresses: {},
    disconnected: new Set(),
  };

  rooms.set(roomName, newRoom);
  return [roomName, newRoom];
}

export const initializeSocket = async (io: SocketIO.Server) => {
  io.on('connect', await onConnection(io));
};
