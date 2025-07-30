import React, { forwardRef } from "react";
import { XMarkIcon, EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

export type ActionProps = {
  activeClassName?: string;
  hoverClassName?: string;
  grab?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
} & React.HTMLAttributes<HTMLButtonElement>;

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  ({ activeClassName, hoverClassName, grab, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={clsx(
          "relative",
          "btn btn-ghost btn-square btn-sm rounded-btn text-base-content/50",
          "gap-0",
          grab && "cursor-grab",

          hoverClassName ?? "hover:bg-base-200",
          activeClassName ?? "active:bg-base-200 active:text-base-content",
          "focus-visible:shadow-none focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-white",
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
      <Action ref={ref} data-cypress="draggable-handle" {...props}>
        <EllipsisVerticalIcon className="absolute left-[2px] size-5" />
        <EllipsisVerticalIcon className="absolute left-[10px] size-5" />
      </Action>
    );
  },
);

export function Remove(props: ActionProps) {
  return (
    <Action hoverClassName="hover:bg-red-100 hover:text-red-600" {...props}>
      <XMarkIcon className="size-5" />
    </Action>
  );
}
