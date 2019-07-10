export type RoomState = {
  active: boolean;
  track: string;
  disconnected: Set<string>;
  finished: Set<string>;
} & PRoomState;

export type PRoomState = {
  name: string;
  countdown: number;
  COUNTDOWN: number;
  time: number;
  TIME: number;
  progresses: { [login: string]: number };
};
