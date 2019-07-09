export interface Stateful<T extends object> {
  state: T | {};
  setState: (changes: Partial<T>) => void;
}
