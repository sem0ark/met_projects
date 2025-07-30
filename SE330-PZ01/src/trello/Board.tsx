// src/Board.tsx
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BoardContainer from '.Container';
import type { BoardComponents, Lane } from './types'; // Ensure your types are correctly imported

// import Container from 'rt/dnd/Container'; // Assuming these DND components are compatible
// import Draggable from 'rt/dnd/Draggable';
// import { PopoverWrapper } from 'react-popopo'; // Assuming this is still needed and compatible
// import isEqual from 'lodash/isEqual'; // Still useful for prop comparison
// import pick from 'lodash/pick';
// import Lane from './Lane';


import { useBoardStore, getBoardStoreState } from './store'; // Adjust path as needed
import type { BoardProps, Lane as LaneType, Card as CardType, EventBus, EventBusEvent } from './types'; // Import types



export interface BoardProps {
  id?: string;
  className?: string;
  components: BoardComponents; // Using our defined components type
  data: { lanes: Lane[] }; // Initial board data
  onDataChange?: (data: { lanes: Lane[] }) => void;
  eventBusHandle?: (eventBus: EventBus) => void;
  onLaneScroll?: (page: number, laneId: string) => Promise<Card[]>;
  onCardClick?: (cardId: string, metadata: Record<string, unknown> | undefined, laneId: string) => void;
  onBeforeCardDelete?: (callback: () => void) => void;
  onCardDelete?: (cardId: string, laneId: string) => void;
  onCardAdd?: (card: Card, laneId: string) => void;
  onCardUpdate?: (laneId: string, updatedCard: Partial<Card> & Pick<Card, 'id'>) => void;
  onLaneAdd?: (newLane: Omit<Lane, 'cards' | 'currentPage'>) => void;
  onLaneDelete?: (laneId: string) => void;
  onLaneClick?: (laneId: string) => void;
  onLaneUpdate?: (laneId: string, updatedLane: Partial<Lane>) => void;
  laneSortFunction?: (card1: Card, card2: Card) => number;
  draggable?: boolean; // Overall draggable (lanes and cards)
  collapsibleLanes?: boolean;
  editable?: boolean; // Can add/edit lanes/cards
  canAddLanes?: boolean;
  hideCardDeleteIcon?: boolean;
  handleDragStart?: (cardId: string, laneId: string) => void;
  handleDragEnd?: (cardId: string, fromLaneId: string, toLaneId: string, newIndex: number, card: Card) => boolean | undefined | void;
  handleLaneDragStart?: (laneId: string) => void;
  handleLaneDragEnd?: (removedIndex: number, addedIndex: number, payload: Lane) => void;
  style?: React.CSSProperties;
  tagStyle?: React.CSSProperties;
  laneDraggable?: boolean;
  cardDraggable?: boolean;
  cardDragClass?: string;
  laneDragClass?: string;
  laneDropClass?: string;
  onCardMoveAcrossLanes?: (fromLaneId: string, toLaneId: string, cardId: string, index: number) => void;
  editLaneTitle?: boolean;
  t?: (key: string) => string; // Translation function
}

const defaultValues = {
  t: (v: string) => v,
  onDataChange: () => {},
  handleDragStart: () => {},
  handleDragEnd: () => {},
  handleLaneDragStart: () => {},
  handleLaneDragEnd: () => {},
  onCardUpdate: () => {},
  onLaneAdd: () => {},
  onLaneDelete: () => {},
  onCardMoveAcrossLanes: () => {},
  onLaneUpdate: () => {},
  editable: false,
  canAddLanes: false,
  hideCardDeleteIcon: false,
  draggable: false,
  collapsibleLanes: false,
  laneDraggable: true,
  cardDraggable: true,
  cardDragClass: 'react_trello_dragClass',
  laneDragClass: 'react_trello_dragLaneClass',
  laneDropClass: '',
}

