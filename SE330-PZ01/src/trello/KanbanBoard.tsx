import React, { useState, useCallback } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

// --- Type Definitions ---
interface Card {
  id: string;
  title: string;
  laneId: string;
}

interface Lane {
  id: string;
  title: string;
  cards: Card[];
}

// --- Card Component (Draggable) ---
interface KanbanCardProps {
  card: Card;
  onCardClick?: (card: Card) => void;
  onDeleteCard?: (laneId: string, cardId: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  onCardClick,
  onDeleteCard,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "Card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "card card-compact bg-base-100 compact shadow-md",
        "mb-2 transform cursor-grab transition-transform duration-200 ease-in-out",
        isDragging && "border-primary border-2 opacity-50", // Visual feedback for dragging
      )}
      onClick={() => onCardClick?.(card)}
    >
      <div className="card-body p-3">
        <h3 className="card-title text-base-content text-sm font-medium">
          {card.title}
        </h3>
        <div className="card-actions justify-end">
          <button
            className="btn btn-xs btn-circle btn-ghost"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when deleting
              onDeleteCard?.(card.laneId, card.id);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Lane Component (Droppable & Sortable Context for Cards) ---
interface KanbanLaneProps {
  lane: Lane;
  onAddCard: (laneId: string, title: string) => void;
  onDeleteLane: (laneId: string) => void;
  onCardClick?: (card: Card) => void;
  onDeleteCard?: (laneId: string, cardId: string) => void;
}

const KanbanLane: React.FC<KanbanLaneProps> = ({
  lane,
  onAddCard,
  onDeleteLane,
  onCardClick,
  onDeleteCard,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lane.id, data: { type: "Lane", lane } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [newCardTitle, setNewCardTitle] = useState("");

  const handleAddCard = useCallback(() => {
    if (newCardTitle.trim()) {
      onAddCard(lane.id, newCardTitle.trim());
      setNewCardTitle("");
    }
  }, [lane.id, newCardTitle, onAddCard]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleAddCard();
      }
    },
    [handleAddCard],
  );

  const cardIds = lane.cards.map((card) => card.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-base-300 mx-2 flex h-fit max-h-[calc(100vh-100px)] w-72 flex-shrink-0 flex-col overflow-hidden rounded-lg p-3",
        isDragging && "border-primary border-2 opacity-50", // Visual feedback for dragging
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base-content text-lg font-semibold">
          {lane.title} ({lane.cards.length})
        </h2>
        <button
          className="btn btn-xs btn-circle btn-ghost"
          onClick={() => onDeleteLane(lane.id)}
        >
          ✕
        </button>
      </div>

      <div className="-mr-1 flex-grow overflow-y-auto pr-1">
        {" "}
        {/* Scrollable card area */}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {lane.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onCardClick={onCardClick}
              onDeleteCard={onDeleteCard}
            />
          ))}
        </SortableContext>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="New card title..."
          className="input input-sm input-bordered w-full"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn btn-sm btn-primary w-full"
          onClick={handleAddCard}
        >
          Add Card
        </button>
      </div>
    </div>
  );
};

