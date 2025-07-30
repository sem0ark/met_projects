import React, { useEffect } from "react";
import clsx from "clsx";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

import { Handle, Remove, type ActionProps } from "./ActionButton";

export interface ItemProps {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: Partial<ActionProps>;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  style?: React.CSSProperties;
  transition?: string | null;

  value: React.ReactNode;

  onRemove?(): void;
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, ItemProps>(
    (
      {
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        handle,
        handleProps,
        index,
        listeners,
        onRemove,
        transition,
        transform,
        value,
        ...props
      },
      ref,
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = "grabbing";

        return () => {
          document.body.style.cursor = "";
        };
      }, [dragOverlay]);

      const wrapperCustomProperties: React.CSSProperties = {
        "--translate-x": transform ? `${Math.round(transform.x)}px` : undefined,
        "--translate-y": transform ? `${Math.round(transform.y)}px` : undefined,
        "--scale-x": transform?.scaleX ? `${transform.scaleX}` : undefined,
        "--scale-y": transform?.scaleY ? `${transform.scaleY}` : undefined,
        "--index": index,
        transition: transition,
      } as React.CSSProperties;

      // Custom properties for dragOverlay and picked-up state
      const itemCustomProperties: React.CSSProperties = {
        "--scale": dragOverlay ? "1.05" : "1",
      } as React.CSSProperties; // Cast needed for custom CSS variables

      return (
        <li
          className={clsx(
            "box-border flex transform-gpu touch-manipulation",
            fadeIn && "animate-fade-in",
            dragOverlay && "z-[999]",
          )}
          style={wrapperCustomProperties}
          ref={ref}
          {...props}
        >
          <div
            className={clsx(
              "relative flex flex-grow items-center p-4",
              "bg-base-100 rounded-md shadow-md outline-none",
              "transform-origin-center box-border list-none",
              "text-base-content text-base font-normal whitespace-nowrap",
              "transition-shadow duration-200 ease-in-out",

              !handle && "cursor-grab",

              dragging && !dragOverlay && "z-0 opacity-50",
              dragging && !dragOverlay && "focus:shadow-md",

              disabled && "bg-base-200 cursor-not-allowed text-gray-500",
              disabled && "focus:shadow-sm",

              dragOverlay && "cursor-inherit animate-pop",

              "focus-visible:shadow-accent focus-visible:shadow-md focus-visible:ring-2",
              'before:bg-accent relative before:absolute before:top-1/2 before:left-0 before:block before:h-full before:w-[3px] before:-translate-y-1/2 before:rounded-l-[3px] before:content-[""]',

              // Show remove button on hover
              "group", // Enable group-hover utility
              // Note: The visibility of .Remove is controlled by a parent group-hover in this setup,
              // rather than a direct CSS rule. The Remove component itself will apply 'invisible group-hover:visible'.
            )}
            style={itemCustomProperties}
            data-cypress="draggable-item"
            {...(!handle ? listeners : undefined)}
            {...props}
            tabIndex={!handle ? 0 : undefined}
          >
            {value}
            <span
              className="-mt-3 -mr-2.5 -mb-4 ml-auto flex self-start"
              // DaisyUI defaults or closer
              // Original: margin-top: -12px; margin-left: auto; margin-bottom: -15px; margin-right: -10px;
              // Equivalent Tailwind: -mt-3 (12px), ml-auto, -mb-4 (16px), -mr-2.5 (10px)
            >
              {onRemove ? (
                <Remove
                  className="invisible group-hover:visible"
                  onClick={onRemove}
                />
              ) : null}
              {handle ? <Handle {...handleProps} {...listeners} /> : null}
            </span>
          </div>
        </li>
      );
    },
  ),
);
