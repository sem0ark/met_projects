import {
  createGlobalStore,
  type GetState,
  type SetState,
} from "../utils/store-utils";


export interface Lane {
  id: string;
  title?: string;
  cards: Card[];
  droppable?: boolean;
  disallowAddingCard?: boolean;
}

export interface Card {
  id: string;
  title?: string;
  description?: string;
  laneId?: string;
  draggable?: boolean;
}


const createBoardStore = () =>
  function store(set: SetState<typeof store>, get: GetState<typeof store>) {
    return {
      lanes: [] as Lane[],

      actions: {
        loadBoard: (boardData: { lanes: Lane[] }) =>
          set((state) => {
            state.lanes = boardData.lanes.map((lane) => {
              lane.cards = lane.cards ?? [];
              lane.cards.forEach((card) => (card.laneId = lane.id));
              return lane;
            });
          }),

        addLane: (newLane: Omit<Lane, "cards">) =>
          set((state) => {
            state.lanes.push({ cards: [], ...newLane });
          }),

        updateLane: (updatedLane: Partial<Lane> & Pick<Lane, "id">) =>
          set((state) => {
            const laneIndex = state.lanes.findIndex(
              (lane) => lane.id === updatedLane.id,
            );
            if (laneIndex !== -1) {
              state.lanes[laneIndex] = {
                ...state.lanes[laneIndex],
                ...updatedLane,
              };
            }
          }),

        removeLane: (laneId: string) =>
          set((state) => {
            state.lanes = state.lanes.filter((lane) => lane.id !== laneId);
          }),

        moveLane: (oldIndex: number, newIndex: number) =>
          set((state) => {
            const [movedLane] = state.lanes.splice(oldIndex, 1);
            state.lanes.splice(newIndex, 0, movedLane);
          }),

        addCard: (laneId: string, card: Card, index?: number) =>
          set((state) => {
            const lane = state.lanes.find((l) => l.id === laneId);
            if (lane) {
              const newCard = { ...card, laneId };
              if (index !== undefined) {
                lane.cards.splice(index, 0, newCard);
              } else {
                lane.cards.push(newCard);
              }
            }
          }),

        updateCard: (
          laneId: string,
          updatedCard: Partial<Card> & Pick<Card, "id">,
        ) =>
          set((state) => {
            const lane = state.lanes.find((l) => l.id === laneId);
            if (lane) {
              const cardIndex = lane.cards.findIndex(
                (c) => c.id === updatedCard.id,
              );
              if (cardIndex !== -1) {
                lane.cards[cardIndex] = {
                  ...lane.cards[cardIndex],
                  ...updatedCard,
                };
              }
            }
          }),

        removeCard: (laneId: string, cardId: string) =>
          set((state) => {
            const lane = state.lanes.find((l) => l.id === laneId);
            if (lane) {
              lane.cards = lane.cards.filter((card) => card.id !== cardId);
            }
          }),

        moveCardAcrossLanes: (
          fromLaneId: string,
          toLaneId: string,
          cardId: string,
          index: number,
        ) =>
          set((state) => {
            const fromLane = state.lanes.find((l) => l.id === fromLaneId);
            const toLane = state.lanes.find((l) => l.id === toLaneId);

            if (fromLane && toLane) {
              const cardIndex = fromLane.cards.findIndex(
                (card) => card.id === cardId,
              );
              if (cardIndex !== -1) {
                const [movedCard] = fromLane.cards.splice(cardIndex, 1);
                movedCard.laneId = toLaneId; // Update laneId of the moved card
                toLane.cards.splice(index, 0, movedCard);
              }
            }
          }),

        updateCards: (laneId: string, cards: Card[]) =>
          set((state) => {
            const lane = state.lanes.find((l) => l.id === laneId);
            if (lane) {
              lane.cards = cards.map((c) => ({ ...c, laneId }));
            }
          }),

        updateLanes: (newConfiguredLanes: Lane[]) =>
          set((state) => {
            state.lanes = newConfiguredLanes.map((lane) => ({
              ...lane,
              cards: lane.cards ?? [], // Ensure cards array exists
            }));
          }),
      },

      getCardDetails: (laneId: string, cardIndex: number) => {
        const state = get();
        const lane = state.lanes.find((l) => l.id === laneId);
        return lane ? lane.cards[cardIndex] : null;
      },

      getLaneDetails: (index: number) => {
        const state = get();
        return state.lanes[index];
      },

      getLaneById: (laneId: string) => {
        const state = get();
        return state.lanes.find((lane) => lane.id === laneId);
      },

      getAllLaneIds: () => {
        const state = get();
        return state.lanes.map((lane) => lane.id);
      },

      getCardsByLaneId: (laneId: string) => {
        const state = get();
        return state.lanes.find((lane) => lane.id === laneId)?.cards || [];
      },
    };
  };


const { useStore: useBoardStore } = createGlobalStore(createBoardStore);

export const useLanes = () => useBoardStore((state) => state.lanes);
export const useLaneById = (laneId: string) => useBoardStore((state) => state.getLaneById(laneId));
export const useCardsByLaneId = (laneId: string) => useBoardStore((state) => state.getCardsByLaneId(laneId));
export const useCardDetails = (laneId: string, cardIndex: number) => useBoardStore((state) => state.getCardDetails(laneId, cardIndex));
export const useAllLaneIds = () => useBoardStore((state) => state.getAllLaneIds());
export const useBoardStoreActions = () => useBoardStore((state) => state.actions);
