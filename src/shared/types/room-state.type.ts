export type RoomState = {
  active: boolean;
  countdown: number;
  track: string;
  progresses: { [login: string]: number };
  disconnected: Set<string>;
};
