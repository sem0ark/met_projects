import { useState, useRef, useEffect, useCallback } from "react";
import { Remove, AddNew } from "./ActionButton";
import { type UniqueIdentifier } from "@dnd-kit/core";
import { useBoardStoreActions, useLane } from "./board-store";
import clsx from "clsx";

export interface LaneLabelContentProps {
  laneId: UniqueIdentifier;
  onAddCard?: (laneId: UniqueIdentifier) => void;
  onRemoveLane?: () => void;
}

export const LaneLabelContent = ({
  laneId,
  onAddCard,
  onRemoveLane,
}: LaneLabelContentProps) => {
  const lane = useLane(laneId);
  const { updateLane } = useBoardStoreActions();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(lane?.title || "");
  const titleInputRef = useRef<HTMLInputElement>(null); // Ref for focusing the input

  useEffect(() => {
    if (lane && lane.title !== editedTitle) {
      setEditedTitle(lane.title);
      // If the title changed externally while editing, exit editing mode
      if (isEditing) {
        setIsEditing(false);
      }
    }
  }, [lane?.title, editedTitle, isEditing, lane]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleClick = useCallback(() => {
    if (lane?.canEdit && !isEditing) {
      setIsEditing(true);
      setEditedTitle(lane.title);
    }
  }, [lane?.canEdit, lane?.title, isEditing]);

  const handleTitleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault(); // Prevent full form submission if input is inside a form
      if (!lane) return;

      const trimmedTitle = titleInputRef.current?.value.trim() ?? "";

      if (trimmedTitle === "" || trimmedTitle === lane.title) {
        setEditedTitle(lane.title);
        setIsEditing(false);
        return;
      }

      // Update the lane title in the store
      updateLane({ id: lane.id, title: trimmedTitle });
      setIsEditing(false); // Exit edit mode
    },
    [lane, updateLane],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setEditedTitle(lane?.title || "");
        setIsEditing(false);
      }
    },
    [lane?.title],
  );

  if (!lane) return null;

  return (
    <div className="flex w-full flex-row items-center gap-4 overflow-x-hidden px-4">
      {isEditing ? (
        <form
          onSubmit={handleTitleSubmit}
          onBlur={handleTitleSubmit}
          className="w-full flex-grow"
        >
          <input
            ref={titleInputRef}
            type="text"
            className="input input-bordered input-md text-base-content w-full font-semibold"
            defaultValue={lane.title ?? ""}
            onKeyDown={handleKeyDown}
            placeholder="Lane title"
            required
          />
        </form>
      ) : (
        <h3
          className={clsx(
            "text-base-content flex-grow overflow-hidden text-lg font-semibold text-ellipsis", // flex-grow to occupy space
            lane.canEdit && "cursor-pointer hover:underline",
          )}
          onClick={handleTitleClick}
        >
          {lane.title || "Untitled Lane"}
        </h3>
      )}
      <div className="flex-1"></div>{" "}
      {/* This flex-1 is now redundant if input takes flex-grow */}
      {lane.canAddCard &&
        !!onAddCard &&
        !isEditing && ( // Hide while editing
          <AddNew aria-label="Add Task" onClick={() => onAddCard(laneId)} />
        )}
      {lane.canRemove &&
        !!onRemoveLane &&
        !isEditing && ( // Hide while editing
          <Remove onClick={onRemoveLane} />
        )}
    </div>
  );
};
