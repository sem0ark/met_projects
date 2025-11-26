/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  version,
  type ReactElement,
} from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import {
  createStore,
  useStore,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from 'zustand'
import { shallow, useShallow } from 'zustand/shallow'

type StoreCreatorTypes<StoreType> =
  | StateCreator<StoreType, [], any[]>
  | StateCreator<StoreType>
type ContextProps<StorePropsType> = React.PropsWithChildren<StorePropsType>
type UseStore<StoreType> = UseBoundStore<StoreApi<StoreType>>
type LifecycleHandlers<StoreType> = { onInit?: (store: StoreType) => void }

type AnyFunction = (...args: any[]) => any
export type State<T> = T extends AnyFunction ? ReturnType<T> : T

export type SetState<T> = (
  partial: (state: State<T>) => void,
  replace?: false
) => void
export type GetState<T> = () => State<T>

export type Store<T> = {
  setState: SetState<T>
  getState: GetState<T>
  subscribe: (
    listener: (state: State<T>, prevState: State<T>) => void
  ) => () => void
}

export const nestedShallow = <T extends Record<string, any>>(
  objectA: T,
  objectB: T
) =>
  shallow(Object.keys(objectA), Object.keys(objectB)) &&
  Object.entries(objectA).every(([key, value]) => shallow(value, objectB[key]))

// For pre-react 18 compatibility
export const withBatchUpdates = <T,>(config: StoreCreatorTypes<T>) => {
  if (Number.parseInt(version.split('.')[0]) < 18) {
    console.debug(
      `Using unstable_batchedUpdates for pre-react 18 compatibility, detected version ${version}`
    )
    return (set: any, get: any, api: any) =>
      config((args: any) => unstable_batchedUpdates(() => set(args)), get, api)
  }
  return (set: any, get: any, api: any) => config(set, get, api)
}

export type StoreConfig<StoreType, StorePropsType> = {
  storeCreatorFunction: (
    initProps: StorePropsType
  ) => StoreCreatorTypes<StoreType>

  onPropChange?: (
    prevProps: StorePropsType,
    newProps: StorePropsType,
    storeApi: StoreApi<StoreType>
  ) => 'reinit' | 'ignore' | void

  propComparison?: (
    prevProps: StorePropsType,
    newProps: StorePropsType
  ) => boolean
}

export function _getStoreInitializationResult<
  StoreType,
  StorePropsType extends object,
>(
  currentStore: StoreApi<StoreType> | null,
  prevProps: StorePropsType | null,
  newProps: StorePropsType,
  config: Pick<
    StoreConfig<StoreType, StorePropsType>,
    'onPropChange' | 'propComparison'
  >
): { shouldReinitialize: boolean; nextPrevProps: StorePropsType } {
  const { onPropChange, propComparison = nestedShallow } = config

  if (!currentStore) return {
    shouldReinitialize: true,
    nextPrevProps: newProps,
  }

  if (!propComparison(prevProps!, newProps)) return {
    shouldReinitialize: !onPropChange || onPropChange(prevProps!, newProps, currentStore) === 'reinit',
    nextPrevProps: newProps,
  }

  return {
    shouldReinitialize: false,
    nextPrevProps: newProps,
  }
}

export function createStoreContext<StoreType, StorePropsType extends object>(
  config: StoreConfig<StoreType, StorePropsType>
): {
  StoreProvider: (
    props: ContextProps<StorePropsType & LifecycleHandlers<StoreType>>
  ) => ReactElement
  useStore: UseStore<StoreType>
  useStoreShallow: UseStore<StoreType>
  useGetStoreState: () => () => StoreType
} {
  const { storeCreatorFunction, onPropChange, propComparison } = config
  const StoreContext = createContext<StoreApi<StoreType> | null>(null)

  function StoreProvider({
    children,
    onInit,
    ...props
  }: ContextProps<StorePropsType & LifecycleHandlers<StoreType>>) {
    const prevPropsRef = useRef<StorePropsType>(null)
    const storeRef = useRef<StoreApi<StoreType> | null>(null)
    const newProps = props as StorePropsType

    const initializationResult = useMemo(() => {
      return _getStoreInitializationResult<StoreType, StorePropsType>(
        storeRef.current,
        prevPropsRef.current,
        newProps,
        { onPropChange, propComparison }
      )
    }, [newProps])

    const { shouldReinitialize, nextPrevProps } = initializationResult
    prevPropsRef.current = nextPrevProps

    if (shouldReinitialize) {
      storeRef.current = createStore<StoreType>()(
        withBatchUpdates(storeCreatorFunction(newProps))
      )

      console.debug('Recreated store: ', storeRef.current.getState())
      if (onInit) {
        onInit(storeRef.current.getState())
      }
    }

    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    )
  }

  const useStore_ = (selector: any) => {
    const context = useContext(StoreContext)
    if (!context) throw new Error('StoreContext was not initialized!')
    return useStore(context, selector)
  }

  const useStoreShallow_ = (selector: any) => {
    const context = useContext(StoreContext)
    if (!context) throw new Error('StoreContext was not initialized!')
    return useStore(context, useShallow(selector))
  }

  const useGetStoreState_ = () => {
    const context = useContext(StoreContext)
    if (!context) throw new Error('StoreContext was not initialized!')
    return useCallback(() => context.getState(), [context])
  }

  return {
    StoreProvider,
    useStore: useStore_ as UseStore<StoreType>,
    useStoreShallow: useStoreShallow_ as UseStore<StoreType>,
    useGetStoreState: useGetStoreState_,
  }
}

export function createGlobalStore<StoreType>(
  storeCreatorFunction: () => StoreCreatorTypes<StoreType>
): {
  useStore: UseStore<StoreType>
  useStoreShallow: UseStore<StoreType>
  getStoreState: () => StoreType
} {
  const store = createStore<StoreType>()(storeCreatorFunction())

  const useStore_ = (selector: any) => useStore(store, selector)
  const useStoreShallow_ = (selector: any) =>
    useStore(store, useShallow(selector))

  return {
    useStore: useStore_ as UseStore<StoreType>,
    useStoreShallow: useStoreShallow_ as UseStore<StoreType>,
    getStoreState: () => store.getState(),
  }
}