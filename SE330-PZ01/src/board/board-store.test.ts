import { describe, it, expect, beforeEach, vi } from "vitest";

import { createBoardStore } from "./board-store"; // Assuming this is where createBoardStore is
import { createStore } from "zustand";
import { v4 as uuid4 } from "uuid";
import type { ID } from "./common-types";

// Mock uuid for predictable IDs in tests
vi.mock("uuid", () => ({
  v4: vi.fn(),
}));

// Helper to create a non-persisted store instance for testing
// This helps isolate the store's logic from persistence issues during unit tests
const createTestStore = () => {
  // Use createGlobalStore for consistency, but wrap the core logic without persistence
  return createStore(createBoardStore());
};

describe("createBoardStore", () => {
  let getTestStoreState: () => ReturnType<ReturnType<typeof createBoardStore>>;

  // Mock UUIDs for predictable testing
  const mockLaneId1 = "lane-1"; // To Do
  const mockLaneId2 = "lane-2"; // In Progress
  const mockLaneId3 = "lane-3"; // Done

  const mockCardId1 = "card-1"; // T1 (lane-1)
  const mockCardId2 = "card-2"; // T2 (lane-1)
  const mockCardId3 = "card-3"; // T3 (lane-1)

  const mockCardId4 = "card-4"; // I1 (lane-2)
  const mockCardId5 = "card-5"; // I2 (lane-2)
  const mockCardId6 = "card-6"; // I3 (lane-2)

  const mockCardId7 = "card-7"; // D1 (lane-3)
  const mockCardId8 = "card-8"; // D2 (lane-3)
  const mockCardId9 = "card-9"; // D3 (lane-3)

  beforeEach(() => {
    // Reset Zustand store state before each test
    // This is crucial for isolated tests
    vi.clearAllMocks();
    const store = createTestStore();

    getTestStoreState = () => store.getState();

    // Reset UUID mocks for each test with a consistent sequence
    let uuidCount = 0;
    vi.mocked(uuid4).mockImplementation(() => {
      uuidCount++;
      switch (uuidCount) {
        case 1:
          return mockLaneId1; // To Do Lane
        case 2:
          return mockLaneId2; // In Progress Lane
        case 3:
          return mockLaneId3; // Done Lane
        case 4:
          return mockCardId1; // T1
        case 5:
          return mockCardId2; // T2
        case 6:
          return mockCardId3; // T3
        case 7:
          return mockCardId4; // I1
        case 8:
          return mockCardId5; // I2
        case 9:
          return mockCardId6; // I3
        case 10:
          return mockCardId7; // D1
        case 11:
          return mockCardId8; // D2
        case 12:
          return mockCardId9; // D3
        default:
          return `mock-uuid-extra-${uuidCount}`; // Fallback for unexpected calls
      }
    });
  });

  // Test initializeBoard
  describe("initializeBoard", () => {
    it("should initialize the board with default lanes and cards if empty", () => {
      const { actions } = getTestStoreState();
      const initialMap = actions.initializeBoard();

      const state = getTestStoreState();

      expect(state.lanes).toHaveLength(3);

      // Verify "To Do" lane properties
      expect(state.lanes[0].title).toBe("To Do");
      expect(state.lanes[0].canRemove).toBe(true);
      expect(state.lanes[0].considerCardDone).toBe(false);
      expect(state.lanes[0].canAddCard).toBe(true);
      expect(state.lanes[0].canEditCards).toBe(true);
      expect(state.lanes[0].canRemoveCards).toBe(true);

      // Verify "In Progress" lane properties
      expect(state.lanes[1].title).toBe("In Progress");
      expect(state.lanes[1].canRemove).toBe(false);
      expect(state.lanes[1].considerCardDone).toBe(false);
      expect(state.lanes[1].canAddCard).toBe(true);
      expect(state.lanes[1].canEditCards).toBe(true);
      expect(state.lanes[1].canRemoveCards).toBe(true);

      // Verify "Done" lane properties
      expect(state.lanes[2].title).toBe("Done");
      expect(state.lanes[2].canRemove).toBe(false); // Can't remove "Done" lane
      expect(state.lanes[2].considerCardDone).toBe(true);
      expect(state.lanes[2].canAddCard).toBe(false); // Can't add cards to "Done" lane
      expect(state.lanes[2].canEditCards).toBe(false); // Can't edit cards in "Done" lane
      expect(state.lanes[2].canRemoveCards).toBe(true);

      expect(Object.keys(state.cards)).toHaveLength(9); // 3 lanes * 3 cards/lane

      state.lanes.forEach((lane) => {
        expect(lane.cards).toHaveLength(3);
        lane.cards.forEach((cardId) => {
          expect(state.cards[cardId]).toBeDefined();
          expect(state.cards[cardId].laneId).toBe(lane.id);
        });
      });

      // Check returned map
      expect(initialMap).toEqual(
        Object.fromEntries(state.lanes.map((lane) => [lane.id, lane.cards])),
      );
    });

    it("should not re-initialize if lanes already exist", () => {
      const { actions } = getTestStoreState();

      // Manually add a lane to simulate existing state with default new properties
      actions.addLane({
        title: "Existing Lane",
        canRemove: false,
        considerCardDone: false,
        canAddCard: true,
        canEditCards: true,
        canRemoveCards: true,
      });
      const stateBeforeInit = getTestStoreState();
      expect(stateBeforeInit.lanes).toHaveLength(1);

      actions.initializeBoard(); // Call initialize

      const stateAfterInit = getTestStoreState();
      expect(stateAfterInit.lanes).toHaveLength(1); // Should still be 1, not reset to 3
      expect(stateAfterInit.lanes[0].title).toBe("Existing Lane");
    });
  });

  // Test addLane
  describe("addLane", () => {
    it("should add a new lane to the state with default new properties", () => {
      const { actions } = getTestStoreState();
      const newLane = actions.addLane({
        title: "Test Lane",
        considerCardDone: false,
        canRemove: true,
        canAddCard: false,
        canEditCards: false,
        canRemoveCards: false,
      });

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(1);
      expect(state.lanes[0]).toEqual({
        id: newLane.id, // Expecting the mocked UUID
        title: "Test Lane",
        cards: [],
        considerCardDone: false,
        canRemove: true,
        canAddCard: false,
        canEditCards: false,
        canRemoveCards: false,
      });
      expect(newLane.id).toBe(mockLaneId1); // Confirm UUID mock was used
    });
  });

  // Test updateLane
  describe("updateLane", () => {
    it("should update an existing lane including new properties", () => {
      const { actions } = getTestStoreState();
      actions.addLane({
        title: "Original Title",
        considerCardDone: false,
        canRemove: false,
        canAddCard: true,
        canEditCards: true,
        canRemoveCards: true,
      });
      const initialLaneId = getTestStoreState().lanes[0].id;

      actions.updateLane({
        id: initialLaneId,
        title: "Updated Title",
        canRemove: true,
        canAddCard: false,
        canEditCards: false,
      });

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(1);
      expect(state.lanes[0].title).toBe("Updated Title");
      expect(state.lanes[0].canRemove).toBe(true);
      expect(state.lanes[0].considerCardDone).toBe(false); // Should remain unchanged
      expect(state.lanes[0].canAddCard).toBe(false); // Updated
      expect(state.lanes[0].canEditCards).toBe(false); // Updated
      expect(state.lanes[0].canRemoveCards).toBe(true); // Should remain unchanged
    });

    it("should do nothing if lane id does not exist", () => {
      const { actions } = getTestStoreState();
      actions.addLane({
        title: "Original Title",
        considerCardDone: false,
        canRemove: false,
        canAddCard: true,
        canEditCards: true,
        canRemoveCards: true,
      });
      const stateBefore = getTestStoreState();
      expect(stateBefore.lanes).toHaveLength(1);

      actions.updateLane({
        id: "non-existent-id",
        title: "Should Not Update",
        canAddCard: false,
      });

      const stateAfter = getTestStoreState();
      expect(stateAfter.lanes).toEqual(stateBefore.lanes); // State should be unchanged
    });
  });

  // Test addCard
  describe("addCard", () => {
    let laneId: ID;
    beforeEach(() => {
      // Re-mock uuid4 specifically for this describe block to control the sequence
      let localUuidCount = 0;
      vi.mocked(uuid4).mockImplementation(() => {
        localUuidCount++;

        if (localUuidCount === 1) return mockLaneId1; // For the lane creation
        if (localUuidCount === 2) return mockCardId1;
        if (localUuidCount === 3) return mockCardId2;
        if (localUuidCount === 4) return mockCardId3;

        return `local-mock-uuid-${localUuidCount}`;
      });

      const { actions } = getTestStoreState();
      const newLane = actions.addLane({
        title: "Test Lane",
        considerCardDone: false,
        canRemove: false,
        canAddCard: true,
        canEditCards: true,
        canRemoveCards: true,
      });
      laneId = newLane.id;
    });

    it("should add a new card to a lane at the end", () => {
      const { actions } = getTestStoreState();
      const newCard = actions.addCard({
        laneId: laneId,
        title: "New Card",
        description: "New Description",
      });

      const state = getTestStoreState();
      expect(state.cards[newCard.id]).toEqual({
        id: newCard.id,
        laneId: laneId,
        title: "New Card",
        description: "New Description",
      });

      const lane = state.lanes.find((l) => l.id === laneId);
      expect(lane?.cards).toHaveLength(1);
      expect(lane?.cards[0]).toBe(newCard.id);
      expect(newCard.id).toBe(mockCardId1);
    });

    it("should add a new card to a lane at a specific index", () => {
      const { actions } = getTestStoreState();
      actions.addCard({ laneId, title: "Card 1", description: "" });
      actions.addCard({ laneId, title: "Card 2", description: "" });

      const newCard = actions.addCard(
        { laneId, title: "Inserted Card", description: "" },
        1,
      );

      const state = getTestStoreState();
      const lane = state.lanes.find((l) => l.id === laneId);
      expect(lane?.cards).toHaveLength(3);
      expect(lane?.cards[1]).toBe(newCard.id);
      expect(lane?.cards[0]).not.toBe(newCard.id);
      expect(lane?.cards[2]).not.toBe(newCard.id);
    });

    it("should do nothing if lane not found", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.addCard({
        laneId: "non-existent-lane",
        title: "Card",
        description: "",
      });
      const stateAfter = getTestStoreState();
      expect(stateAfter.cards).toEqual(stateBefore.cards);
      expect(stateAfter.lanes).toEqual(stateBefore.lanes);
    });
  });

  // Test updateCard
  describe("updateCard", () => {
    let laneId: ID;
    let cardId: ID;
    beforeEach(() => {
      const { actions } = getTestStoreState();
      const newLane = actions.addLane({
        title: "Test Lane",
        considerCardDone: false,
        canRemove: false,
        canAddCard: true,
        canEditCards: true,
        canRemoveCards: true,
      });
      laneId = newLane.id;
      const newCard = actions.addCard({
        laneId,
        title: "Initial Title",
        description: "Initial Desc",
      });
      cardId = newCard.id;
    });

    it("should update an existing card", () => {
      const { actions } = getTestStoreState();
      actions.updateCard({
        id: cardId,
        title: "Updated Title",
        description: "Updated Desc",
      });

      const state = getTestStoreState();
      expect(state.cards[cardId].title).toBe("Updated Title");
      expect(state.cards[cardId].description).toBe("Updated Desc");
      expect(state.cards[cardId].laneId).toBe(laneId); // laneId should remain unchanged
    });

    it("should handle partial updates", () => {
      const { actions } = getTestStoreState();
      actions.updateCard({ id: cardId, title: "Only Title Updated" });

      const state = getTestStoreState();
      expect(state.cards[cardId].title).toBe("Only Title Updated");
      expect(state.cards[cardId].description).toBe("Initial Desc"); // Description should be unchanged
    });

    it("should do nothing if card id does not exist", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.updateCard({
        id: "non-existent-card",
        title: "Should Not Update",
      });
      const stateAfter = getTestStoreState();
      expect(stateAfter.cards).toEqual(stateBefore.cards);
    });
  });
});


