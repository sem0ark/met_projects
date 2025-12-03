/* eslint-disable @typescript-eslint/no-explicit-any */
import { debounce } from "../utils/debounce"
import type { KapsuleComponentInstance, KapsuleConfig, KapsuleState } from "./kapsule-core";

export const debounceRendering = <T>(instance: T, delayMs: number): T => {
  const inst = instance as any;
  const rerender = inst._state._rerender;
  inst._state._rerender = debounce(rerender, delayMs);
  return inst;
}

export const asKapsuleConfig = <
  TInitOptions,
  TInitStateOptions,
  TProps extends Record<string, any> = Record<string, never>,
  TMethods extends Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any> = Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any>,
>(config: KapsuleConfig<TInitOptions, TInitStateOptions, TProps, TMethods>) => config


export type ExtractKapsuleInitOptionsType<T> = T extends KapsuleConfig<infer V, any, any, any> ? V : never;
export type ExtractKapsuleStateType<T> = T extends KapsuleConfig<any, infer S, infer P, any> ? S & P : never;
export type ExtractKapsulePropTypes<T> = T extends KapsuleConfig<any, any, infer V, any> ? V : never;
export type ExtractKapsuleMethodTypes<T> = T extends KapsuleConfig<any, any, any, infer V> ? V : never;

export type ExtractKapsuleInstanceType<T> = T extends KapsuleConfig<
  any,
  infer TInitStateOptions,
  infer TProps,
  infer TMethods
> ? KapsuleComponentInstance<TProps, TMethods, KapsuleState & TInitStateOptions & TProps> : never;
