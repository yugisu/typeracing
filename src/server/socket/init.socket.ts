import { initRoomSocket } from './room.socket';

export const initializeSocket = (io: SocketIO.Server) => {
  io.on('connect', initRoomSocket(io));
};
