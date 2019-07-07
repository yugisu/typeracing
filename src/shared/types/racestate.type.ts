export type RaceState = {
  active: boolean;
  time: number;
  progresses: { [login: string]: number };
  disconnected: Set<string>;
};
