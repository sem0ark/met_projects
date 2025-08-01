import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { CardContent } from "./CardContent";
import {
  useBoardStoreActions,
  useBoardStoreGetters,
  useCard,
} from "./board-store";
import type { ID } from "./common-types";

vi.mock("./board-store", () => ({
  useBoardStoreActions: vi.fn(),
  useBoardStoreGetters: vi.fn(),
  useCard: vi.fn(),
}));

describe("CardContent Integration Tests", () => {
  const mockCardId: ID = "card-123";
  const mockLaneId: ID = "lane-abc";
  const mockOnRemove = vi.fn();
  const mockUpdateCard = vi.fn();

  const setupMockCard = (
    title: string,
    description: string = "",
    dueDate?: string,
  ) => {
    (useCard as Mock).mockReturnValue({
      id: mockCardId,
      laneId: mockLaneId,
      title,
      description,
      dueDate,
    });
  };

  // Helper to set up mock store getters
  const setupMockGetters = (
    canRemove: boolean = true,
    isDone: boolean = false,
    isNearing: boolean = false,
    isOverdue: boolean = false,
  ) => {
    (useBoardStoreGetters as Mock).mockReturnValue({
      canRemoveCard: vi.fn(() => canRemove),
      isCardDone: vi.fn(() => isDone),
      isCardNearingDueDate: vi.fn(() => isNearing),
      isCardOverdue: vi.fn(() => isOverdue),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
    // Default mocks for actions and getters
    (useBoardStoreActions as Mock).mockReturnValue({
      updateCard: mockUpdateCard,
    });
    setupMockGetters(); // Default to true for canRemove, false for others
    setupMockCard("Initial Title", "Initial Description");

    // Mock createPortal to render its content directly for testing
    // This allows Testing Library to find elements inside the portal
    vi.mock("react-dom", async (importOriginal) => {
      const actual = await importOriginal<typeof import("react-dom")>();
      return {
        ...actual,
        createPortal: vi.fn((children) => children),
      };
    });

    vi.useRealTimers(); // Ensure real timers are used by default for date formatting
  });

  afterEach(() => {
    vi.useRealTimers(); // Cleanup timers after each test if they were faked
  });

  it("renders card title and description correctly", () => {
    setupMockCard("My Test Card", "This is a detailed description.");
    render(<CardContent id={mockCardId} />);

    expect(screen.getByText("My Test Card")).toBeInTheDocument();
    // Description is not directly rendered in CardContent, but in the edit form.
    // We'll test its presence in the form when we open it.
  });

  it("renders 'Untitled Card' if title is empty and enables inline editing", async () => {
    setupMockCard("", "Some description"); // Empty title
    render(<CardContent id={mockCardId} />);

    expect(screen.getByPlaceholderText("New task...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New task...")).toHaveValue("");
    expect(screen.queryByText("Untitled Card")).not.toBeInTheDocument();
  });

  it("displays the edit button on hover (simulated by checking visibility)", async () => {
    setupMockCard("Test Card");
    render(<CardContent id={mockCardId} />);

    // Initially hidden, it's inside a label with htmlFor.
    // The Edit icon is typically hidden and shown on hover via CSS.
    // We can't directly simulate CSS hover with RTL easily.
    // Instead, we check for the presence of the label that triggers the drawer.
    const editButtonLabel = screen.getByLabelText(
      `card-drawer-toggle-${mockCardId}`,
    );
    expect(editButtonLabel).toBeInTheDocument();
    expect(editButtonLabel).toContainHTML("<svg"); // Check it contains the Edit SVG
  });

  it("calls onRemove when the remove button is clicked", async () => {
    setupMockGetters(true, false, false, false); // canRemove: true
    setupMockCard("Removable Card");
    render(<CardContent id={mockCardId} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it("does not render remove button if canRemove is false or onRemove is not provided", () => {
    setupMockGetters(false, false, false, false); // canRemove: false
    setupMockCard("Non-removable Card");
    const { rerender } = render(<CardContent id={mockCardId} />);
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();

    setupMockGetters(true, false, false, false); // canRemove: true
    rerender(<CardContent id={mockCardId} onRemove={undefined} />); // No onRemove prop
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  describe("CardEditForm Interaction", () => {
    it("opens the edit form when the edit button is clicked", async () => {
      setupMockCard("Card to Edit", "Original description");
      render(<CardContent id={mockCardId} />);

      const editButtonLabel = screen.getByLabelText(
        `card-drawer-toggle-${mockCardId}`,
      );
      fireEvent.click(editButtonLabel);

      await waitFor(() => {
        expect(screen.getByText("Edit Card")).toBeInTheDocument();
        expect(screen.getByLabelText("Title")).toHaveValue("Card to Edit");
        expect(screen.getByLabelText("Description")).toHaveValue(
          "Original description",
        );
        expect(screen.getByLabelText("Due Date")).toHaveValue(""); // Should be empty initially
      });
    });

    it("saves changes and calls updateCard with new title and description", async () => {
      setupMockCard("Old Title", "Old Description");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));

      const titleInput = screen.getByLabelText("Title");
      const descriptionTextarea = screen.getByLabelText("Description");
      const saveButton = screen.getByRole("button", { name: /save changes/i });

      fireEvent.change(titleInput, { target: { value: "New Title" } });
      fireEvent.change(descriptionTextarea, {
        target: { value: "New Description" },
      });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalledTimes(1);
        expect(mockUpdateCard).toHaveBeenCalledWith({
          id: mockCardId,
          title: "New Title",
          description: "New Description",
          dueDate: undefined, // Due date should remain undefined if not changed
        });
      });
      expect(screen.queryByText("Edit Card")).not.toBeInTheDocument(); // Form should close
    });

    it("saves changes and calls updateCard with a new due date", async () => {
      setupMockCard("Task", "Details");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));

      const dueDateInput = screen.getByLabelText("Due Date");
      fireEvent.change(dueDateInput, { target: { value: "2026-01-15" } }); // Set a new date
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalledTimes(1);
        expect(mockUpdateCard).toHaveBeenCalledWith({
          id: mockCardId,
          title: "Task",
          description: "Details",
          dueDate: "2026-01-15", // Expect the new due date
        });
      });
    });

    it("saves changes and calls updateCard with removed due date", async () => {
      setupMockCard("Task", "Details", "2025-10-20"); // Card initially has a due date
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));

      const dueDateInput = screen.getByLabelText("Due Date");
      expect(dueDateInput).toHaveValue("2025-10-20");

      fireEvent.change(dueDateInput, { target: { value: "" } }); // Clear the due date
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalledTimes(1);
        expect(mockUpdateCard).toHaveBeenCalledWith({
          id: mockCardId,
          title: "Task",
          description: "Details",
          dueDate: undefined, // Expect dueDate to be undefined when cleared
        });
      });
    });

    it("does not call updateCard if no changes are made", async () => {
      setupMockCard("Initial Title", "Initial Description", "2025-08-01");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));

      // Get the inputs but don't change them
      screen.getByLabelText("Title");
      screen.getByLabelText("Description");
      screen.getByLabelText("Due Date"); // It will have "2025-08-01"

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateCard).not.toHaveBeenCalled(); // No update should occur
      });
      expect(screen.queryByText("Edit Card")).not.toBeInTheDocument(); // Form should still close
    });

    it("closes the edit form when Cancel is clicked", async () => {
      setupMockCard("Card Title");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));
      await waitFor(() => {
        expect(screen.getByText("Edit Card")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByText("Edit Card")).not.toBeInTheDocument();
      });
      expect(mockUpdateCard).not.toHaveBeenCalled(); // No save should happen
    });

    it("closes the edit form when Escape key is pressed", async () => {
      setupMockCard("Card Title");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));
      await waitFor(() => {
        expect(screen.getByText("Edit Card")).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); // Assuming drawer-side acts as a dialog
      await waitFor(() => {
        expect(screen.queryByText("Edit Card")).not.toBeInTheDocument();
      });
      expect(mockUpdateCard).not.toHaveBeenCalled();
    });

    it("closes the edit form when drawer overlay is clicked", async () => {
      setupMockCard("Card Title");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByLabelText(`card-drawer-toggle-${mockCardId}`));
      await waitFor(() => {
        expect(screen.getByText("Edit Card")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("close sidebar")); // Click on the overlay
      await waitFor(() => {
        expect(screen.queryByText("Edit Card")).not.toBeInTheDocument();
      });
      expect(mockUpdateCard).not.toHaveBeenCalled();
    });
  });

  describe("Inline Title Editing", () => {
    it("enters inline edit mode when card title is empty and saves changes", async () => {
      setupMockCard(""); // Empty title initially
      render(<CardContent id={mockCardId} />);

      const inlineInput = screen.getByPlaceholderText("New task...");
      expect(inlineInput).toBeInTheDocument();
      expect(inlineInput).toHaveFocus(); // Should autofocus if empty

      fireEvent.change(inlineInput, { target: { value: "New Inline Title" } });
      fireEvent.blur(inlineInput); // Simulate blur to trigger save

      await waitFor(() => {
        expect(mockUpdateCard).toHaveBeenCalledTimes(1);
        expect(mockUpdateCard).toHaveBeenCalledWith({
          id: mockCardId,
          title: "New Inline Title",
          description: "", // Description should be preserved
          dueDate: undefined, // Due date should be preserved
        });
      });
      expect(screen.queryByPlaceholderText("New task...")).not.toBeInTheDocument(); // Input should be gone
      expect(screen.getByText("New Inline Title")).toBeInTheDocument(); // New title should be displayed
    });

    it("exits inline edit mode without saving if input is empty on blur", async () => {
      setupMockCard("Original Title");
      render(<CardContent id={mockCardId} />);

      // Simulate clicking the strong tag to enter inline edit
      fireEvent.click(screen.getByText("Original Title"));
      const inlineInput = screen.getByDisplayValue("Original Title");
      expect(inlineInput).toBeInTheDocument();

      fireEvent.change(inlineInput, { target: { value: "" } }); // Clear the input
      fireEvent.blur(inlineInput);

      await waitFor(() => {
        expect(mockUpdateCard).not.toHaveBeenCalled(); // No update should happen
      });
      expect(screen.queryByPlaceholderText("New task...")).not.toBeInTheDocument();
      expect(screen.getByText("Original Title")).toBeInTheDocument(); // Original title should still be displayed
    });

    it("exits inline edit mode without saving if Escape is pressed", async () => {
      setupMockCard("Original Title");
      render(<CardContent id={mockCardId} />);

      fireEvent.click(screen.getByText("Original Title"));
      const inlineInput = screen.getByDisplayValue("Original Title");

      fireEvent.change(inlineInput, { target: { value: "Typing something" } });
      fireEvent.keyDown(inlineInput, { key: "Escape" });

      await waitFor(() => {
        expect(mockUpdateCard).not.toHaveBeenCalled();
      });
      expect(screen.queryByPlaceholderText("New task...")).not.toBeInTheDocument();
      expect(screen.getByText("Original Title")).toBeInTheDocument(); // Original title should be reverted
    });
  });

  describe("Due Date Display and Highlighting", () => {
    it("displays due date if present", () => {
      setupMockCard("Task with Date", "", "2025-12-25");
      render(<CardContent id={mockCardId} />);
      expect(screen.getByText("Due: 12/25/2025")).toBeInTheDocument();
    });

    it("does not display due date if not present", () => {
      setupMockCard("Task without Date", "");
      render(<CardContent id={mockCardId} />);
      expect(screen.queryByText(/Due:/)).not.toBeInTheDocument();
    });

    it("applies 'nearing' class when isCardNearingDueDate is true", () => {
      setupMockCard("Nearing Task", "", "2025-08-05"); // arbitrary future date
      setupMockGetters(true, false, true, false); // isNearing: true

      render(<CardContent id={mockCardId} />);
      const dueDateText = screen.getByText("Due: 8/5/2025");
      expect(dueDateText).toHaveClass("text-info"); // Tailwind class for 'nearing' color
    });

    it("applies 'overdue' class when isCardOverdue is true", () => {
      setupMockCard("Overdue Task", "", "2025-07-30"); // arbitrary past date
      setupMockGetters(true, false, false, true); // isOverdue: true

      render(<CardContent id={mockCardId} />);
      const dueDateText = screen.getByText("Due: 7/30/2025");
      expect(dueDateText).toHaveClass("text-error"); // Tailwind class for 'overdue' color
    });

    it("prioritizes 'overdue' class over 'nearing' if both are true", () => {
      // This scenario ideally shouldn't happen if getters are exclusive,
      // but it tests the `clsx` logic's order of precedence.
      setupMockCard("Both Nearing and Overdue (should be overdue)", "", "2025-07-30");
      setupMockGetters(true, false, true, true); // Both true

      render(<CardContent id={mockCardId} />);
      const dueDateText = screen.getByText("Due: 7/30/2025");
      expect(dueDateText).toHaveClass("text-error");
      expect(dueDateText).not.toHaveClass("text-info");
    });

    it("does not apply highlight classes if neither nearing nor overdue", () => {
      setupMockCard("Normal Task", "", "2025-10-01");
      setupMockGetters(true, false, false, false); // All false

      render(<CardContent id={mockCardId} />);
      const dueDateText = screen.getByText("Due: 10/1/2025");
      expect(dueDateText).toHaveClass("text-base-content"); // Default text color
      expect(dueDateText).not.toHaveClass("text-info");
      expect(dueDateText).not.toHaveClass("text-error");
    });
  });

  it("applies 'done' class to title when isCardDone is true", () => {
    setupMockCard("Done Task");
    setupMockGetters(true, true, false, false); // isDone: true

    render(<CardContent id={mockCardId} />);
    const titleElement = screen.getByText("Done Task");
    expect(titleElement).toHaveClass("text-success");
    expect(titleElement).toHaveClass("italic");
    expect(titleElement).toHaveClass("line-through");
  });

  it("does not render CardContent if card data is null", () => {
    (useCard as Mock).mockReturnValue(null); // Simulate card not found
    render(<CardContent id={mockCardId} />);
    expect(screen.queryByText(/card/i)).not.toBeInTheDocument(); // Nothing should render
  });
});