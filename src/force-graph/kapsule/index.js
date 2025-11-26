import { debounce } from '../utils/debounce'

const noop = (..._skip) => {}

class Prop {
  constructor(name, {
    default: defaultVal = null,
    triggerUpdate = true,
    onChange = noop
  }) {
    this.name = name;
    this.defaultVal = defaultVal;
    this.triggerUpdate = triggerUpdate;
    this.onChange = onChange;
  }
}

export default function ({
  stateInit = (() => ({})),
  props: rawProps = {},
  methods = {},
  aliases = {},
  init: initFn = noop,
  update: updateFn = noop
}) {

  // Parse props into Prop instances
  const props = Object.keys(rawProps).map(propName =>
    new Prop(propName, rawProps[propName])
  );

  return function KapsuleComp(...args) {
    const classMode = !!new.target;

    const nodeElement = classMode ? args.shift() : undefined;
    const [options = {}] = args;

    // Holds component state
    let state = Object.assign({},
      stateInit instanceof Function ? stateInit(options) : stateInit, // Support plain objects for backwards compatibility
      { initialised: false }
    );

    // keeps track of which props triggered an update
    let changedProps = {};

    // Component constructor
    function comp(nodeElement) {
      initStatic(nodeElement, options);
      digest();

      return comp;
    }

    const initStatic = function(nodeElement, options) {
      initFn.call(comp, nodeElement, state, options);
      state.initialised = true;
    };

    const digest = debounce(() => {
      if (!state.initialised) { return; }
      updateFn.call(comp, state, changedProps);
      changedProps = {};
    }, 1);

    // Getter/setter methods
    props.forEach(prop => {
      comp[prop.name] = getSetProp(prop);

      function getSetProp({
        name: prop,
        triggerUpdate: redigest = false,
        onChange = noop,
        defaultVal = null
      }) {
        return function(_) {
          const curVal = state[prop];
          if (!arguments.length) { return curVal } // Getter mode

          const val = _ === undefined ? defaultVal : _; // pick default if value passed is undefined
          state[prop] = val;
          onChange.call(comp, val, state, curVal);

          // track changed props
          if (!changedProps.hasOwnProperty(prop)) changedProps[prop] = curVal;

          if (redigest) { digest(); }
          return comp;
        }
      }
    });

    // Other methods
    Object.keys(methods).forEach(methodName => {
      comp[methodName] = (...args) => methods[methodName].call(comp, state, ...args);
    });

    // Link aliases
    Object.entries(aliases).forEach(([alias, target]) => comp[alias] = comp[target]);

    // Reset all component props to their default value
    comp.resetProps = function() {
      props.forEach(prop => {
        comp[prop.name](prop.defaultVal);
      });
      return comp;
    };

    //

    comp.resetProps(); // Apply all prop defaults
    state._rerender = digest; // Expose digest method

    if (classMode && nodeElement) comp(nodeElement);

    return comp;
  }
}
