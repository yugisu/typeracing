import { Track } from 'shared/types/track.type.js';

import tracks from './storage/typetracks.json';

// FIXME: thing's in file structure, buddy

const getAll = (): Track[] => {
  return tracks || [];
};

const getById = (id: string): Track | undefined => {
  return tracks.find((track) => track.id === id);
};

export const trackRepository = {
  getAll,
  getById,
};
