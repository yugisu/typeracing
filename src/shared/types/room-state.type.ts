export type RoomState = {
  active: boolean;
  track: string;
  disconnected: Set<string>;
} & PRoomState;

export type PRoomState = {
  name: string;
  countdown: number;
  time: number;
  progresses: { [login: string]: number };
};
