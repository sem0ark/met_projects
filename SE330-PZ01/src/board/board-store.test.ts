import { describe, it, expect, beforeEach, vi } from "vitest";

import { createBoardStore } from "./board-store";
import { createStore } from "zustand";
import { v4 as uuid4 } from "uuid";

// Mock uuid for predictable IDs in tests
vi.mock("uuid", () => ({
  v4: vi.fn(),
}));

type ID = number | string;

// Helper to create a non-persisted store instance for testing
// This helps isolate the store's logic from persistence issues during unit tests
const createTestStore = () => {
  // Use createGlobalStore for consistency, but wrap the core logic without persistence
  return createStore(createBoardStore());
};

describe("createBoardStore", () => {
  let getTestStoreState: () => ReturnType<ReturnType<typeof createBoardStore>>;

  // Mock UUIDs for predictable testing
  const mockLaneId1 = "lane-1";
  const mockLaneId2 = "lane-2";
  const mockLaneId3 = "lane-3"; // For "Done" lane
  const mockCardId1 = "card-1";
  const mockCardId2 = "card-2";
  const mockCardId3 = "card-3";
  const mockCardId4 = "card-4";
  const mockCardId5 = "card-5";
  const mockCardId6 = "card-6";
  const mockCardId7 = "card-7";
  const mockCardId8 = "card-8";
  const mockCardId9 = "card-9";

  beforeEach(() => {
    // Reset Zustand store state before each test
    // This is crucial for isolated tests
    vi.clearAllMocks();
    const store = createTestStore();

    getTestStoreState = () => store.getState();

    // Reset UUID mocks for each test
    let uuidCount = 0;
    vi.mocked(uuid4).mockImplementation(() => {
      uuidCount++;
      // Provide predictable, distinct UUIDs based on call order
      // You might need to adjust this if many UUIDs are generated in a single action
      if (uuidCount === 1) return mockLaneId1;
      if (uuidCount === 2) return mockLaneId2;
      if (uuidCount === 3) return mockLaneId3; // The "Done" lane

      // Cards for lane 1
      if (uuidCount === 4) return mockCardId1;
      if (uuidCount === 5) return mockCardId2;
      if (uuidCount === 6) return mockCardId3;

      // Cards for lane 2
      if (uuidCount === 7) return mockCardId4;
      if (uuidCount === 8) return mockCardId5;
      if (uuidCount === 9) return mockCardId6;

      // Cards for lane 3
      if (uuidCount === 10) return mockCardId7;
      if (uuidCount === 11) return mockCardId8;
      if (uuidCount === 12) return mockCardId9;

      return `mock-uuid-${uuidCount}`;
    });
  });

  // Test initializeBoard
  describe("initializeBoard", () => {
    it("should initialize the board with default lanes and cards if empty", () => {
      const { actions } = getTestStoreState();
      const initialMap = actions.initializeBoard();

      const state = getTestStoreState();

      expect(state.lanes).toHaveLength(3);
      expect(state.lanes[0].title).toBe("To Do");
      expect(state.lanes[1].title).toBe("In Progress");
      expect(state.lanes[2].title).toBe("Done");

      // Check "Done" lane properties
      expect(state.lanes[2].canRemove).toBe(true);
      expect(state.lanes[2].considerCardDone).toBe(true);

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

      // Manually add a lane to simulate existing state
      actions.addLane({
        title: "Existing Lane",
        canRemove: false,
        considerCardDone: false,
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
    it("should add a new lane to the state", () => {
      const { actions } = getTestStoreState();
      const newLane = actions.addLane({
        title: "Test Lane",
        considerCardDone: false,
        canRemove: true,
        canRemoveCards: true,
      });

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(1);
      expect(state.lanes[0]).toEqual({
        id: newLane.id, // Expecting the mocked UUID
        title: "Test Lane",
        cards: [],
        considerCardDone: false,
        canRemove: true,
        canRemoveCards: true,
      });
      expect(newLane.id).toBe(mockLaneId1); // Confirm UUID mock was used
    });
  });

  // Test updateLane
  describe("updateLane", () => {
    it("should update an existing lane", () => {
      const { actions } = getTestStoreState();
      actions.addLane({
        title: "Original Title",
        considerCardDone: false,
        canRemove: false,
        canRemoveCards: true,
      });
      const initialLaneId = getTestStoreState().lanes[0].id;

      actions.updateLane({
        id: initialLaneId,
        title: "Updated Title",
        canRemove: true,
      });

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(1);
      expect(state.lanes[0].title).toBe("Updated Title");
      expect(state.lanes[0].canRemove).toBe(true);
      expect(state.lanes[0].considerCardDone).toBe(false); // Should remain unchanged
    });

    it("should do nothing if lane id does not exist", () => {
      const { actions } = getTestStoreState();
      actions.addLane({
        title: "Original Title",
        considerCardDone: false,
        canRemove: false,
        canRemoveCards: true,
      });
      const stateBefore = getTestStoreState();
      expect(stateBefore.lanes).toHaveLength(1);

      actions.updateLane({ id: "non-existent-id", title: "Should Not Update" });

      const stateAfter = getTestStoreState();
      expect(stateAfter.lanes).toEqual(stateBefore.lanes); // State should be unchanged
    });
  });

  // Test removeLane
  describe("removeLane", () => {
    it("should remove a lane and its associated cards", () => {
      const { actions } = getTestStoreState();
      actions.initializeBoard(); // Initialize with default data

      const initialState = getTestStoreState();
      expect(initialState.lanes).toHaveLength(3);
      expect(Object.keys(initialState.cards)).toHaveLength(9);

      const laneToRemoveId = initialState.lanes[0].id; // Get ID of the first lane
      const cardsInLaneToRemove = initialState.lanes[0].cards;

      actions.removeLane(laneToRemoveId);

      const state = getTestStoreState();
      expect(state.lanes).toHaveLength(2);
      expect(
        state.lanes.find((lane) => lane.id === laneToRemoveId),
      ).toBeUndefined();
      expect(Object.keys(state.cards)).toHaveLength(6); // 9 - 3 cards = 6

      cardsInLaneToRemove.forEach((cardId) => {
        expect(state.cards[cardId]).toBeUndefined(); // Cards should be removed from the map
      });
    });

    it("should do nothing if lane id does not exist", () => {
      const { actions } = getTestStoreState();
      actions.initializeBoard();
      const stateBefore = getTestStoreState();

      actions.removeLane("non-existent-id");

      const stateAfter = getTestStoreState();
      expect(stateAfter.lanes).toEqual(stateBefore.lanes);
      expect(stateAfter.cards).toEqual(stateBefore.cards);
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

        if (localUuidCount === 1) return mockLaneId1;
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
        canRemoveCards: true,
      });
      laneId = newLane.id;
    });

    it("should add a new card to a lane at the end", () => {
      const { actions } = getTestStoreState();
      const newCardId = actions.addCard({
        laneId: laneId,
        title: "New Card",
        description: "New Description",
      });

      const state = getTestStoreState();
      expect(state.cards[newCardId]).toEqual({
        id: newCardId,
        laneId: laneId,
        title: "New Card",
        description: "New Description",
      });

      const lane = state.lanes.find((l) => l.id === laneId);
      expect(lane?.cards).toHaveLength(1);
      expect(lane?.cards[0]).toBe(newCardId);
      expect(newCardId).toBe(mockCardId1);
    });

    it("should add a new card to a lane at a specific index", () => {
      const { actions } = getTestStoreState();
      actions.addCard({ laneId, title: "Card 1", description: "" });
      actions.addCard({ laneId, title: "Card 2", description: "" });

      const newCardId = actions.addCard(
        { laneId, title: "Inserted Card", description: "" },
        1,
      );

      const state = getTestStoreState();
      const lane = state.lanes.find((l) => l.id === laneId);
      expect(lane?.cards).toHaveLength(3);
      expect(lane?.cards[1]).toBe(newCardId);
      expect(lane?.cards[0]).not.toBe(newCardId);
      expect(lane?.cards[2]).not.toBe(newCardId);
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
        canRemoveCards: true,
      });
      laneId = newLane.id;
      cardId = actions.addCard({
        laneId,
        title: "Initial Title",
        description: "Initial Desc",
      });
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

  describe("removeCard", () => {
    let laneId: ID;
    let cardId: ID;
    beforeEach(() => {
      const { actions } = getTestStoreState();
      const newLane = actions.addLane({
        title: "Test Lane",
        considerCardDone: false,
        canRemove: false,
        canRemoveCards: true,
      });
      laneId = newLane.id;
      cardId = actions.addCard({
        laneId,
        title: "Card to remove",
        description: "",
      });
      actions.addCard({ laneId, title: "Another Card", description: "" });
    });

    it("should remove a card from the cards map and its lane", () => {
      const { actions } = getTestStoreState();
      actions.removeCard(cardId);

      const state = getTestStoreState();
      expect(state.cards[cardId]).toBeUndefined(); // Card removed from map

      const lane = state.lanes.find((l) => l.id === laneId);
      expect(lane?.cards).not.toContain(cardId); // Card removed from lane's array
      expect(lane?.cards).toHaveLength(1); // One card remaining
    });

    it("should not throw error if card or lane not found", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.removeCard("non-existent-card");
      expect(getTestStoreState()).toEqual(stateBefore); // No change
    });
  });
});

describe("createBoardStore", () => {
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
          return mockCardId1; // T1
        case 3:
          return mockCardId2; // T2
        case 4:
          return mockCardId3; // T3
        case 5:
          return mockLaneId2; // In Progress Lane
        case 6:
          return mockCardId4; // I1
        case 7:
          return mockCardId5; // I2
        case 8:
          return mockCardId6; // I3
        case 9:
          return mockLaneId3; // Done Lane
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

    it("should filter out card IDs from dndItems if they do not exist in state.cards", () => {
      const { actions } = getTestStoreState();
      const dndItems: Record<ID, ID[]> = {
        [mockLaneId1]: [mockCardId1, "non-existent-card", mockCardId2], // Contains a non-existent card
        [mockLaneId2]: [mockCardId4],
        [mockLaneId3]: [mockCardId7],
      };
      const initialLaneOrder = [mockLaneId1, mockLaneId2, mockLaneId3];

      // Manually delete a card from the store's cards map *before* syncing
      // to simulate a desync (e.g., card was deleted elsewhere)
      getTestStoreState().actions.removeCard(mockCardId3);
      const currentState = getTestStoreState();
      expect(currentState.cards[mockCardId3]).toBeUndefined();

      actions.syncBoardState(dndItems, initialLaneOrder);

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === mockLaneId1);
      expect(lane1?.cards).toEqual([mockCardId1, mockCardId2]); // 'non-existent-card' should be filtered out
      expect(state.cards[mockCardId1].laneId).toBe(mockLaneId1);
      expect(Object.keys(state.cards)).not.toContain("non-existent-card");
      expect(Object.keys(state.cards)).not.toContain(mockCardId3); // Still removed
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
});
