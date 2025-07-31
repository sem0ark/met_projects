import { describe, it, expect, beforeEach, vi } from "vitest";

import { createBoardStore, uuid4, type ID } from "./board-store";
import { createStore } from "zustand";

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

  // Test moveLane
  describe("moveLane", () => {
    it("should move a lane to a new position", () => {
      const { actions } = getTestStoreState();
      actions.initializeBoard(); // Creates 3 lanes: To Do, In Progress, Done

      const initialLaneOrder = getTestStoreState().lanes.map((l) => l.title);
      expect(initialLaneOrder).toEqual(["To Do", "In Progress", "Done"]);

      actions.moveLane(0, 2); // Move "To Do" (index 0) to end (index 2)

      const state = getTestStoreState();
      const newLaneOrder = state.lanes.map((l) => l.title);
      expect(newLaneOrder).toEqual(["In Progress", "Done", "To Do"]);
    });

    it("should handle moving to the same index", () => {
      const { actions } = getTestStoreState();
      actions.initializeBoard();
      const initialLaneOrder = getTestStoreState().lanes.map((l) => l.title);

      actions.moveLane(1, 1); // Move "In Progress" to same spot

      const newLaneOrder = getTestStoreState().lanes.map((l) => l.title);
      expect(newLaneOrder).toEqual(initialLaneOrder); // Order should be unchanged
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

  // Test removeCard
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

  // Test moveCard
  describe("moveCard", () => {
    let lane1Id: ID;
    let lane2Id: ID;
    let card1Lane1: ID;
    let card2Lane1: ID;
    let card1Lane2: ID;

    beforeEach(() => {
      const { actions } = getTestStoreState();
      const lane1 = actions.addLane({
        title: "Lane 1",
        considerCardDone: false,
        canRemove: false,
        canRemoveCards: true,
      });
      const lane2 = actions.addLane({
        title: "Lane 2",
        considerCardDone: false,
        canRemove: false,
        canRemoveCards: true,
      });
      lane1Id = lane1.id;
      lane2Id = lane2.id;

      card1Lane1 = actions.addCard({
        laneId: lane1Id,
        title: "C1L1",
        description: "",
      });
      card2Lane1 = actions.addCard({
        laneId: lane1Id,
        title: "C2L1",
        description: "",
      });
      card1Lane2 = actions.addCard({
        laneId: lane2Id,
        title: "C1L2",
        description: "",
      });
    });

    it("should move a card within the same lane", () => {
      const { actions } = getTestStoreState();
      actions.moveCard(lane1Id, lane1Id, card1Lane1, 1); // Move C1L1 to index 1 in Lane 1

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === lane1Id);
      expect(lane1?.cards).toEqual([card2Lane1, card1Lane1]);
      expect(state.cards[card1Lane1].laneId).toBe(lane1Id); // LaneId should not change
    });

    it("should move a card to a different lane", () => {
      const { actions } = getTestStoreState();
      actions.moveCard(lane1Id, lane2Id, card1Lane1, 0); // Move C1L1 from Lane 1 to Lane 2 at index 0

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === lane1Id);
      const lane2 = state.lanes.find((l) => l.id === lane2Id);

      expect(lane1?.cards).toEqual([card2Lane1]); // Lane 1 should now only have card2Lane1
      expect(lane2?.cards).toEqual([card1Lane1, card1Lane2]); // Lane 2 should have C1L1 first
      expect(state.cards[card1Lane1].laneId).toBe(lane2Id); // Card's laneId must be updated
    });

    it("should handle moving to the end of a lane", () => {
      const { actions } = getTestStoreState();
      actions.moveCard(lane1Id, lane2Id, card1Lane1, 100); // Move C1L1 to end of Lane 2

      const state = getTestStoreState();
      const lane1 = state.lanes.find((l) => l.id === lane1Id);
      const lane2 = state.lanes.find((l) => l.id === lane2Id);

      expect(lane1?.cards).toEqual([card2Lane1]);
      expect(lane2?.cards).toEqual([card1Lane2, card1Lane1]); // Should be at the end
      expect(state.cards[card1Lane1].laneId).toBe(lane2Id);
    });

    it("should do nothing if fromLane is not found", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.moveCard("non-existent-lane", lane2Id, card1Lane1, 0);
      expect(getTestStoreState()).toEqual(stateBefore);
    });

    it("should do nothing if toLane is not found", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.moveCard(lane1Id, "non-existent-lane", card1Lane1, 0);
      expect(getTestStoreState()).toEqual(stateBefore);
    });

    it("should do nothing if card is not found in fromLane", () => {
      const { actions } = getTestStoreState();
      const stateBefore = getTestStoreState();
      actions.moveCard(lane1Id, lane2Id, "non-existent-card", 0);
      expect(getTestStoreState()).toEqual(stateBefore);
    });
  });
});
