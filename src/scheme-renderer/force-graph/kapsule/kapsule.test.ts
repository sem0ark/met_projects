/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from "vitest";
import Kapsule, { asKapsuleConfig, type KapsuleState } from ".";

// --- Test Suite ---

describe("Kapsule Factory Function", () => {
  const simpleCfg = asKapsuleConfig({
    props: {
      count: { default: 0, },
      name: { default: "Anon" },
    },
    methods: {
      getStatus: (state: KapsuleState) =>
        `Count: ${state.count}, Name: ${state.name}`,
    },
    aliases: {
      c: "count",
      getName: "name",
    },

    update: vi.fn(),
    init: vi.fn(),
    stateInit: vi.fn().mockReturnValue({ customState: "initial" }),
  });

  it("should create a component instance with correct initial state and methods", () => {
    const factory = Kapsule(simpleCfg);
    const instance = factory({});

    expect(instance.count()).toBe(0);
    expect(instance.name()).toBe("Anon");
    expect(instance.getStatus()).toBe("Count: 0, Name: Anon");
    expect(simpleCfg.stateInit).toHaveBeenCalledTimes(1);
  });

  it("should allow setting properties and triggering updates", () => {
    const factory = Kapsule(simpleCfg);
    const instance = factory({});
    (simpleCfg.update as any).mockClear();

    // Set 'count' via property method
    instance.count(42);

    // Check getter value and that update was called
    expect(instance.count()).toBe(42);
    expect(simpleCfg.update).toHaveBeenCalledTimes(1);

    // Chain setters
    instance.name("Alice").c(100);
    expect(instance.name()).toBe("Alice");
    expect(instance.count()).toBe(100);
    expect(simpleCfg.update).toHaveBeenCalledTimes(3); // 1 for Alice, 1 for c(100)

    // Check method reflects new state
    expect(instance.getStatus()).toBe("Count: 100, Name: Alice");
  });

  it("should handle aliases correctly", () => {
    const factory = Kapsule(simpleCfg);
    const instance = factory({});

    // Use alias 'c' for 'count'
    expect(instance.c()).toBe(0);
    instance.c(50);
    expect(instance.count()).toBe(50);

    // Use alias 'getName' for 'name'
    (instance as any).getName("Bob"); // TS doesn't infer alias types perfectly internally
    expect(instance.name()).toBe("Bob");
  });

  it("should call lifecycle hooks in the correct order", () => {
    const initFn = vi.fn();
    const updateFn = vi.fn();
    const stateInitFn = vi.fn().mockReturnValue({ foo: "bar" });

    const orderedCfg = {
      props: { value: { defaultVal: 10 } },
      methods: {},
      aliases: {},
      init: initFn,
      update: updateFn,
      stateInit: stateInitFn,
    };

    Kapsule(orderedCfg)({}); // Initialize instance

    // stateInit runs first during initialization setup
    expect(stateInitFn).toHaveBeenCalledBefore(initFn);

    // init runs after state setup, before the first digest
    expect(initFn).toHaveBeenCalledBefore(updateFn);

    // update runs last during initial setup
    expect(updateFn).toHaveBeenCalledTimes(1);

    // _initialised should be true after init sequence
    expect(initFn.mock.calls[0][0]._initialised).toBe(true);
  });

  it("should track changed props correctly in the update cycle", () => {
    const keys: string[] = [];
    const updateFn = vi.fn((_state, changedProps) => {
      keys.push(...changedProps.keys())
    });

    const factory = Kapsule({
      ...simpleCfg,
      update: updateFn,
    });
    const instance = factory({});
    updateFn.mockClear(); // Clear initial update call

    instance.count(99);

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(keys).toEqual(["count"]);
  });

  it("should respect triggerUpdate: false", () => {
    const updateFn = vi.fn();
    const factory = Kapsule({
      props: {
        // This prop will not cause an update automatically
        lazyProp: { default: "initial", triggerUpdate: false },
        eagerProp: { default: 1, triggerUpdate: true },
      },
      methods: {},
      aliases: {},
      update: updateFn,
    });
    const instance = factory({});
    updateFn.mockClear(); // Clear initial update call

    // Setting lazy prop should NOT trigger an update
    instance.lazyProp("new value");
    expect(updateFn).not.toHaveBeenCalled();

    // Setting eager prop SHOULD trigger an update
    instance.eagerProp(2);
    expect(updateFn).toHaveBeenCalledTimes(1);

    // A manual rerender call should digest all changes
    instance._state._rerender();
    expect(updateFn).toHaveBeenCalledTimes(2);
  });

  it("should call onChange handlers correctly", () => {
    const onChangeSpy = vi.fn();
    const factory = Kapsule({
      props: {
        value: {
          default: 10,
          onChange: onChangeSpy,
        },
      },
      methods: {},
      aliases: {},
      update: vi.fn(),
    });
    const instance = factory({});

    instance.value(20);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    // Check arguments: (newVal: T, state: State, prevVal: T)
    expect(onChangeSpy).toHaveBeenCalledWith(20, expect.any(Object), 10);
  });

  it("should reset all props to their default values", () => {
    const factory = Kapsule(simpleCfg);
    const instance = factory({});

    instance.count(500);
    instance.name("Charlie");

    expect(instance.count()).toBe(500);
    expect(instance.name()).toBe("Charlie");

    instance._resetProps();

    expect(instance.count()).toBe(0);
    expect(instance.name()).toBe("Anon");
    // Resetting props also triggers updates for each prop being set
    expect(simpleCfg.update).toHaveBeenCalled();
  });
});
