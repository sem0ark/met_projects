import { useCard, type Card } from "./board-store";
import type { UniqueIdentifier } from "@dnd-kit/core";

import { forwardRef, memo } from "react";
import clsx from "clsx";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { CSS, type Transform } from "@dnd-kit/utilities";

import { Handle, Remove, type ActionProps } from "./ActionButton";
import { useIsUsingHandleCard } from "./app-store";
import { useSortable } from "@dnd-kit/sortable";

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

  onRemove?(): void;
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
        onRemove,
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
              'before:bg-accent relative before:absolute before:top-1/2 before:left-0 before:block before:h-full before:w-1 before:-translate-y-1/2 before:rounded-l-[3px] before:content-[""]',
            )}
            data-cypress="draggable-item"
            {...(!handle ? listeners : undefined)}
            {...props}
            tabIndex={!handle ? 0 : undefined}
          >
            {value}
            <span className="-my-3 ml-auto flex h-full flex-col justify-center">
              {onRemove ? <Remove onClick={onRemove} /> : null}
              {handle ? <Handle  className="-my-4 -mr-4 py-7 pr-7 rounded-none rounded-r-md" {...handleProps} {...listeners} /> : null}
            </span>
          </div>
        </li>
      );
    },
  ),
);

const CardContent = ({ card }: { card: Card }) => {
  if (!card) {
    return (
      <div style={{ padding: "8px", opacity: 0.7, color: "gray" }}>
        Loading card...
      </div>
    );
  }

  return (
    <>
      <strong>{card.title || "Untitled Card"}</strong>
      {card.description && <p> {card.description} </p>}
    </>
  );
};

type CardProps = Omit<ItemProps, "value"> & { id: UniqueIdentifier };
const CardItem = forwardRef<HTMLLIElement, CardProps>(
  ({ id, ...props }, ref) => {
    const cardData = useCard(id);
    return (
      <Item
        ref={ref} // Pass the ref from useSortable to the underlying DOM element
        {...props}
        value={<CardContent card={cardData} />}
      />
    );
  },
);
CardItem.displayName = "CardItem";

export function SortableCard({
  disabled,
  id,
  index,
}: {
  id: UniqueIdentifier;
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
    />
  );
}

export function OverlayCard({ id }: { id: UniqueIdentifier }) {
  const isUsingHandle = useIsUsingHandleCard();

  return <CardItem id={id} handle={isUsingHandle} />;
}
