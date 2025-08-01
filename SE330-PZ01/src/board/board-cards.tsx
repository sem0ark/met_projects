import type { UniqueIdentifier } from "@dnd-kit/core";

import { forwardRef, memo } from "react";
import clsx from "clsx";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { CSS, type Transform } from "@dnd-kit/utilities";

import { Handle, type ActionProps } from "./ActionButton";
import { useIsUsingHandleCard } from "../app-store";
import { useSortable } from "@dnd-kit/sortable";
import { CardContent, type CardContentProps } from "./CardContent";

interface ItemProps {
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
}

const Item = memo(
  forwardRef<HTMLLIElement, ItemProps>(
    (
      {
        dragOverlay,
        dragging,
        disabled,
        handle,
        handleProps,
        index,
        listeners,
        transition,
        transform,
        value,
        ...props
      },
      ref,
    ) => {
      const wrapperCustomProperties: React.CSSProperties = {
        transition: transition,
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        "--index": index,
      } as React.CSSProperties;

      return (
        <li
          className={clsx(
            "box-border flex transform-gpu touch-manipulation",
            dragOverlay && "z-[999] scale-110",
          )}
          style={wrapperCustomProperties}
          ref={ref}
          {...props}
        >
          <div
            className={clsx(
              "relative flex flex-grow items-center pl-4",
              "bg-base-100 rounded-md shadow-md outline-none",
              "transform-origin-center box-border list-none",
              "text-base-content text-base font-normal whitespace-nowrap",
              "transition-shadow duration-200 ease-in-out",
              "group/card",

              !handle && "cursor-grab",

              dragging && !dragOverlay && "z-0 opacity-50",
              dragging && !dragOverlay && "focus:shadow-md",

              disabled && "bg-base-200 cursor-not-allowed text-gray-500",
              disabled && "focus:shadow-sm",

              dragOverlay && "cursor-inherit animate-pop",

              "focus-visible:shadow-accent focus-visible:shadow-md focus-visible:ring-2",
              'before:bg-accent relative before:absolute before:top-1/2 before:left-0 before:block before:h-full before:w-1 before:-translate-y-1/2 before:rounded-l-[3px] before:content-[""]',
            )}
            data-cypress="draggable-item"
            {...(!handle ? listeners : undefined)}
            {...props}
            tabIndex={!handle ? 0 : undefined}
          >
            {value}
            <span className="ml-auto flex h-full flex-col justify-center">
              {handle ? (
                <Handle
                  className="rounded-none rounded-r-md py-8 pr-7"
                  {...handleProps}
                  {...listeners}
                />
              ) : null}
            </span>
          </div>
        </li>
      );
    },
  ),
);

type CardProps = Omit<ItemProps, "value"> & CardContentProps;
const CardItem = forwardRef<HTMLLIElement, CardProps>(
  ({ id, onRemove, ...props }, ref) => {
    return (
      <Item
        ref={ref}
        {...props}
        value={<CardContent onRemove={onRemove} id={id} />}
      />
    );
  },
);
CardItem.displayName = "CardItem";

export function SortableCard({
  disabled,
  id,
  index,
  ...props
}: CardContentProps & {
  index: number;
  disabled?: boolean;
}) {
  const isUsingHandle = useIsUsingHandleCard();
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <CardItem
      ref={disabled ? undefined : setNodeRef}
      id={id}
      dragging={isDragging}
      handle={isUsingHandle}
      handleProps={
        isUsingHandle ? { ref: setActivatorNodeRef, ...listeners } : listeners
      }
      index={index}
      transition={transition}
      transform={transform}
      disabled={disabled}
      {...props}
    />
  );
}

export function OverlayCard({ id }: { id: UniqueIdentifier }) {
  const isUsingHandle = useIsUsingHandleCard();
  return <CardItem dragging={true} id={id} handle={isUsingHandle} />;
}
