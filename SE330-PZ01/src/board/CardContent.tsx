import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Edit, Remove } from "./ActionButton";
import {
  useBoardStoreActions,
  useBoardStoreGetters,
  useCard,
} from "./board-store";
import type { ID } from "./common-types";
import clsx from "clsx";

export type CardContentProps = {
  id: ID;
  onRemove?: () => void;
  dragging?: boolean;
};

const CardEditForm = ({
  id,
  onClose,
  onSave,
  autoFocusRef,
}: CardContentProps & {
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  autoFocusRef: React.RefObject<HTMLInputElement | null>;
}) => {
  const card = useCard(id);

  const [editedTitle, setEditedTitle] = useState(card?.title ?? "");
  const [editedDescription, setEditedDescription] = useState(
    card?.description ?? "",
  );

  useEffect(() => {
    if (card) {
      setEditedTitle(card.title ?? "");
      setEditedDescription(card.description ?? "");
    }
  }, [card]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      editedTitle !== card?.title ||
      editedDescription !== card?.description
    ) {
      onSave(editedTitle, editedDescription);
    }
    onClose();
  };

  if (!card) return null;

  return (
    <div
      className="drawer-side"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <label
        htmlFor={`card-drawer-toggle-${card.id}`}
        aria-label="close sidebar"
        className="drawer-overlay"
        onClick={onClose}
      ></label>

      <div className="bg-base-100 text-base-content min-h-full w-lg p-4">
        <h2 className="mb-4 text-xl font-bold">Edit Card</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Fieldset for Title */}
          <fieldset className="form-control w-full">
            <legend className="label">
              <span className="label-text">Title</span>
            </legend>
            <input
              ref={autoFocusRef}
              type="text"
              placeholder="Card title"
              className="input input-bordered w-full"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              required
            />
          </fieldset>

          <fieldset className="form-control w-full">
            <legend className="label">
              <span className="label-text">Description</span>
            </legend>
            <textarea
              placeholder="Card description"
              className="textarea textarea-bordered h-24 w-full"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
            ></textarea>
            <p className="label text-base-content-secondary mt-1 text-sm">
              Provide more details about the task.
            </p>
          </fieldset>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost w-1/2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary w-1/2">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CardContent = ({ id, onRemove, dragging }: CardContentProps) => {
  const card = useCard(id);
  const { canRemoveCard, isCardDone } = useBoardStoreGetters();
  const { updateCard } = useBoardStoreActions();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null); // Ref for autofocus on drawer
  const inlineTitleInputRef = useRef<HTMLInputElement>(null); // Ref for autofocus on inline input

  const [isInlineEditingTitle, setIsInlineEditingTitle] = useState(false);
  const [inlineEditedTitle, setInlineEditedTitle] = useState(card?.title ?? "");

  // Effect to manage inline editing state and focus when title is empty
  useEffect(() => {
    if (card && card.title === "" && !isInlineEditingTitle) {
      setIsInlineEditingTitle(true);
      setInlineEditedTitle(""); // Ensure inline input starts empty
    } else if (card && card.title !== "" && isInlineEditingTitle) {
      setIsInlineEditingTitle(false);
    }
  }, [card?.title, isInlineEditingTitle, card]);

  const handleEditClick = useCallback(() => {
    setIsDrawerOpen(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleSaveCard = useCallback(
    (title: string, description: string) => {
      updateCard({ id: card.id, title, description });
    },
    [card.id, updateCard],
  );

  const handleInlineTitleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (inlineEditedTitle.trim() === "") {
        setInlineEditedTitle(card?.title ?? ""); // Revert to original or default
        setIsInlineEditingTitle(false); // Exit inline edit mode
        return;
      }
      if (inlineEditedTitle !== card?.title) {
        updateCard({
          id: card.id,
          title: inlineEditedTitle,
          description: card?.description ?? "",
        });
      }
      setIsInlineEditingTitle(false); // Exit inline edit mode after submission
    },
    [inlineEditedTitle, card?.id, card?.title, card?.description, updateCard],
  );

  const canRemove = !!onRemove && canRemoveCard(id);
  const isDone = isCardDone(id);

  if (!card) return null;

  const showInlineTitleInput = isInlineEditingTitle && !dragging; // Only show inline input if not dragging

  return (
    <>
      <div className="flex w-full max-w-72 flex-row items-center gap-1">
        <div
          className={clsx(
            "overflow-hidden font-bold text-ellipsis",
            isDone && "text-success italic line-through",
          )}
        >
          {showInlineTitleInput ? (
            <form
              onSubmit={handleInlineTitleSubmit}
              onBlur={handleInlineTitleSubmit}
            >
              <input
                ref={inlineTitleInputRef}
                type="text"
                className="input w-full"
                placeholder="New task..."
                value={inlineEditedTitle}
                onChange={(e) => setInlineEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setInlineEditedTitle(card?.title ?? ""); // Revert on escape
                    setIsInlineEditingTitle(false);
                  }
                }}
              />
            </form>
          ) : (
            <strong
              onClick={card.title === "" ? undefined : handleEditClick} // Only allow click to edit if not empty
              className={clsx(
                card.title === "" ? "" : "cursor-pointer hover:underline",
              )}
            >
              {card.title || "Untitled Card"}
            </strong>
          )}
        </div>
        <div className="flex-1"></div>

        {!dragging && !showInlineTitleInput && (
          <label
            htmlFor={`card-drawer-toggle-${card.id}`}
            className="cursor-pointer"
            onClick={handleEditClick}
          >
            <Edit className="hidden group-hover/card:block" />
          </label>
        )}

        {/* Remove button only visible if not dragging AND not in inline editing mode */}
        {!dragging && canRemove && !showInlineTitleInput && (
          <Remove
            className="hidden group-hover/card:block"
            onClick={onRemove}
          />
        )}
      </div>

      {isDrawerOpen &&
        createPortal(
          <div className="drawer drawer-end fixed inset-0 z-[1000]">
            <input
              id={`card-drawer-toggle-${card.id}`}
              type="checkbox"
              className="drawer-toggle"
              checked={isDrawerOpen}
              onChange={() => setIsDrawerOpen(!isDrawerOpen)}
            />
            <div className="drawer-content" onClick={handleCloseDrawer}></div>

            <CardEditForm
              id={id}
              onClose={handleCloseDrawer}
              onSave={handleSaveCard}
              autoFocusRef={titleInputRef}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
