import { Remove, AddNew } from "./ActionButton"; // Assuming AddNew is your Add component, adjust if needed
import { type UniqueIdentifier } from '@dnd-kit/core';
import { useLane } from "./board-store";

export interface LaneLabelContentProps {
  laneId: UniqueIdentifier; // Pass laneId for onAddCard
  onAddCard?: (laneId: UniqueIdentifier) => void;
  onRemoveLane?: () => void; // Renamed for clarity within the header
}

export const LaneLabelContent = ({
  laneId,
  onAddCard,
  onRemoveLane,
}: LaneLabelContentProps) => {
  const lane = useLane(laneId);
  if (!lane) return null;

  return (
    <div className="px-4 flex w-full flex-row items-center gap-4">
      <h3 className="text-base-content text-lg font-semibold">
        {lane.title}
      </h3>
      <div className="flex-1"></div>
      {lane.canAddCard && !!onAddCard && (
        <AddNew
          aria-label="Add Task"
          onClick={() => onAddCard(laneId)}
        />
      )}
      {lane.canRemove && !!onRemoveLane && <Remove onClick={onRemoveLane} />}
    </div>
  );
};
