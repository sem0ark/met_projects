import React, { forwardRef } from "react";
import {
  XMarkIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";

export type ActionProps = {
  activeClassName?: string;
  hoverClassName?: string;
  grab?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
} & React.HTMLAttributes<HTMLButtonElement>;

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  (
    { className, activeClassName, hoverClassName, grab, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        {...props}
        className={clsx(
          "relative",
          "btn btn-ghost btn-square btn-sm text-accent",
          "gap-0",
          grab && "cursor-grab",

          "transition-colors duration-300 ease-in-out",
          className,

          hoverClassName ?? "hover:bg-base-200",
          activeClassName ?? "active:bg-base-200 active:text-base-content",
          "focus-visible:ring-offset-base-100 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:outline-none",
        )}
        tabIndex={0}
      >
        {children}
      </button>
    );
  },
);

export const Handle = forwardRef<HTMLButtonElement, ActionProps>(
  (props, ref) => {
    return (
      <Action ref={ref} data-cypress="draggable-handle" grab={true} {...props}>
        <EllipsisVerticalIcon className="absolute left-[2px] size-5" />
        <EllipsisVerticalIcon className="absolute left-[10px] size-5" />
      </Action>
    );
  },
);

export function Remove(props: ActionProps) {
  return (
    <Action hoverClassName="hover:bg-red-100 hover:text-red-600" {...props}>
      <XMarkIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2" />
    </Action>
  );
}

export function AddNew(props: ActionProps) {
  return (
    <Action hoverClassName="hover:bg-info/50 hover:text-info" {...props}>
      <PlusIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2" />
    </Action>
  );
}

export function Edit(props: ActionProps) {
  return (
    <Action hoverClassName="hover:bg-accent hover:text-white" {...props}>
      <PencilSquareIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2" />
    </Action>
  );
}