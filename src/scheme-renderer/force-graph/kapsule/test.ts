import Kapsule from "./kapsule-core";
import { debounceRendering } from "./kapsule-utils";

const myComplexComponentFactory = Kapsule({
  props: {
    count: { default: 0 },
    isActive: { default: false },
    label: {
      default: "Default Label",
      onChange: (newVal, state, prevVal) => {
        console.log(`Label changed from "${prevVal}" to "${newVal}"`);
        // You can react to changes here, e.g., update the DOM directly
        state.containerEl.querySelector("#label-display")!.textContent = newVal;
      },
    },
    items: { default: [] },
    config: { default: { theme: "light", size: "small" } },
  },
  methods: {
    increment: (state, amount: number) => {
      // Internal logic updates the state directly
      state.count = (state.count as number) + amount;
      // Manually trigger an update if needed within a method
      state._rerender();
      return state.count as number;
    },
    refresh: (state) => {
      console.log("Manually refreshing component digest cycle.");
      state._rerender();
    },
  },
  aliases: {
    w: "count",
    inc: "increment",
    active: "isActive",
  },
  stateInit: (options: {
    initialCount?: number;
    containerEl: HTMLDivElement;
  }) => ({
    count: options.initialCount ?? 0,
    // We assume containerEl is passed in options, allowing us to use it later in state
    containerEl: options.containerEl,
  }),
  init: (state, options) => {
    console.log(`Component initialized in ${options.containerEl.id}`);
    options.containerEl.innerHTML = `<div id="label-display"></div>`;
  },
  update: (state, changedProps) => {
    console.log(`--- Update Cycle Started ---`);
    console.log(
      "Props changed in this cycle:",
      Array.from(changedProps.keys()).join(", ")
    );
    // This is where you would typically re-render your component visualization
    console.log("Current State Count:", state.count);
  },
});

// --- Usage Example ---

// 1. Prepare a fake DOM element for initialization
const appContainer = document.createElement("div");
appContainer.id = "app-container";
// document.body.appendChild(appContainer); // If running in a browser environment

// 2. Initialize the component instance with options
const componentInstance = myComplexComponentFactory({
  containerEl: appContainer,
  initialCount: 5,
});

// 3. Interact with the component using fully inferred types

console.log("Initial count (getter):", componentInstance.count()); // Output: 5

const debounced = debounceRendering(componentInstance, 100);

// Set a new value (setter mode returns the instance for chaining)
componentInstance
  .count(10) // Updates 'count', triggers update cycle
  .label("New Title"); // Updates 'label', triggers update cycle & onChange handler

// Use a method (alias) to increment the count
const newCount = componentInstance.inc(5); // Output: Manually refreshing component... Output: 20
console.log("Count after increment method:", newCount);

// Use a boolean prop setter via alias
componentInstance.active(true); // Updates 'isActive', triggers update cycle

// Access complex properties safely
componentInstance.config({ ...componentInstance.config(), size: "large" });

// Use built-in reset method
componentInstance._resetProps();
console.log("Count after reset:", componentInstance.count()); // Output: 0
