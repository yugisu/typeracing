import fs from 'fs';
import { promisify } from 'util';

import { Track } from 'shared/types/track.type';

const STORAGE_PATH = __dirname + '/storage/typetracks.json';

const readFile = promisify(fs.readFile);

const typetrackCache = new Map<string, Track>();

const getAll = async (): Promise<Track[]> => {
  try {
    const data = await readFile(STORAGE_PATH);
    const tracks = JSON.parse(data.toString()) as Track[];

    tracks.forEach((track) => {
      if (!typetrackCache.has(track.id)) {
        typetrackCache.set(track.id, track);
      }
    });

    return tracks;
  } catch (err) {
    console.error(err);

    return [];
  }
};

const getById = async (id: string): Promise<Track | null> => {
  if (typetrackCache.has(id)) {
    return typetrackCache.get(id) as Track;
  }
  const tracks = await getAll();
  const track = tracks.find((track) => track.id === id);

  return track === undefined ? null : track;
};

export const trackRepository = {
  getAll,
  getById,
};
