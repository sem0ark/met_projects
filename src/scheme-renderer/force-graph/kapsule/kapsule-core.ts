/* eslint-disable @typescript-eslint/no-explicit-any */
// Source (MIT, made by vasturiano, modified by sem0ark to allow automatic type inference and remove debouncing by default to be an external utility)
// https://github.com/vasturiano/kapsule/blob/master/src/index.js


// Core Types

export type KapsuleState = {
  _destructor: () => void;
  _rerender: () => void;
  _initialised: boolean;
} & Record<string, unknown>;

const noop = () => {};

// Prop Handling Types

export type PropConfig<T, TState> = {
  defaultVal: T;
  triggerUpdate?: boolean;
  onChange?: (newVal: T, state: TState, prevVal: T) => void;
};

type PropDefinitionInternal<T, TState> = PropConfig<T, TState> & { name: string };

const getPropDefinition = <T, TState>(args: PropConfig<T, TState> & { name: string }) =>
  ({
    triggerUpdate: true,
    onChange: noop,
    ...args,
  }) as PropDefinitionInternal<T, TState>;

// Type Mapping for Component Instance Inference

// Map Prop definitions to their corresponding Getter/Setter function types
export type KapsulePropMethods<TProps, TMethods, TAliases extends Record<string, keyof (TProps & TMethods)>, TState extends KapsuleState> = {
  [P in keyof TProps]: {
    // Setter signature (takes a value, returns the component instance for chaining)
    (value: TProps[P]): KapsuleComponentInstance<TProps, TMethods, TAliases, TState>; 

    // Getter signature (takes no arguments, returns the property value)
    (): TProps[P];
  } extends infer U ? U : never; // Use 'infer U' pattern to help TS resolve overloads cleanly
};

// Map raw Method definitions to the public component method types
export type KapsuleMethods<TMethods, TState> = {
  [M in keyof TMethods]: TMethods[M] extends (state: TState, ...args: infer A) => infer R
    ? (...args: A) => R
    : never;
};

// Map Aliases by redirecting alias names to their target property names/types
export type KapsuleAliases<TAliases extends Record<string, any>, TCombinedMethods> = {
    [A in keyof TAliases]: TAliases[A] extends keyof TCombinedMethods
        ? TCombinedMethods[TAliases[A]] // Map alias name to the target property's type
        : never;
};

// The final inferred component instance type
export type KapsuleComponentInstance<TProps, TMethods, TAliases extends Record<string, keyof (TProps & TMethods)>, TState extends KapsuleState> = 
  & {
    _state: KapsuleState
    _resetProps: () => KapsuleComponentInstance<TProps, TMethods, TAliases, TState>
  }
  & KapsulePropMethods<TProps, TMethods, TAliases, TState>
  & KapsuleMethods<TMethods, TState>
  & KapsuleAliases<TAliases, KapsulePropMethods<TProps, TMethods, TAliases, TState> & KapsuleMethods<TMethods, TState>>;

export type KapsuleConfig<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any> = Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any>,
    TAliases extends Record<string, keyof (TProps & TMethods)> = Record<string, never>
> = {
  props: { [P in keyof TProps]: Omit<PropDefinitionInternal<TProps[P], KapsuleState & TInitStateOptions>, "name"> };
  methods: TMethods;
  aliases: TAliases;

  stateInit?: (initOptions: TInitOptions) => TInitStateOptions;
  init?: (state: KapsuleState & TInitStateOptions, initOptions: TInitOptions) => void;
  destructor?: (state: KapsuleState & TInitStateOptions) => void;

  update: (state: KapsuleState & TInitStateOptions, changedProps: Map<string, unknown>) => void;
}

export type KapsuleFactory<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any> = Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any>,
    TAliases extends Record<string, keyof (TProps & TMethods)> = Record<string, never>
> = (options: TInitOptions) => KapsuleComponentInstance<TProps, TMethods, TAliases, KapsuleState & TInitStateOptions>

/**
 * The main Kapsule factory function. It takes configuration and returns a component function.
 * This version simplifies to function-mode only (removes `new.target` checks).
 */
export default function Kapsule<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any> = Record<string, (state: KapsuleState & TInitStateOptions, ...args: any) => any>,
    TAliases extends Record<string, keyof (TProps & TMethods)> = Record<string, never>
>(cfg: KapsuleConfig<TInitOptions, TInitStateOptions, TProps, TMethods, TAliases>): KapsuleFactory<TInitOptions, TInitStateOptions, TProps, TMethods, TAliases> {
  const {
    props: rawProps,
    methods,
    aliases,

    stateInit = () => ({}),
    init: initFn = noop,

    update: updateFn,
  } = cfg;

  // Parse props into Prop instances
  const parsedProps: PropDefinitionInternal<unknown, any>[] = Object.entries(rawProps).map(
    ([propName, propConfig]) =>
      getPropDefinition({ name: propName, ...propConfig }) as PropDefinitionInternal<unknown, any>
  );

  return (options: TInitOptions): KapsuleComponentInstance<TProps, TMethods, TAliases, KapsuleState & TInitStateOptions> => {
    // Keeps track of which props triggered an update (mapping propName to previous value)
    const changedProps = new Map<string, unknown>();
    const state: KapsuleState = {
      ...stateInit(options),
      _initialised: false,
      _rerender: noop, // Placeholder
      _destructor: () => {
        cfg.destructor?.(state as any);
      },
    };

    // We use a general type assertion here because we build the concrete type dynamically below
    const comp = {
      _state: state
    } as KapsuleComponentInstance<TProps, TMethods, TAliases, KapsuleState & TInitStateOptions>;

    state._rerender = () => {
      if (!state._initialised) return;
      updateFn(state as any, changedProps);
      changedProps.clear();
    };

    // Make getter/setter methods
    parsedProps.forEach((propDef) => {
      (comp as any)[propDef.name] = (...args: any[]) => {
        const propName = propDef.name;
        const curVal = state[propName];

        if (args.length === 0) return curVal;

        const providedVal = args[0];
        const val = providedVal === undefined ? propDef.defaultVal : providedVal;
        state[propName] = val;

        propDef.onChange?.(val, state, curVal);

        if (!changedProps.has(propName)) {
          changedProps.set(propName, curVal);
        }

        if (propDef.triggerUpdate) state._rerender();
        return comp; // Allow chaining
      };
    });

    // Defined methods
    Object.keys(methods).forEach((methodName) => {
      const methodFn = methods[methodName];
      // Bind the method to component instance and pass state as the first arg
      (comp as any)[methodName] = (...args: any[]) => methodFn(state as any, ...args);
    });

    // Link aliases
    Object.entries(aliases).forEach(([alias, target]) => {
      if (target in comp) {
        (comp as any)[alias] = (comp as any)[target];
      } else {
        throw new Error(
          `Kapsule: Alias target "${String(target)}" not found for alias "${alias}".`
        );
      }
    });

    comp._resetProps = () => {
      // parsedProps.forEach((prop) => (comp as any)[prop.name](prop.defaultVal));
      parsedProps.forEach((prop) => {
        state[prop.name] = prop.defaultVal;
      });
      return comp;
    };

    // Run initialisation sequence
    comp._resetProps(); // Apply prop defaults
    initFn(state as any, options);
    state._initialised = true;
    state._rerender();

    return comp;
  };
}


