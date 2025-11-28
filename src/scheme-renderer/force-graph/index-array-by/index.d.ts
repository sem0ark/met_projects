/* eslint-disable @typescript-eslint/no-explicit-any */

/** 
 * A key accessor can be a property name string, or a function that derives a key from an item.
 */
export type KeyAccessor<T> = string | ((listItem: T, index?: number) => string | number);

/** 
 * A reducer function applied to the leaf nodes when `multiItem` is a function.
 */
export type ReducerFn<T, R = any> = (items: T[]) => R;

// Helper type for the structured output when not flat (recursive)
export interface NestedResult<T> {
  [key: string | number]: NestedResult<T> | T | T[];
}

// Helper type for the structured output when flat (array of key/value pairs)
export type FlatResult<T> = {
  keys: (string | number)[];
  // `vals` can be a single item T or an array T[], depending on the multiItem flag
  vals: T | T[]; 
}[];

/**
 * The main `indexBy` function with overloads for precise type inference.
 * The generic T represents the type of the items in the input list.
 */
export default function indexBy<T>(
    list: T[], 
    keyAccessors?: KeyAccessor<T> | KeyAccessor<T>[], 
    multiItem?: boolean, 
    flattenKeys?: boolean
): NestedResult<T> | FlatResult<T>;

// Overload: flattenKeys = true (returns FlatResult)
export default function indexBy<T>(
    list: T[], 
    keyAccessors: KeyAccessor<T> | KeyAccessor<T>[], 
    multiItem: boolean, 
    flattenKeys: true
): FlatResult<T>;

// Overload: multiItem = false (leaf nodes are single items T, not T[])
export default function indexBy<T>(
    list: T[], 
    keyAccessors: KeyAccessor<T> | KeyAccessor<T>[], 
    multiItem: false, 
    flattenKeys?: boolean
): NestedResult<T> | FlatResult<T>;

// Overload: multiItem = ReducerFn (leaf nodes are the result of the reducer R)
export default function indexBy<T, R>(
    list: T[], 
    keyAccessors: KeyAccessor<T> | KeyAccessor<T>[], 
    multiItem: ReducerFn<T, R>, 
    flattenKeys?: boolean
): NestedResult<R> | FlatResult<R>; // Result type changes to R

// Base Declaration (matches the implementation signature)
declare function indexBy<T>(
  list: T[],
  keyAccessors?: KeyAccessor<T> | KeyAccessor<T>[],
  multiItem?: boolean | ReducerFn<T>,
  flattenKeys?: boolean,
): NestedResult<T | any> | FlatResult<T | any>;
