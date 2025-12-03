import { debounce, type DebounceOptions } from "./debounce";

// Source: lodash-es, changed to TS implementation

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFunction = (...args: any[]) => any;

export function throttle(
  func: AnyFunction,
  wait: number,
  options?: DebounceOptions,
) {
  let leading = true,
    trailing = true;

  if (typeof func != "function") {
    throw new TypeError("Expected func to be a function");
  }

  if (options && typeof options === "object") {
    leading = "leading" in options ? !!options.leading : leading;
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }

  return debounce(func, wait, {
    leading: leading,
    maxWait: wait,
    trailing: trailing,
  });
}
