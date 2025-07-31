import { type UniqueIdentifier } from "@dnd-kit/core";
import {
  type AnimateLayoutChanges,
  useSortable,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useLane } from "./board-store";
import { OverlayCard, SortableCard } from "./board-cards";
import { PLACEHOLDER_ID } from "./constants";
import type { PropsWithChildren } from "react";

import React, { forwardRef } from "react";
import clsx from "clsx";

import { Remove, Handle, type ActionProps } from "./ActionButton";

interface ContainerProps {
  children?: React.ReactNode;
  label?: React.ReactNode;
  isStatic?: boolean;
  hover?: boolean;
  handle?: boolean;
  handleProps?: ActionProps;
  scrollable?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;

  onClick?(): void;
  onRemove?(): void;

  style?: React.CSSProperties;
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      label,
      hover,
      isStatic,
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
          "rounded-box bg-base-200 border-base-content/10 m-2.5 box-border flex min-h-52 min-w-80 flex-col",
          "appearance-none border outline-none",
          "transition-colors duration-300 ease-in-out",
          "focus-visible:ring-info focus-visible:ring-offset-base-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          {
            "text-base-content/50 cursor-pointer items-center justify-center":
              placeholder,
            "border-base-content/20 hover:border-base-content/30 border-dashed bg-transparent":
              placeholder,

            // Hover state for the container (if it's not a placeholder and not unstyled)
            "hover:bg-base-300": !placeholder && !onClick, // Add a subtle hover effect if it's a regular container and not a button
            "bg-base-300": hover, // Add a subtle hover effect if it's a regular container and not a button
          },
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        style={style}
      >
        {!isStatic && (
          <div
            className={clsx(
              "flex items-center justify-between p-4",
              "bg-base-100 rounded-t-box",
              "border-base-content/10 border-b",
              "group",
            )}
          >
            <h3 className="text-base-content text-lg font-semibold">{label}</h3>
            <div className="flex gap-1">
              {!!onRemove && <Remove onClick={onRemove} />}
              <Handle
                className="-my-4 -mr-4 rounded-none rounded-tr-md py-8 pr-8"
                {...handleProps}
              />
            </div>
          </div>
        )}

        {placeholder ? (
          <div className="flex flex-grow items-center justify-center p-4 text-center">
            {children}
          </div>
        ) : (
          <ul
            className={clsx(
              "m-0 flex list-none flex-col gap-2 p-4",
              scrollable && "overflow-y-auto",
            )}
          >
            {children}
          </ul>
        )}
      </div>
    );
  },
);

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function SortableLane({
  children,
  disabled,
  id,
  items,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
}) {
  const lane = useLane(id);
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: { type: "container", children: items },
    animateLayoutChanges: animateLayoutChanges,
  });

  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      items.includes(over.id)
    : false;

  const currentLabel = lane?.title ?? `Column ${id}`;

  return (
    <Container
      ref={setNodeRef}
      label={currentLabel}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{ ...attributes, ...listeners }}
      {...props}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((value, index) => {
          return (
            <SortableCard
              disabled={disabled}
              key={value}
              id={value}
              index={index}
            />
          );
        })}
      </SortableContext>
      {children}
    </Container>
  );
}

export function OverlayLane({
  id,
  items,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
}) {
  const lane = useLane(id);

  return (
    <Container label={lane?.title || `Column ${id}`} {...props}>
      {items.map((itemId) => (
        <OverlayCard key={itemId} id={itemId} />
      ))}
    </Container>
  );
}

const empty: UniqueIdentifier[] = [];
export const ColumnPlaceholder = ({
  disabled,
  onClick,
  children,
}: PropsWithChildren<{
  disabled?: boolean;
  onClick: () => void;
}>) => {
  return (
    <SortableLane
      id={PLACEHOLDER_ID}
      disabled={disabled}
      items={empty}
      onClick={onClick}
      placeholder
      isStatic
    >
      {children}
    </SortableLane>
  );
};
