import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type CancelDrop,
  closestCenter,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  type SortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { keyboardCoordinateGetter } from "./keyboard-handler";
import { useBoardStoreActions } from "./board-store";
import { OverlayCard } from "./board-cards";
import { ColumnPlaceholder, OverlayLane, SortableLane } from "./board-lanes";
import { PLACEHOLDER_ID } from "./constants";

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

interface Props {
  cancelDrop?: CancelDrop;
  handle?: boolean;
  strategy?: SortingStrategy;
  scrollable?: boolean;
  vertical?: boolean;
}

export function Board({ scrollable }: Props) {
  const { initializeBoard } = useBoardStoreActions();
  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const [items, setItems] = useState<Items>(initializeBoard);
  const [containers, setContainers] = useState(
    Object.keys(items) as UniqueIdentifier[],
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [clonedItems, setClonedItems] = useState<Items | null>(null);

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const isDraggingContainer =
    activeId != null ? containers.includes(activeId) : false;

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinateGetter,
    }),
  );

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (id in items) return id;
      return Object.keys(items).find((key) => items[key].includes(id));
    },
    [items],
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items,
          ),
        });
      }

      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId];

          if (containerItems.length > 0) {
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id),
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items],
  );

  const onDragCancel = useCallback(() => {
    if (clonedItems) {
      setItems(clonedItems);
    }
    setActiveId(null);
    setClonedItems(null);
  }, [clonedItems]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  const handleRemove = useCallback((containerID: UniqueIdentifier) => {
    setContainers((prevContainers) =>
      prevContainers.filter((id) => id !== containerID),
    );
    setItems((prevItems) => {
      const newItems = { ...prevItems };
      delete newItems[containerID];
      return newItems;
    });
  }, []);

  const getNextContainerId = useCallback(() => {
    const containerIds = Object.keys(items);
    if (containerIds.length === 0) return "A";
    const lastContainerId = containerIds[containerIds.length - 1];
    // Assuming IDs are single characters for this logic
    return String.fromCharCode(lastContainerId.charCodeAt(0) + 1);
  }, [items]);

  const handleAddColumn = useCallback(() => {
    const newContainerId = getNextContainerId();
    setContainers((prevContainers) => [...prevContainers, newContainerId]);
    setItems((prevItems) => ({
      ...prevItems,
      [newContainerId]: [],
    }));
  }, [getNextContainerId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        setClonedItems(items); // Clone items for potential revert on cancel
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;

        // Early exit conditions
        if (overId == null || active.id in items) {
          return;
        }

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!overContainer || !activeContainer) {
          return;
        }

        // Handle moving item between different containers
        if (activeContainer !== overContainer) {
          setItems((items) => {
            const activeItems = items[activeContainer];
            const overItems = items[overContainer];
            const overIndex = overItems.indexOf(overId);
            const activeIndex = activeItems.indexOf(active.id);

            let newIndex: number;

            // If dragging over a container itself, place at the end of that container
            if (overId in items) {
              newIndex = overItems.length + 1;
            } else {
              // Determine precise insertion index based on visual position
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                  over.rect.top + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;
              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            return {
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item) => item !== active.id,
              ),
              [overContainer]: [
                ...overItems.slice(0, newIndex),
                activeItems[activeIndex],
                ...overItems.slice(newIndex, overItems.length),
              ],
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        // Handle drag of a container (lane)
        if (active.id in items && over?.id) {
          setContainers((containers) => {
            const activeIndex = containers.indexOf(active.id);
            const overIndex = containers.indexOf(over.id);

            return arrayMove(containers, activeIndex, overIndex);
          });
        }

        const activeContainer = findContainer(active.id);

        if (!activeContainer) {
          setActiveId(null);
          return;
        }

        const overId = over?.id;

        if (overId == null) {
          setActiveId(null);
          return;
        }

        if (overId === PLACEHOLDER_ID) {
          const newContainerId = getNextContainerId();

          setContainers((containers) => [...containers, newContainerId]);

          setItems((items) => ({
            ...items,
            [activeContainer]: items[activeContainer].filter(
              (id) => id !== activeId,
            ),
            [newContainerId]: [active.id],
          }));
          setActiveId(null);
          return;
        }

        const overContainer = findContainer(overId);

        if (overContainer) {
          const activeIndex = items[activeContainer].indexOf(active.id);
          const overIndex = items[overContainer].indexOf(overId);

          if (activeIndex !== overIndex) {
            setItems((items) => ({
              ...items,
              [overContainer]: arrayMove(
                items[overContainer],
                activeIndex,
                overIndex,
              ),
            }));
          }
        }

        setActiveId(null); // Reset active drag ID
      }}
      onDragCancel={onDragCancel}
    >
      <div className="box-border inline-grid grid-flow-col p-5">
        <SortableContext
          items={[...containers, PLACEHOLDER_ID]}
          strategy={horizontalListSortingStrategy}
        >
          {containers.map((containerId) => (
            <SortableLane
              key={containerId}
              id={containerId}
              items={items[containerId]}
              scrollable={scrollable}
              onRemove={() => handleRemove(containerId)}
              disabled={isDraggingContainer}
            />
          ))}
          <ColumnPlaceholder
            disabled={isDraggingContainer}
            onClick={handleAddColumn}
          >
            <span className="text-base-content/70 hover:text-primary text-xl font-bold transition-colors">
              + Add column
            </span>
          </ColumnPlaceholder>
        </SortableContext>
      </div>
      {createPortal(
        <DragOverlay>
          {activeId ? (
            containers.includes(activeId) ? (
              <OverlayLane id={activeId} items={items[activeId]} />
            ) : (
              <OverlayCard id={activeId} />
            )
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
