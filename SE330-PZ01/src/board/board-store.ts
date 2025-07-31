import { immer } from "zustand/middleware/immer";
import {
  createGlobalStore,
  type GetState,
  type SetState,
} from "../utils/store-utils";
import { v4 as uuid4 } from "uuid";
import { persist } from "zustand/middleware";

export {uuid4};
export type ID = number | string;

export interface Lane {
  id: ID;
  title: string;
  cards: ID[];

  considerCardDone: boolean;
  canRemove: boolean;
  canRemoveCards: boolean;
}

export interface Card {
  id: ID;
  laneId: ID;

  title: string;
  description: string;
}

const INIT_LANE_TITLES = ["To Do", "In Progress", "Done"];
const INIT_ITEMS_PER_LANE = 3;

function createRange<T>(
  length: number,
  initializer: (index: number) => T,
): T[] {
  return [...new Array(length)].map((_, index) => initializer(index));
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
              const newLanes: Lane[] = [];
              const newCards: Record<ID, Card> = {};

              INIT_LANE_TITLES.forEach((title) => {
                const laneId = uuid4();
                const newLane: Lane = {
                  id: laneId,
                  title: title,
                  cards: [],
                  considerCardDone: false,
                  canRemove: false,
                  canRemoveCards: false,
                };
                newLanes.push(newLane);

                createRange(
                  INIT_ITEMS_PER_LANE,
                  (i) => `${title[0]}${i + 1}`,
                ).forEach((cardTitle) => {
                  const cardId = uuid4();
                  const newCard: Card = {
                    id: cardId,
                    laneId: laneId,
                    title: cardTitle,
                    description: "",
                  };
                  newCards[cardId] = newCard;
                  newLane.cards.push(cardId);
                });
              });

              const doneLane = newLanes.at(-1)!;
              doneLane.canRemove = true;
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

        removeLane: (laneId: ID) =>
          set((state) => {
            const laneToRemove = state.lanes.find((lane) => lane.id === laneId);

            if (laneToRemove) {
              laneToRemove.cards.forEach(cardId => {
                delete state.cards[cardId];
              });
            }

            state.lanes = state.lanes.filter((lane) => lane.id !== laneId);
          }),

          moveLane: (oldIndex: number, newIndex: number) =>
          set((state) => {
            const [movedLane] = state.lanes.splice(oldIndex, 1);
            state.lanes.splice(newIndex, 0, movedLane);
          }),

        addCard: (card: Omit<Card, "id">, index?: number) => {
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

          return id;
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

        removeCard: (cardId: ID) =>
          set((state) => {
            const card = state.cards[cardId];
            if (!card) return;

            const lane = state.lanes.find((l) => l.id === card.laneId);
            if (lane) {
              lane.cards = lane.cards.filter((id) => id !== cardId);
            }

            delete state.cards[cardId];
          }),

        moveCard: (
          fromLaneId: ID,
          toLaneId: ID,
          cardId: ID,
          index: number,
        ) =>
          set((state) => {
            const fromLane = state.lanes.find((l) => l.id === fromLaneId);
            const toLane = state.lanes.find((l) => l.id === toLaneId);
            const card = state.cards[cardId];
            if (!fromLane || !toLane || !card) return;

            if (!fromLane.cards.includes(cardId)) return;

            fromLane.cards = fromLane.cards.filter(id => id !== cardId);
            toLane.cards.splice(index, 0, cardId);
            state.cards[cardId].laneId = toLaneId;
          }),
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
