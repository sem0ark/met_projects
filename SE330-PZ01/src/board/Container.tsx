import React, { forwardRef } from "react";
import clsx from "clsx";

import { Remove, Handle, type ActionProps } from "./ActionButton"; // Assuming ActionButton.tsx is updated

export interface ContainerProps {
  children: React.ReactNode;
  label?: string;
  hover?: boolean;
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
      hover,
      handleProps,
      scrollable,
      placeholder,
      onClick,
      onRemove,
      style,
      ...props
    }: ContainerProps,
    ref,
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        className={clsx(
          "rounded-box bg-base-200 border-base-content/10 m-2.5 box-border flex flex-col min-h-52 min-w-80",
          "appearance-none border outline-none",
          "transition-colors duration-300 ease-in-out",
          "focus-visible:ring-info focus-visible:ring-offset-base-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          {
            // "text-base-content/50 cursor-pointer items-center justify-center": placeholder,
            // "border-base-content/20 hover:border-base-content/30 border-dashed bg-transparent": placeholder,

            // Hover state for the container (if it's not a placeholder and not unstyled)
            "hover:bg-base-300": !placeholder && !onClick, // Add a subtle hover effect if it's a regular container and not a button
            "bg-base-300": hover, // Add a subtle hover effect if it's a regular container and not a button
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
          <div className="flex flex-grow items-center justify-center p-4 text-center">
            {children}
          </div>
        ) : (
          <ul
            className={clsx(
              "m-0 flex flex-col list-none gap-2 p-4", // Base list styles
              {
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
