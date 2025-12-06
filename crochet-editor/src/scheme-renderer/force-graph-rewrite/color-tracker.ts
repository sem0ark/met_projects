/* eslint-disable @typescript-eslint/no-explicit-any */
const ENTROPY = 123; // Raise numbers to prevent collisions in lower indexes

const int2HexColor = (num: number): string => `#${Math.min(num, Math.pow(2, 24)).toString(16).padStart(6, "0")}`;
const rgb2Int = (r: number, g: number, b: number): number => (r << 16) + (g << 8) + b;

const colorStr2Int = (str: string): number => {
  str = str.startsWith("#") ? str.substring(1) : str;
  return Number.parseInt(str, 16);
};

const checksum = (n: number, csBits: number): number => (n * ENTROPY) % Math.pow(2, csBits);

export class ColorTracker<T = any> {
  // Internal state
  private registry: (T | null)[]; // indexed objects for rgb lookup;
  private readonly csBits: number; // How many bits to reserve for checksum.
  // Will eat away into the usable size of the registry.

  private readonly registrySize;
  private readonly checksumMask;

  constructor(csBits: number = 6) {
    this.csBits = csBits;
    this.registrySize = 1 << (24 - this.csBits);
    this.checksumMask = (1 << this.csBits) - 1;

    this.registry = ["__reserved for background__" as any];
  }

  reset(): void {
    this.registry = ["__reserved for background__" as any];
  }

  register(obj: T): string | null {
    if (this.registry.length >= this.registrySize) {
      // color has 24 bits (-checksum)
      return null; // Registry is full
    }

    const idx = this.registry.length;
    const cs = checksum(idx, this.csBits);

    const color = int2HexColor(idx + (cs << (24 - this.csBits)));

    this.registry.push(obj);
    return color;
  }

  getIndex(color: string | [number, number, number]): number | null {
    if (!color) return null; // invalid color

    let n: number;
    if (typeof color === "string") {
      n = colorStr2Int(color);
    } else {
      n = rgb2Int(color[0], color[1], color[2]);
    }

    if (!n) return null; // 0 index is reserved for background

    const maxRegistryIndex = this.registrySize - 1;
    const idx = n & maxRegistryIndex; // registry index
    const cs = (n >> (24 - this.csBits)) & (this.checksumMask); // extract bits reserved for checksum

    if (checksum(idx, this.csBits) !== cs || idx >= this.registry.length)
      return null; // failed checksum or registry out of bounds

    // We know that if idx is valid, it points to an object of type T
    // because the first element is a string and all subsequent elements are T.
    return idx;
  }

  lookup(color: string | [number, number, number]): T | null {
    const index = this.getIndex(color);
    if (!index) return null;

    return this.registry[index] as T;
  }

  remove(color: string | [number, number, number]): void {
    const index = this.getIndex(color);
    if (!index) return;

    this.registry[index] = null;
  }
}
