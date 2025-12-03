export class Observable<T, R> {
  public value: T;

  handlers: ((value: T, prev: T | null) => unknown)[];
  root: R;

  public constructor(rootObj: R, value: T, onChangeHandlers: ((value: T, prev: T | null) => unknown)[]) {
    this.root = rootObj;
    this.value = value;
    this.handlers = onChangeHandlers;
  }

  public set(newValue: T): R {
    const prevValue = this.value;
    this.value = newValue;
    this.handlers.forEach(h => h(newValue, prevValue));
    return this.root;
  }

  public triggerChange(): void {
    this.handlers.forEach(h => h(this.value, null));
  }
}

export class LinkedObservable<T, R> extends Observable<T, R> {
  private observable: Observable<T, unknown>;

  public constructor(rootObj: R, observable: Observable<T, unknown>, onChangeHandlers: ((value: T, prev: T | null) => unknown)[]) {
    super(rootObj, observable.value, onChangeHandlers);
    this.observable = observable;

    this.observable.handlers.push((newValue, prevValue) => {
      this.value = newValue;
      onChangeHandlers.forEach(h => h(newValue, prevValue));
    });
  }

  public set(newValue: T): R {
    this.observable.set(newValue);
    return this.root;
  }
}
