import {
  createGlobalStore,
  type GetState,
  type SetState,
} from "../utils/store-utils";
import type { Lane, Card } from "./types";

const createBoardStore = () =>
  function store(set: SetState<typeof store>, get: GetState<typeof store>) {
    return {
      lanes: [] as Lane[],

      actions: {
        loadBoard: (boardData: { lanes: Lane[] }) =>
          set((state) => {
            state.lanes = boardData.lanes.map((lane) => {
              lane.currentPage = 1;
              lane.cards = lane.cards ?? []; // Ensure cards array exists
              lane.cards.forEach((card) => (card.laneId = lane.id));
              return lane;
            });
          }),

        addLane: (newLane: Omit<Lane, "cards" | "currentPage">) =>
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
              // Ensure laneId is set on new cards
              lane.cards = cards.map((c) => ({ ...c, laneId }));
            }
          }),

        updateLanes: (newConfiguredLanes: Lane[]) =>
          set((state) => {
            state.lanes = newConfiguredLanes.map((lane) => ({
              ...lane,
              currentPage: lane.currentPage || 1,
              cards: lane.cards || [], // Ensure cards array exists
            }));
          }),

        paginateLane: (
          laneId: string,
          newCards: Omit<Card, "laneId">[],
          nextPage: number,
        ) =>
          set((state) => {
            const lane = state.lanes.find((l) => l.id === laneId);
            if (lane) {
              const filteredNewCards = newCards
                .map((c) => ({ ...c, laneId }))
                .filter(
                  (c) =>
                    !lane.cards.some(
                      (existingCard) => existingCard.id === c.id,
                    ),
                );
              lane.cards.push(...filteredNewCards);
              lane.currentPage = nextPage;
            }
          }),

        getCardDetails: (laneId: string, cardIndex: number) => {
          const state = get();
          const lane = state.lanes.find((l) => l.id === laneId);
          return lane ? lane.cards[cardIndex] : null;
        },

        getLaneDetails: (index: number) => {
          const state = get();
          return state.lanes[index];
        },
      },
    };
  };

export const { useStore: useBoardStore } = createGlobalStore(createBoardStore);
