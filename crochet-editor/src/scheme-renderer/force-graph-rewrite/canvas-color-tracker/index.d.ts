// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class ColorTracker<T = any> {
  constructor(bits?: number);

  register(obj: T): string | null;
  lookup(color: string | [number, number, number]): T | null;
  reset(): void;
}

export default ColorTracker;