export const TrelloBoard = (props: BoardProps) => {
  // Use useRef for `id` to ensure it's stable across renders if not provided.
  // This simulates the class component's constructor behavior for 'id'.
  const boardIdRef = useRef(props.id || uuidv4());
  const boardId = boardIdRef.current;

  const { className } = props;

  return (
    <>
      {/* GlobalStyle might still be necessary if it injects global CSS,
          even if it's an empty component or points to a global stylesheet. */}
      {/* {components.GlobalStyle && <components.GlobalStyle />} */}
      <BoardContainer
        id={boardId}
        {...props}
        className={className}
      />
    </>
  );
};


const BoardContainer: React.FC<BoardProps> = (props) => {
  const {
    id,
    components,
    data, // Initial data prop
    onDataChange,
    eventBusHandle,
    handleLaneDragStart,
    handleLaneDragEnd,
    draggable,
    laneDraggable,
    laneDragClass,
    laneDropClass,
    style,
    editable,
    canAddLanes,
    laneStyle,
    t,
    ...otherProps
  } = props;

  const [addLaneMode, setAddLaneMode] = useState(false);

  // Select lanes and actions from the Zustand store
  const lanes = useBoardStore((state) => state.lanes);
  const {
    loadBoard,
    moveLane,
    addLane,
    addCard,
    updateCard,
    removeCard,
    moveCardAcrossLanes,
    updateCards,
    updateLanes,
    updateLane,
    getCardDetails,
    getLaneDetails,
  } = useBoardStore((state) => state.actions);

  // --- Effects ---

  // Effect for initial board data load
  useEffect(() => {
    loadBoard(data);
  }, [data, loadBoard]); // Depend on data and loadBoard action

  // Effect for external data changes (props.data)
  // Replaces UNSAFE_componentWillReceiveProps logic for props.data
  const prevData = useRef(data);
  useEffect(() => {
    if (!isEqual(prevData.current, data)) {
      loadBoard(data);
      onDataChange?.(data);
      prevData.current = data;
    }
  }, [data, loadBoard, onDataChange]);

  // Effect for reducerData changes (internal state updates)
  // Replaces UNSAFE_componentWillReceiveProps logic for nextProps.reducerData
  const prevLanes = useRef(lanes);
  useEffect(() => {
    if (!isEqual(prevLanes.current, lanes)) {
      onDataChange?.({ lanes }); // Notify parent of internal state changes
      prevLanes.current = lanes;
    }
  }, [lanes, onDataChange]);

  // Effect for wiring event bus
  useEffect(() => {
    if (eventBusHandle) {
      const eventBus: EventBus = {
        publish: (event: EventBusEvent) => {
          switch (event.type) {
            case 'ADD_CARD':
              return addCard(event.laneId, event.card);
            case 'UPDATE_CARD':
              return updateCard(event.laneId, event.card);
            case 'REMOVE_CARD':
              return removeCard(event.laneId, event.cardId);
            case 'REFRESH_BOARD':
              return loadBoard(event.data);
            case 'MOVE_CARD':
              return moveCardAcrossLanes(
                event.fromLaneId,
                event.toLaneId,
                event.cardId,
                event.index,
              );
            case 'UPDATE_CARDS':
              return updateCards(event.laneId, event.cards);
            case 'UPDATE_LANES':
              return updateLanes(event.lanes);
            case 'UPDATE_LANE':
              return updateLane(event.lane);
            default:
              console.warn(`Unknown event type: ${(event as any).type}`);
          }
        },
      };
      eventBusHandle(eventBus);
    }
  }, [
    eventBusHandle,
    addCard,
    updateCard,
    removeCard,
    loadBoard,
    moveCardAcrossLanes,
    updateCards,
    updateLanes,
    updateLane,
  ]);

  // --- Handlers ---

  const handleDragStartLane = ({ payload }: { payload: LaneType }) => {
    handleLaneDragStart?.(payload.id);
  };

  const handleLaneDrop = ({ removedIndex, addedIndex, payload }: any) => {
    if (removedIndex !== addedIndex && removedIndex !== null && addedIndex !== null) {
      moveLane(removedIndex, addedIndex);
      handleLaneDragEnd?.(removedIndex, addedIndex, payload);
    }
  };

  const showEditableLane = () => setAddLaneMode(true);
  const hideEditableLane = () => setAddLaneMode(false);

  const handleAddNewLane = (params: Omit<LaneType, 'cards' | 'currentPage'>) => {
    hideEditableLane();
    addLane(params);
    props.onLaneAdd?.(params); // Notify parent callback
  };

  // Group name for DND context
  const groupName = `TrelloBoard${id}`;

  // Filter out props that are specifically for BoardContainer and not Lanes
  const passthroughProps = pick(props, [
    'onCardMoveAcrossLanes',
    'onLaneScroll',
    'onLaneDelete',
    'onLaneUpdate',
    'onCardClick',
    'onBeforeCardDelete',
    'onCardDelete',
    'onCardAdd',
    'onCardUpdate',
    'onLaneClick',
    'laneSortFunction',
    'draggable',
    'laneDraggable',
    'cardDraggable',
    'collapsibleLanes',
    'canAddLanes',
    'hideCardDeleteIcon',
    'tagStyle',
    'handleDragStart',
    'handleDragEnd',
    'cardDragClass',
    'editLaneTitle',
    't',
  ]);

  return (
    <components.BoardWrapper style={style} {...otherProps} className="react-trello-board-wrapper">
      <PopoverWrapper>
        <Container
          orientation="horizontal"
          onDragStart={handleDragStartLane}
          dragClass={laneDragClass}
          dropClass={laneDropClass}
          onDrop={handleLaneDrop}
          lockAxis="x"
          getChildPayload={(index) => getBoardStoreState().actions.getLaneDetails(index)} // Access via getBoardStoreState
          groupName={groupName}
          className="flex flex-row overflow-x-auto min-h-[100px] p-2" // Tailwind for flex horizontal scroll
        >
          {lanes.map((lane, index) => {
            const { id: laneId, droppable, ...laneOtherProps } = lane;
            const laneToRender = (
              <Lane
                key={laneId}
                boardId={groupName}
                components={components}
                id={laneId}
                index={index}
                droppable={droppable === undefined ? true : droppable}
                style={laneStyle || lane.style || {}}
                labelStyle={lane.labelStyle || {}}
                cardStyle={props.cardStyle || lane.cardStyle} // cardStyle from props or lane
                editable={editable && !lane.disallowAddingCard}
                {...laneOtherProps} // Pass lane specific properties
                {...passthroughProps} // Pass all common props
                // Pass selectors explicitly as props for Lane component
                getCardDetails={getCardDetails} // From store
                t={t} // Pass translation function
              />
            );
            return draggable && laneDraggable ? (
              <Draggable key={laneId} className="flex-shrink-0"> {/* Tailwind for fixed width/flex */}
                {laneToRender}
              </Draggable>
            ) : (
              <span key={laneId} className="flex-shrink-0"> {/* Use span for non-draggable lane wrapper */}
                {laneToRender}
              </span>
            );
          })}
        </Container>
      </PopoverWrapper>
      {canAddLanes && (
        <Container orientation="horizontal" className="flex-shrink-0 p-2">
          {editable && !addLaneMode ? (
            <components.NewLaneSection t={t} onClick={showEditableLane} className="w-64" /> {/* Tailwind width */}
          ) : (
            addLaneMode && (
              <components.NewLaneForm
                onCancel={hideEditableLane}
                onAdd={handleAddNewLane}
                t={t}
                className="w-64" // Tailwind width
              />
            )
          )}
        </Container>
      )}
    </components.BoardWrapper>
  );
};

// No PropTypes needed with TypeScript, but keeping defaultProps for consistency
BoardContainer.defaultProps = {
  t: (v) => v,
  onDataChange: () => {},
  handleDragStart: () => {},
  handleDragEnd: () => {},
  handleLaneDragStart: () => {},
  handleLaneDragEnd: () => {},
  onCardUpdate: () => {},
  onLaneAdd: () => {},
  onLaneDelete: () => {},
  onCardMoveAcrossLanes: () => {},
  onLaneUpdate: () => {},
  editable: false,
  canAddLanes: false,
  hideCardDeleteIcon: false,
  draggable: false,
  collapsibleLanes: false,
  laneDraggable: true,
  cardDraggable: true,
  cardDragClass: 'react_trello_dragClass',
  laneDragClass: 'react_trello_dragLaneClass',
  laneDropClass: '',
};


export default BoardContainer;