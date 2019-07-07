import { trackRepository } from 'server/repository/tracks.repository';

export const getRandomTrack = async () => {
  const tracks = await trackRepository.getAll();

  return tracks[(Math.random() * tracks.length) | 0];
};