describe("createBoardStore - Sync Board State and Getters", () => {
  let getTestStoreState: () => ReturnType<ReturnType<typeof createBoardStore>>;

  const mockLaneId1 = "lane-1"; // To Do
  const mockLaneId2 = "lane-2"; // In Progress
  const mockLaneId3 = "lane-3"; // Done

  const mockCardId1 = "card-1"; // T1 (lane-1)
  const mockCardId2 = "card-2"; // T2 (lane-1)
  const mockCardId3 = "card-3"; // T3 (lane-1)

  const mockCardId4 = "card-4"; // I1 (lane-2)
  const mockCardId5 = "card-5"; // I2 (lane-2)
  const mockCardId6 = "card-6"; // I3 (lane-2)

  const mockCardId7 = "card-7"; // D1 (lane-3)
  const mockCardId8 = "card-8"; // D2 (lane-3)
  const mockCardId9 = "card-9"; // D3 (lane-3)

  beforeEach(() => {
    vi.clearAllMocks();
    const store = createTestStore();
    getTestStoreState = () => store.getState();

    // Reset UUID mocks for each test with a consistent sequence
    let uuidCount = 0;
    vi.mocked(uuid4).mockImplementation(() => {
      uuidCount++;
      switch (uuidCount) {
        case 1:
          return mockLaneId1; // To Do Lane
        case 2:
          return mockLaneId2; // In Progress Lane
        case 3:
          return mockLaneId3; // Done Lane
        case 4:
          return mockCardId1; // T1
        case 5:
          return mockCardId2; // T2
        case 6:
          return mockCardId3; // T3
        case 7:
          return mockCardId4; // I1
        case 8:
          return mockCardId5; // I2
        case 9:
          return mockCardId6; // I3
        case 10:
          return mockCardId7; // D1
        case 11:
          return mockCardId8; // D2
        case 12:
          return mockCardId9; // D3
        default:
          return `mock-uuid-extra-${uuidCount}`; // Fallback for unexpected calls
      }
    });

    // Initialize the board for each test to have a consistent starting point
    getTestStoreState().actions.initializeBoard();
  });

  describe("syncBoardState", () => {
    it("should not change state if dndItems reflects current state with no order change", () => {
      const stateBefore = getTestStoreState();
      const initialDndItems = {
        [mockLaneId1]: [mockCardId1, mockCardId2, mockCardId3],
        [mockLaneId2]: [mockCardId4, mockCardId5, mockCardId6],
        [mockLaneId3]: [mockCardId7, mockCardId8, mockCardId9],
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      getTestStoreState().actions.syncBoardState(
        initialDndItems,
        initialLaneOrder,
      );

      const stateAfter = getTestStoreState();
      expect(stateAfter.lanes).toEqual(stateBefore.lanes);
      expect(stateAfter.cards).toEqual(stateBefore.cards);
    });

    it("should move a card within the same lane", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId2, mockCardId1, mockCardId3], // T1 and T2 swapped
        [mockLaneId2]: [mockCardId4, mockCardId5, mockCardId6],
        [mockLaneId3]: [mockCardId7, mockCardId8, mockCardId9],
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      actions.syncBoardState(dndItems, initialLaneOrder);

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === mockLaneId1);
      expect(lane1?.cards).toEqual([mockCardId2, mockCardId1, mockCardId3]);
      expect(state.cards[mockCardId1].laneId).toBe(mockLaneId1);
      expect(state.cards[mockCardId2].laneId).toBe(mockLaneId1);
    });

    it("should move a card to a different lane and update its laneId", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId2, mockCardId3], // T1 moved out
        [mockLaneId2]: [mockCardId4, mockCardId1, mockCardId5, mockCardId6], // T1 moved here
        [mockLaneId3]: [mockCardId7, mockCardId8, mockCardId9],
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      actions.syncBoardState(dndItems, initialLaneOrder);

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === mockLaneId1);
      const lane2 = state.lanes.find((l) => l.id === mockLaneId2);

      expect(lane1?.cards).toEqual([mockCardId2, mockCardId3]);
      expect(lane2?.cards).toEqual([
        mockCardId4,
        mockCardId1,
        mockCardId5,
        mockCardId6,
      ]);
      expect(state.cards[mockCardId1].laneId).toBe(mockLaneId2); // LaneId updated
    });

    it("should reorder lanes correctly", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId1, mockCardId2, mockCardId3],
        [mockLaneId2]: [mockCardId4, mockCardId5, mockCardId6],
        [mockLaneId3]: [mockCardId7, mockCardId8, mockCardId9],
      };
      const newLaneOrder = [mockLaneId2, mockLaneId3, mockLaneId1]; // Swap order

      actions.syncBoardState(dndItems, newLaneOrder);

      const state = getTestStoreState();
      expect(state.lanes.map((l) => l.id)).toEqual(newLaneOrder);
      expect(state.lanes[0].title).toBe("In Progress");
      expect(state.lanes[1].title).toBe("Done");
      expect(state.lanes[2].title).toBe("To Do");
    });

    it("should handle both lane reorder and card movement simultaneously", () => {
      const { actions } = getTestStoreState();
      // New lane order: Done, To Do, In Progress
      const newLaneOrder = [mockLaneId3, mockLaneId1, mockLaneId2];

      // Cards: T1 moved to Done, D1 moved to To Do
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId2, mockCardId3, mockCardId7], // T2, T3, D1
        [mockLaneId2]: [mockCardId4, mockCardId5, mockCardId6], // I1, I2, I3 (unchanged)
        [mockLaneId3]: [mockCardId8, mockCardId9, mockCardId1], // D2, D3, T1
      };

      actions.syncBoardState(dndItems, newLaneOrder);

      const state = getTestStoreState();
      expect(state.lanes.map((l) => l.id)).toEqual(newLaneOrder);

      const laneDone = state.lanes.find((l) => l.id === mockLaneId3); // Now first
      const laneTodo = state.lanes.find((l) => l.id === mockLaneId1); // Now second
      const laneInProgress = state.lanes.find((l) => l.id === mockLaneId2); // Now third

      expect(laneDone?.cards).toEqual([mockCardId8, mockCardId9, mockCardId1]);
      expect(state.cards[mockCardId1].laneId).toBe(mockLaneId3); // T1 now in Done lane

      expect(laneTodo?.cards).toEqual([mockCardId2, mockCardId3, mockCardId7]);
      expect(state.cards[mockCardId7].laneId).toBe(mockLaneId1); // D1 now in To Do lane

      expect(laneInProgress?.cards).toEqual([
        mockCardId4,
        mockCardId5,
        mockCardId6,
      ]);
    });

    it("should remove cards that are not present in dndItems", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId1, mockCardId2], // T3 removed
        [mockLaneId2]: [mockCardId4, mockCardId5], // I3 removed
        [mockLaneId3]: [mockCardId7], // D2, D3 removed
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      actions.syncBoardState(dndItems, initialLaneOrder);

      const state = getTestStoreState();
      expect(state.cards[mockCardId3]).toBeUndefined();
      expect(state.cards[mockCardId6]).toBeUndefined();
      expect(state.cards[mockCardId8]).toBeUndefined();
      expect(state.cards[mockCardId9]).toBeUndefined();
      expect(Object.keys(state.cards)).toHaveLength(5); // 9 initial - 4 removed

      const lane1 = state.lanes.find((l) => l.id === mockLaneId1);
      expect(lane1?.cards).toEqual([mockCardId1, mockCardId2]);
    });

    it("should remove lanes that are not present in dndItems keys or newLaneOrder", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId1, mockCardId2, mockCardId3],
      };
      const newLaneOrder = [mockLaneId1]; // Only lane 1 remains

      actions.syncBoardState(dndItems, newLaneOrder);

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(1);
      expect(state.lanes[0].id).toBe(mockLaneId1);

      // Cards from removed lanes should also be gone
      expect(state.cards[mockCardId4]).toBeUndefined();
      expect(state.cards[mockCardId7]).toBeUndefined();
      expect(Object.keys(state.cards)).toHaveLength(3); // Only cards from lane-1
    });

    it("should handle empty dndItems (all cards removed)", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [],
        [mockLaneId2]: [],
        [mockLaneId3]: [],
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      actions.syncBoardState(dndItems, initialLaneOrder);

      const state = getTestStoreState();
      expect(state.lanes.every((lane) => lane.cards.length === 0)).toBe(true);
      expect(Object.keys(state.cards)).toHaveLength(0); // All cards removed
      expect(state.lanes).toHaveLength(3); // Lanes still exist if in dndItems keys
    });

    it("should handle empty newLaneOrder (no lane order change)", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId2, mockCardId1], // Card order change
        [mockLaneId2]: [mockCardId4, mockCardId5, mockCardId6],
        [mockLaneId3]: [mockCardId7, mockCardId8, mockCardId9],
      };
      const newLaneOrder: ID[] = []; // Empty array

      const stateBeforeLaneOrder = getTestStoreState().lanes.map((l) => l.id);
      actions.syncBoardState(dndItems, newLaneOrder);
      const stateAfter = getTestStoreState();

      // Lane order should remain the same as before if newLaneOrder is empty
      expect(stateAfter.lanes.map((l) => l.id)).toEqual(stateBeforeLaneOrder);
      // Card changes should still apply
      const lane1 = stateAfter.lanes.find((l) => l.id === mockLaneId1);
      expect(lane1?.cards).toEqual([mockCardId2, mockCardId1]);
    });

    it("should handle a new lane being added in localItems (not by addLane action)", () => {
      const { actions } = getTestStoreState();
      const newLocalLaneId = "new-local-lane";
      const newLocalCardId = "new-local-card";

      // Simulate a scenario where a new lane/card appears in dndItems that wasn't created via addLane/addCard actions
      // This usually shouldn't happen with the DND-Kit integration as currently structured,
      // but testing robustness of `syncBoardState`.
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId1],
        [newLocalLaneId]: [newLocalCardId], // This lane/card doesn't exist in the store yet
      };
      const newLaneOrder = [mockLaneId1, newLocalLaneId];

      const stateBefore = getTestStoreState();
      // Ensure the new local IDs do not exist in the store initially
      expect(stateBefore.lanes.some((l) => l.id === newLocalLaneId)).toBe(
        false,
      );
      expect(stateBefore.cards[newLocalCardId]).toBeUndefined();

      actions.syncBoardState(dndItems, newLaneOrder);

      const stateAfter = getTestStoreState();
      // The `syncBoardState` should **not** create new lanes/cards if they don't exist in the store.
      // It only reorders/reassigns existing ones and removes missing ones.
      expect(stateAfter.lanes.map((l) => l.id)).not.toContain(newLocalLaneId);
      expect(stateAfter.lanes).toHaveLength(1); // Only mockLaneId1 should remain from the original
      expect(stateAfter.cards[newLocalCardId]).toBeUndefined();
      expect(stateAfter.cards).toHaveProperty(mockCardId1);

      const lane1 = stateAfter.lanes.find((l) => l.id === mockLaneId1);
      expect(lane1?.cards).toEqual([mockCardId1]);
    });
  });

  // New tests for getters
  describe("getters", () => {
    // Note: beforeEach initializes the board with default lanes and cards
    // Lane 1 (To Do): canRemoveCards = true, considerCardDone = false
    // Lane 2 (In Progress): canRemoveCards = true, considerCardDone = false
    // Lane 3 (Done): canRemoveCards = true, considerCardDone = true

    it("canRemoveCard: should return true if the lane allows card removal", () => {
      const { getters } = getTestStoreState();

      // Card in 'To Do' lane (mockLaneId1), which has canRemoveCards: true
      expect(getters.canRemoveCard(mockCardId1)).toBe(true);
      // Card in 'In Progress' lane (mockLaneId2), which has canRemoveCards: true
      expect(getters.canRemoveCard(mockCardId4)).toBe(true);
      // Card in 'Done' lane (mockLaneId3), which has canRemoveCards: true
      expect(getters.canRemoveCard(mockCardId7)).toBe(true);
    });

    it("canRemoveCard: should return false if the card or lane does not exist", () => {
      const { getters } = getTestStoreState();
      expect(getters.canRemoveCard("non-existent-card")).toBe(false);

      // Temporarily remove a lane to test non-existent lane
      const { actions } = getTestStoreState();
      actions.syncBoardState(
        { [mockLaneId1]: [mockCardId1, mockCardId2, mockCardId3] },
        [mockLaneId1],
      ); // Remove lane2 and lane3

      // Now, try to check a card that was in a removed lane
      expect(getTestStoreState().cards[mockCardId4]).toBeUndefined(); // Ensure it's gone
      expect(getters.canRemoveCard(mockCardId4)).toBe(false);
    });

    it("isCardDone: should return true if the card is in a 'Done' lane", () => {
      const { getters } = getTestStoreState();
      // Card in 'Done' lane (mockLaneId3)
      expect(getters.isCardDone(mockCardId7)).toBe(true);
      expect(getters.isCardDone(mockCardId8)).toBe(true);
      expect(getters.isCardDone(mockCardId9)).toBe(true);
    });

    it("isCardDone: should return false if the card is not in a 'Done' lane", () => {
      const { getters } = getTestStoreState();
      // Card in 'To Do' lane (mockLaneId1)
      expect(getters.isCardDone(mockCardId1)).toBe(false);
      // Card in 'In Progress' lane (mockLaneId2)
      expect(getters.isCardDone(mockCardId4)).toBe(false);
    });

    it("isCardDone: should return false if the card or lane does not exist", () => {
      const { getters } = getTestStoreState();
      expect(getters.isCardDone("non-existent-card")).toBe(false);

      // Temporarily remove a lane to test non-existent lane
      const { actions } = getTestStoreState();
      actions.syncBoardState(
        { [mockLaneId1]: [mockCardId1, mockCardId2, mockCardId3] },
        [mockLaneId1],
      ); // Remove lane2 and lane3

      // Now, try to check a card that was in a removed lane
      expect(getTestStoreState().cards[mockCardId7]).toBeUndefined(); // Ensure it's gone
      expect(getters.isCardDone(mockCardId7)).toBe(false);
    });
  });
});