export const KanbanBoard = () => {
  const [lanes, setLanes] = useState<Lane[]>([
    {
      id: uuidv4(),
      title: "To Do",
      cards: [
        { id: uuidv4(), title: "Implement Dnd-kit", laneId: "" },
        { id: uuidv4(), title: "Add DaisyUI styling", laneId: "" },
      ].map((card) => ({ ...card, laneId: card.id })), // Set laneId initially
    },
    {
      id: uuidv4(),
      title: "In Progress",
      cards: [
        { id: uuidv4(), title: "Refactor to single file", laneId: "" },
      ].map((card) => ({ ...card, laneId: card.id })),
    },
    {
      id: uuidv4(),
      title: "Done",
      cards: [{ id: uuidv4(), title: "Set up React project", laneId: "" }].map(
        (card) => ({ ...card, laneId: card.id }),
      ),
    },
  ]);

  useState(() => {
    setLanes((prevLanes) =>
      prevLanes.map((lane) => ({
        ...lane,
        cards: lane.cards.map((card) => ({ ...card, laneId: lane.id })),
      })),
    );
  });

  const [newLaneTitle, setNewLaneTitle] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  const findLane = useCallback(
    (id: string) => {
      return lanes.find((lane) => lane.id === id);
    },
    [lanes],
  );

  const findLaneByCardId = useCallback(
    (cardId: string) => {
      for (const lane of lanes) {
        if (lane.cards.some((card) => card.id === cardId)) {
          return lane;
        }
      }
      return undefined;
    },
    [lanes],
  );

  // Handler for when a drag action ends
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return; // Dropped outside of any droppable area

      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      // --- Lane Dragging ---
      if (activeType === "Lane" && overType === "Lane") {
        const oldIndex = lanes.findIndex((lane) => lane.id === active.id);
        const newIndex = lanes.findIndex((lane) => lane.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setLanes((prevLanes) => arrayMove(prevLanes, oldIndex, newIndex));
        }
      }

      // --- Card Dragging (within same lane or across lanes) ---
      if (activeType === "Card" && overType) {
        const activeCard = active.data.current?.card as Card;
        const sourceLane = findLaneByCardId(activeCard.id);
        let destinationLane = findLane(over.id as string); // Assume over.id is a lane ID if dropping onto a lane background

        // If dropping onto another card, find that card's lane
        if (overType === "Card") {
          const overCard = over.data.current?.card as Card;
          destinationLane = findLaneByCardId(overCard.id);
        }

        if (!sourceLane || !destinationLane) return; // Should not happen if data is consistent

        const oldCardIndex = sourceLane.cards.findIndex(
          (card) => card.id === activeCard.id,
        );
        let newCardIndex = destinationLane.cards.length; // Default to end of lane if dropping onto lane background

        if (overType === "Card") {
          newCardIndex = destinationLane.cards.findIndex(
            (card) => card.id === over.id,
          );
          // If dropping on a card in the same lane, adjust index based on movement direction
          if (
            sourceLane.id === destinationLane.id &&
            newCardIndex > oldCardIndex
          ) {
            newCardIndex--; // If moving down, the index should be one less
          }
        }

        if (sourceLane.id === destinationLane.id) {
          // Moving within the same lane
          if (
            oldCardIndex !== -1 &&
            newCardIndex !== -1 &&
            oldCardIndex !== newCardIndex
          ) {
            setLanes((prevLanes) =>
              prevLanes.map((lane) =>
                lane.id === sourceLane.id
                  ? {
                      ...lane,
                      cards: arrayMove(lane.cards, oldCardIndex, newCardIndex),
                    }
                  : lane,
              ),
            );
          }
        } else {
          // Moving across lanes
          if (oldCardIndex !== -1) {
            setLanes((prevLanes) => {
              const newLanes = [...prevLanes];
              const sourceLaneIndex = newLanes.findIndex(
                (lane) => lane.id === sourceLane.id,
              );
              const destLaneIndex = newLanes.findIndex(
                (lane) => lane.id === destinationLane.id,
              );

              if (sourceLaneIndex !== -1 && destLaneIndex !== -1) {
                const [movedCard] = newLanes[sourceLaneIndex].cards.splice(
                  oldCardIndex,
                  1,
                );
                movedCard.laneId = destinationLane.id; // Update laneId of the moved card
                newLanes[destLaneIndex].cards.splice(
                  newCardIndex,
                  0,
                  movedCard,
                );
              }
              return newLanes;
            });
          }
        }
      }
    },
    [lanes, findLane, findLaneByCardId],
  );

  // Handler for when a draggable is over a droppable (useful for immediate visual feedback if needed)
  const handleDragOver = useCallback(() => {
    // This example simplifies `handleDragOver` because `handleDragEnd` handles the full logic.
    // For more complex real-time reordering previews, you might implement more here.
  }, []);

  const handleAddLane = useCallback(() => {
    if (newLaneTitle.trim()) {
      setLanes((prevLanes) => [
        ...prevLanes,
        { id: uuidv4(), title: newLaneTitle.trim(), cards: [] },
      ]);
      setNewLaneTitle("");
    }
  }, [newLaneTitle]);

  const handleDeleteLane = useCallback((laneId: string) => {
    setLanes((prevLanes) => prevLanes.filter((lane) => lane.id !== laneId));
  }, []);

  const handleAddCard = useCallback((laneId: string, title: string) => {
    setLanes((prevLanes) =>
      prevLanes.map((lane) =>
        lane.id === laneId
          ? { ...lane, cards: [...lane.cards, { id: uuidv4(), title, laneId }] }
          : lane,
      ),
    );
  }, []);

  const handleDeleteCard = useCallback((laneId: string, cardId: string) => {
    setLanes((prevLanes) =>
      prevLanes.map((lane) =>
        lane.id === laneId
          ? { ...lane, cards: lane.cards.filter((card) => card.id !== cardId) }
          : lane,
      ),
    );
  }, []);

  const handleCardClick = useCallback(
    (card: Card) => {
      alert(
        `Card Clicked: ${card.title} in Lane: ${findLane(card.laneId)?.title}`,
      );
    },
    [findLane],
  );

  const laneIds = lanes.map((lane) => lane.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners} // Or rectIntersection, which is often good for grid/horizontal layouts
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver} // Needed for dragging cards between lanes
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always, // Ensures droppable areas are re-measured after changes
        },
      }}
    >
      <div className="flex min-h-0 flex-grow items-start overflow-x-auto p-4">
        <SortableContext
          items={laneIds}
          strategy={horizontalListSortingStrategy}
        >
          {lanes.map((lane) => (
            <KanbanLane
              key={lane.id}
              lane={lane}
              onAddCard={handleAddCard}
              onDeleteLane={handleDeleteLane}
              onCardClick={handleCardClick}
              onDeleteCard={handleDeleteCard}
            />
          ))}
        </SortableContext>

        {/* Add New Lane Section */}
        <div className="bg-base-200 mx-2 flex h-fit max-h-[calc(100vh-100px)] w-72 flex-shrink-0 flex-col rounded-lg p-3">
          <h2 className="text-base-content mb-3 text-lg font-semibold">
            Add New Lane
          </h2>
          <input
            type="text"
            placeholder="New lane title..."
            className="input input-sm input-bordered mb-2 w-full"
            value={newLaneTitle}
            onChange={(e) => setNewLaneTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddLane()}
          />
          <button
            className="btn btn-sm btn-accent w-full"
            onClick={handleAddLane}
          >
            Add Lane
          </button>
        </div>
      </div>
    </DndContext>
  );
};
