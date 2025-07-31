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
import type { PropsWithChildren } from "react";

import React, { forwardRef } from "react";
import clsx from "clsx";

import { Handle, type ActionProps } from "./ActionButton";
import { LaneLabelContent } from "./LaneLabelContent";

interface ContainerProps {
  children?: React.ReactNode;
  label?: React.ReactNode;
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
      handleProps,
      placeholder,
      onClick,
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
          "rounded-box bg-base-200 border-base-content/10 m-2.5 box-border flex min-h-52 w-96 flex-col",
          "appearance-none border outline-none",
          "transition-colors duration-300 ease-in-out",
          "focus-visible:ring-info focus-visible:ring-offset-base-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "group/container",
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
        {!!label && (
          <div
            className={clsx(
              "flex w-full flex-row items-center justify-between",
              "bg-base-100 rounded-t-box",
              "border-base-content/10 border-b",
            )}
          >
            {label}
            <Handle
              className="rounded-none rounded-tr-md border-0 py-8 pr-8"
              {...handleProps}
            />
          </div>
        )}

        {placeholder ? (
          <div className="flex flex-grow items-center justify-center p-4 text-center">
            {children}
          </div>
        ) : (
          <ul className="m-0 flex h-96 list-none flex-col gap-2 overflow-y-auto p-4">
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
  cards,
  onAddCard,
  onRemoveCard,
  onRemove: onRemoveLane,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  cards: UniqueIdentifier[];
  onAddCard: (laneId: UniqueIdentifier) => void;
  onRemoveCard: (laneId: UniqueIdentifier, cardId: UniqueIdentifier) => void;
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
    data: { type: "container", children: cards },
    animateLayoutChanges: animateLayoutChanges,
  });

  if (!lane) {
    return null;
  }

  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      cards.includes(over.id)
    : false;

  return (
    <Container
      ref={setNodeRef}
      label={
        <LaneLabelContent
          laneId={lane.id}
          onAddCard={onAddCard}
          onRemoveLane={onRemoveLane}
        />
      }
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{ ...attributes, ...listeners }}
      {...props}
    >
      {children}
      <SortableContext items={cards} strategy={verticalListSortingStrategy}>
        {cards.map((cardId, index) => {
          return (
            <SortableCard
              disabled={disabled || isDragging}
              key={cardId}
              id={cardId}
              index={index}
              onRemove={onRemoveCard && (() => onRemoveCard(lane?.id, cardId))}
            />
          );
        })}
      </SortableContext>
    </Container>
  );
}

export function OverlayLane({
  id,
  cards,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  cards: UniqueIdentifier[];
}) {
  const lane = useLane(id);

  return (
    <Container label={<LaneLabelContent laneId={lane?.id ?? ""} />} {...props}>
      {cards.map((itemId) => (
        <OverlayCard key={itemId} id={itemId} />
      ))}
    </Container>
  );
}

export const ColumnPlaceholder = ({
  onClick,
  children,
}: PropsWithChildren<{
  disabled?: boolean;
  onClick: () => void;
}>) => {
  return (
    <Container placeholder onClick={onClick}>
      {children}
    </Container>
  );
};
