/* eslint-disable @typescript-eslint/no-explicit-any */
import { debounce } from "../utils/debounce"
import type { KapsuleConfig, KapsuleState } from "./kapsule-core";

export const debounceRendering = <T>(instance: T, delayMs: number): T => {
  const inst = instance as any;
  const rerender = inst._state._rerender;
  inst._state._rerender = debounce(rerender, delayMs);
  return inst;
}

export const asKapsuleConfig = <
  TInitOptions = Record<string, any>,
  TInitStateOptions = Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
  TMethods extends Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any> = Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any>,
  TAliases extends Record<string, keyof (TProps & TMethods)> = Record<string, never>
>(config: KapsuleConfig<TInitOptions, TInitStateOptions, TProps, TMethods, TAliases>) => config
