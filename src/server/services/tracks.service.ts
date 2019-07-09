import { trackRepository } from 'server/repository/tracks.repository';
import { Track } from 'shared/types/track.type';

export const getRandomTrack = (): Track => {
  const tracks = trackRepository.getAll();
  const trackIfFailure: Track = { id: 'random', text: 'A default random track!' };

  return tracks[(Math.random() * tracks.length) | 0] || trackIfFailure;
};
