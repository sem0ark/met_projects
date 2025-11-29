/* eslint-disable @typescript-eslint/no-explicit-any */
// Source (MIT, made by vasturiano, modified by sem0ark to allow automatic type inference and remove debouncing by default to be an external utility)
// https://github.com/vasturiano/kapsule/blob/master/src/index.js


// Core Types

export type KapsuleState = {
  _destructor: () => void;
  _rerender: () => void;
  _initialised: boolean;
};

const noop = () => {};

// Prop Handling Types

export type PropConfig<T, TState> = {
  default: T;
  triggerUpdate?: boolean;
  onChange?: (newVal: T, state: TState, prevVal: T) => void;
};

export type PropDefinition<T, TState> = PropConfig<T, TState> & { name: string };

const getPropDefinition = <T, TState>(args: PropConfig<T, TState> & { name: string }) =>
  ({
    triggerUpdate: true,
    onChange: noop,
    ...args,
  }) as PropDefinition<T, TState>;

// Type Mapping for Component Instance Inference

// Map Prop definitions to their corresponding Getter/Setter function types
export type KapsulePropMethods<TProps, TMethods, TState extends KapsuleState> = {
  [P in keyof TProps]: {
    // Setter signature (takes a value, returns the component instance for chaining)
    (value: TProps[P]): KapsuleComponentInstance<TProps, TMethods, TState>; 

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

// The final inferred component instance type
export type KapsuleComponentInstance<TProps, TMethods, TState extends KapsuleState> = 
  & {
    _state: KapsuleState
    _resetProps: () => KapsuleComponentInstance<TProps, TMethods, TState>
  }
  & KapsulePropMethods<TProps, TMethods, TState>
  & KapsuleMethods<TMethods, TState>;

export type ConfigMethod<TInitStateOptions> = (state: KapsuleState & TInitStateOptions, ...args: any) => any

export type KapsuleConfig<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, ConfigMethod<TInitStateOptions>> = Record<string, ConfigMethod<TInitStateOptions>>,
> = {
  props: { [P in keyof TProps]: Omit<PropDefinition<TProps[P], KapsuleState & TInitStateOptions & TProps>, "name"> };
  methods: { [M in keyof TMethods]: ConfigMethod<TInitStateOptions & TProps> };

  stateInit?: (initOptions: TInitOptions) => TInitStateOptions;
  init?: (state: KapsuleState & TInitStateOptions, initOptions: TInitOptions) => void;
  destructor?: (state: KapsuleState & TInitStateOptions & TProps) => void;

  update: (state: KapsuleState & TInitStateOptions & TProps, changedProps: Map<string, unknown>) => void;
}

export type KapsuleFactory<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, ConfigMethod<TInitStateOptions>> = Record<string, ConfigMethod<TInitStateOptions>>,
> = (options: TInitOptions) => KapsuleComponentInstance<TProps, TMethods, KapsuleState & TInitStateOptions & TProps>

/**
 * The main Kapsule factory function. It takes configuration and returns a component function.
 * This version simplifies to function-mode only (removes `new.target` checks).
 */
export default function Kapsule<
    TInitOptions = Record<string, any>,
    TInitStateOptions = Record<string, any>,
    TProps extends Record<string, any> = Record<string, never>,
    TMethods extends Record<string, ConfigMethod<TInitStateOptions>> = Record<string, ConfigMethod<TInitStateOptions>>,
>(cfg: KapsuleConfig<TInitOptions, TInitStateOptions, TProps, TMethods>): KapsuleFactory<TInitOptions, TInitStateOptions, TProps, TMethods> {
  const {
    props: rawProps,
    methods,

    stateInit = () => ({}),
    init: initFn = noop,

    update: updateFn,
  } = cfg;

  // Parse props into Prop instances
  const parsedProps: PropDefinition<unknown, any>[] = Object.entries(rawProps).map(
    ([propName, propConfig]) =>
      getPropDefinition({ name: propName, ...propConfig }) as PropDefinition<unknown, any>
  );

  return (options: TInitOptions): KapsuleComponentInstance<TProps, TMethods, KapsuleState & TInitStateOptions & TProps> => {
    // Keeps track of which props triggered an update (mapping propName to previous value)
    const changedProps = new Map<string, unknown>();
    const state = {
      ...stateInit(options),
      _initialised: false,
      _rerender: noop, // Placeholder
      _destructor: () => {
        cfg.destructor?.(state as any);
      },
    } as KapsuleState & TInitStateOptions;

    // We use a general type assertion here because we build the concrete type dynamically below
    const comp = {
      _state: state,
      _resetProps: () => comp, // placeholder
    } as KapsuleComponentInstance<TProps, TMethods, KapsuleState & TInitStateOptions & TProps>;

    state._rerender = () => {
      if (!state._initialised) return;
      updateFn(state as any, changedProps);
      changedProps.clear();
    };

    // Make getter/setter methods
    parsedProps.forEach((propDef) => {
      (comp as any)[propDef.name] = (...args: any[]) => {
        const propName = propDef.name;
        const curVal = (state as any)[propName];

        if (args.length === 0) return curVal;

        const providedVal = args[0];
        const val = providedVal === undefined ? propDef.default : providedVal;
        (state as any)[propName] = val;

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

    comp._resetProps = () => {
      parsedProps.forEach((prop) => {
        (state as any)[prop.name] = prop.default;
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


