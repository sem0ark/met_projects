import React, { forwardRef } from "react";
import clsx from "clsx";

import { Remove, Handle, type ActionProps } from "./ActionButton"; // Assuming ActionButton.tsx is updated

export interface ContainerProps {
  children: React.ReactNode;
  label?: string;
  horizontal?: boolean; // For horizontal scrolling list of items
  handleProps?: ActionProps;
  scrollable?: boolean; // If the item list within should be scrollable
  placeholder?: boolean; // If it's an empty placeholder container (e.g., "Add new list")
  unstyled?: boolean; // If it should have no default styling
  onClick?(): void;
  onRemove?(): void;
  style?: React.CSSProperties;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      label,
      horizontal,
      handleProps,
      scrollable,
      placeholder,
      unstyled,
      onClick,
      onRemove,
      ...props
    }: ContainerProps,
    ref,
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        className={clsx(
          "box-border flex appearance-none flex-col outline-none",
          "rounded-box m-[10px] min-h-[200px] min-w-[350px]", // min-width, margin, rounded-box (DaisyUI default), min-height
          "transition-colors duration-300 ease-in-out", // Generic transition for background/border
          "bg-base-200 border-base-content/10 border", // Default background and subtle border

          // Specific states / variations
          {
            // Placeholder styles (for adding new lists/columns)
            "text-base-content/50 cursor-pointer items-center justify-center":
              placeholder,
            "border-base-content/20 hover:border-base-content/30 border-dashed bg-transparent":
              placeholder,

            // Horizontal layout for the *inner* ul (the container itself remains a column flex for header/list)
            // The `ul` below will handle `grid-auto-flow: column;` if `horizontal` is true.
            "w-full": horizontal, // This container takes full width if horizontal

            // Unstyled variant
            "overflow-visible !border-none !bg-transparent !shadow-none":
              unstyled,

            // Hover state for the container (if it's not a placeholder and not unstyled)
            "hover:bg-base-300": !placeholder && !unstyled && !onClick, // Add a subtle hover effect if it's a regular container and not a button

            // Focus-visible: Use DaisyUI's built-in focus ring or a simple Tailwind one
            "focus-visible:ring-primary focus-visible:ring-offset-base-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none":
              !unstyled,
          },
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        style={style}
      >
        {label ? (
          <div
            className={clsx(
              "flex items-center justify-between p-4", // DaisyUI padding
              "bg-base-100 rounded-t-box", // Header background and rounded corners
              "border-base-content/10 border-b", // Separator
              "group", // Enable group-hover for actions
            )}
          >
            <h3 className="text-base-content text-lg font-semibold">{label}</h3>
            <div className="flex gap-1">
              {" "}
              {/* Actions container */}
              {onRemove ? (
                <Remove
                  className="opacity-0 group-hover:opacity-100 focus-visible:!opacity-100"
                  onClick={onRemove}
                />
              ) : undefined}
              <Handle {...handleProps} />
            </div>
          </div>
        ) : null}

        {placeholder ? (
          // If it's a placeholder, children are rendered directly (e.g., "Add a card")
          <div className="flex flex-grow items-center justify-center p-4 text-center">
            {children}
          </div>
        ) : (
          // Otherwise, children are items within a list
          <ul
            className={clsx(
              "m-0 grid list-none gap-2 p-4", // Base list styles
              "grid-cols-1", // Default to single column
              {
                "grid-flow-col": horizontal, // For horizontal item layout
                "overflow-y-auto": scrollable, // For vertical scrolling items
              },
            )}
          >
            {children}
          </ul>
        )}
      </div>
    );
  },
);
