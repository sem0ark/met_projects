/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createStore,
  useStore,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from "zustand";
import { useShallow } from "zustand/shallow";

type StoreCreatorTypes<StoreType> =
  | StateCreator<StoreType, [], any[]>
  | StateCreator<StoreType>;
type UseStore<StoreType> = UseBoundStore<StoreApi<StoreType>>;

type AnyFunction = (...args: any[]) => any;
export type State<T> = T extends AnyFunction ? ReturnType<T> : T;

export type SetState<T> = (
  partial: (state: State<T>) => void,
  replace?: false,
) => void;
export type GetState<T> = () => State<T>;

export type Store<T> = {
  setState: SetState<T>;
  getState: GetState<T>;
  subscribe: (
    listener: (state: State<T>, prevState: State<T>) => void,
  ) => () => void;
};

export function createGlobalStore<StoreType>(
  storeCreatorFunction: () => StoreCreatorTypes<StoreType>,
): {
  useStore: UseStore<StoreType>;
  useStoreShallow: UseStore<StoreType>;
  getStoreState: () => StoreType;
} {
  const store = createStore<StoreType>()(storeCreatorFunction());

  const useStore_ = (selector: any) => useStore(store, selector);
  const useStoreShallow_ = (selector: any) =>
    useStore(store, useShallow(selector));

  return {
    useStore: useStore_ as UseStore<StoreType>,
    useStoreShallow: useStoreShallow_ as UseStore<StoreType>,
    getStoreState: () => store.getState(),
  };
}
