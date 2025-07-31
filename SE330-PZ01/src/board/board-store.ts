import { immer } from "zustand/middleware/immer";
import {
  createGlobalStore,
  type GetState,
  type SetState,
} from "../utils/store-utils";
import { v4 as uuid4 } from "uuid";
import { persist } from "zustand/middleware";
import type { ID } from "./common-types";

export interface Lane {
  id: ID;
  title: string;
  cards: ID[];

  considerCardDone: boolean;
  canRemove: boolean;

  canEditCards: boolean;
  canAddCard: boolean;
  canRemoveCards: boolean;
}

export interface Card {
  id: ID;
  laneId: ID;

  title: string;
  description: string;
}

const INIT_ITEMS_PER_LANE = 3;

function createRange<T>(
  length: number,
  initializer: (index: number) => T,
): T[] {
  return [...new Array(length)].map((_, index) => initializer(index));
}

const getDefaultLanes = (): Lane[] => {
  return [
    {
      id: uuid4(),
      title: "To Do",
      cards: [],
      considerCardDone: false,
      canRemove: true,

      canAddCard: true,
      canEditCards: true,
      canRemoveCards: true,
    },
    {
      id: uuid4(),
      title: "In Progress",
      cards: [],
      considerCardDone: false,
      canRemove: false,

      canAddCard: true,
      canEditCards: true,
      canRemoveCards: true,
    },
    {
      id: uuid4(),
      title: "Done",
      cards: [],
      considerCardDone: true,
      canRemove: false,

      canAddCard: false,
      canEditCards: false,
      canRemoveCards: true,
    }
  ]
}


export const createBoardStore = () => {
  function store(set: SetState<typeof store>, get: GetState<typeof store>) {
    return {
      lanes: [] as Lane[],
      cards: {} as Record<ID, Card>,

      actions: {
        initializeBoard: (): Record<ID, ID[]> => {
          if (get().lanes.length === 0)
            set((state) => {
              const newLanes: Lane[] = getDefaultLanes();
              const newCards: Record<ID, Card> = {};

              newLanes.forEach(({title, id: laneId, cards: laneCards}) => {
                createRange(
                  INIT_ITEMS_PER_LANE,
                  (i) => `${title.split(" ")[0]} ${i + 1}`,
                ).forEach((cardTitle) => {
                  const cardId = uuid4();
                  const newCard: Card = {
                    id: cardId,
                    laneId: laneId,
                    title: cardTitle,
                    description: "Sample description",
                  };
                  newCards[cardId] = newCard;
                  laneCards.push(cardId);
                });
              });

              const doneLane = newLanes.at(-1)!;
              doneLane.considerCardDone = true;

              state.lanes = newLanes;
              state.cards = newCards;
            });

          return Object.fromEntries(
            get().lanes.map((lane) => [lane.id, lane.cards]),
          );
        },

        addLane: (lane: Omit<Lane, "id" | "cards">): Lane => {
          const id = uuid4();
          const newLane = { id, cards: [], ...lane };
          set((state) => {
            state.lanes.push(newLane);
          });

          return newLane;
        },

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

        addCard: (card: Omit<Card, "id">, index?: number): Card => {
          const id = uuid4();

          set((state) => {
            const lane = state.lanes.find((l) => l.id === card.laneId);
            if (!lane) return;

            const newCard = { ...card, id };
            state.cards[newCard.id] = newCard;

            if (index !== undefined) {
              lane.cards.splice(index, 0, newCard.id);
            } else {
              lane.cards.push(newCard.id);
            }
          });

          return { id, ...card };
        },

        updateCard: (updatedCard: Partial<Card> & Pick<Card, "id">) =>
          set((state) => {
            if (!state.cards[updatedCard.id]) {
              return;
            }

            state.cards[updatedCard.id] = {
              ...state.cards[updatedCard.id],
              ...updatedCard,
            };
          }),

        syncBoardState: (dndItems: Record<ID, ID[]>, newLaneOrder?: ID[]) => {
          set((state) => {
            if (newLaneOrder && newLaneOrder.length > 0) {
              const reorderedLanes: Lane[] = [];
              const existingLanesMap = new Map(
                state.lanes.map((lane) => [lane.id, lane]),
              );

              newLaneOrder.forEach((laneId) => {
                const lane = existingLanesMap.get(laneId);
                if (lane) {
                  reorderedLanes.push(lane);
                  existingLanesMap.delete(laneId);
                }
              });

              existingLanesMap.forEach((lane) => reorderedLanes.push(lane));
              state.lanes = reorderedLanes;
            }

            Object.entries(dndItems).forEach(([laneId, cardIdsInOrder]) => {
              const lane = state.lanes.find((l) => l.id === laneId);
              if (lane) {
                lane.cards = cardIdsInOrder.filter(
                  (cardId) => !!state.cards[cardId],
                );

                cardIdsInOrder.forEach((cardId) => {
                  if (state.cards[cardId]) {
                    state.cards[cardId].laneId = laneId;
                  }
                });
              }
            });

            const allActiveCardIdsInDndItems = new Set<ID>();
            Object.values(dndItems).forEach((cardIds) => {
              cardIds.forEach((cardId) =>
                allActiveCardIdsInDndItems.add(cardId),
              );
            });

            Object.keys(state.cards).forEach((cardId) => {
              if (!allActiveCardIdsInDndItems.has(cardId)) {
                delete state.cards[cardId];
              }
            });

            const activeLaneIdsInDndItems = new Set<ID>(Object.keys(dndItems));
            state.lanes = state.lanes.filter((lane) =>
              activeLaneIdsInDndItems.has(lane.id),
            );
          });
        },
      },
      getters: {
        canRemoveCard: (cardId: ID) => {
          if (!get().cards[cardId]) return false
          const cardLaneId = get().cards[cardId].laneId;
          const lane = get().lanes.find((lane) => cardLaneId === lane.id);

          return lane && lane.canRemoveCards;
        },
        isCardDone: (cardId: ID) => {
          if (!get().cards[cardId]) return false
          const cardLaneId = get().cards[cardId].laneId;
          const lane = get().lanes.find((lane) => cardLaneId === lane.id);

          return lane && lane.considerCardDone;
        },
      },
    };
  }

  return immer(store);
};

const createBoardStorePersisted = () =>
  persist(createBoardStore(), {
    name: "board-store",
    version: 1,
    partialize: (state) => ({
      lanes: state.lanes,
      cards: state.cards,
    }),
  });

export const {
  useStore: useBoardStore,
  useStoreShallow: useBoardStoreShallow,
  getStoreState: getBoardState,
} = createGlobalStore(createBoardStorePersisted);

export const useLane = (laneId: ID) =>
  useBoardStoreShallow((state) =>
    state.lanes.find((lane) => lane.id === laneId),
  );

export const useCard = (cardId: ID) =>
  useBoardStoreShallow((state) => state.cards[cardId]);

export const useBoardStoreActions = () =>
  useBoardStoreShallow((state) => state.actions);

export const useBoardStoreGetters = () =>
  useBoardStoreShallow((state) => state.getters);
