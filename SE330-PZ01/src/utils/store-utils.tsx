/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactElement,
} from "react";
import {
  createStore,
  useStore,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from "zustand";
import { shallow, useShallow } from "zustand/shallow";

type StoreCreatorTypes<StoreType> =
  | StateCreator<StoreType, [], any[]>
  | StateCreator<StoreType>;
type ContextProps<StorePropsType> = React.PropsWithChildren<StorePropsType>;
type UseStore<StoreType> = UseBoundStore<StoreApi<StoreType>>;
type LifecycleHandlers<StoreType> = { onInit?: (store: StoreType) => void };

type AnyFuncion = (...args: any[]) => any;
export type State<T> = T extends AnyFuncion ? ReturnType<T> : T;

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

const nestedShallow = <T extends Record<string, any>>(objectA: T, objectB: T) =>
  shallow(Object.keys(objectA), Object.keys(objectB)) &&
  Object.entries(objectA).every(([key, value]) => shallow(value, objectB[key]));

export function createStoreContext<StoreType, StorePropsType>(
  storeCreatorFunction: (
    initProps: StorePropsType,
  ) => StoreCreatorTypes<StoreType>,
): {
  StoreProvider: (
    props: ContextProps<StorePropsType & LifecycleHandlers<StoreType>>,
  ) => ReactElement;
  useStore: UseStore<StoreType>;
  useStoreShallow: UseStore<StoreType>;
  useGetStoreState: () => () => StoreType;
} {
  const StoreContext = createContext<StoreApi<StoreType> | null>(null);

  function StoreProvider({
    children,
    onInit,
    ...props
  }: ContextProps<StorePropsType & LifecycleHandlers<StoreType>>) {
    const prevPropsRef = useRef<StorePropsType>(null);
    const storeRef = useRef<StoreApi<StoreType>>(null);

    if (
      !(
        storeRef.current &&
        prevPropsRef.current &&
        nestedShallow(prevPropsRef.current, props as any)
      )
    ) {
      storeRef.current = createStore<StoreType>()(
        // To use before react 18:
        // const withBatchUpdates = <T,>(config: StoreCreatorTypes<T>) => (set: any, get: any, api: any) => config((args: any) => unstable_batchedUpdates(() => set(args)), get, api)
        // withBatchUpdates(storeCreatorFunction(props as StorePropsType))
        storeCreatorFunction(props as StorePropsType),
      );

      console.debug("Recreated store: ", storeRef.current.getState());
      if (onInit) {
        onInit(storeRef.current.getState());
      }

      prevPropsRef.current = props as StorePropsType;
    }

    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    );
  }

  const useStore_ = (selector: any) => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("StoreContext was not initialized!");
    return useStore(context, selector);
  };

  const useStoreShallow_ = (selector: any) => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("StoreContext was not initialized!");
    return useStore(context, useShallow(selector));
  };

  const useGetStoreState_ = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("StoreContext was not initialized!");
    return useCallback(() => context.getState(), [context]);
  };

  return {
    StoreProvider,
    useStore: useStore_ as UseStore<StoreType>,
    useStoreShallow: useStoreShallow_ as UseStore<StoreType>,
    useGetStoreState: useGetStoreState_,
  };
}

export function createGlobalStore<StoreType>(
  storeCreatorFunction: () => StoreCreatorTypes<StoreType>,
): {
  useStore: UseStore<StoreType>;
  useStoreShallow: UseStore<StoreType>;
  getStoreState: () => StoreType;
} {
  const store = createStore<StoreType>()(storeCreatorFunction());
  console.debug("Recreated store: ", store.getState());

  const useStore_ = (selector: any) => useStore(store, selector);
  const useStoreShallow_ = (selector: any) =>
    useStore(store, useShallow(selector));

  return {
    useStore: useStore_ as UseStore<StoreType>,
    useStoreShallow: useStoreShallow_ as UseStore<StoreType>,
    getStoreState: () => store.getState(),
  };
}
