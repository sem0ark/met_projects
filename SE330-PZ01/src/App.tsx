import { useMemo } from "react";
import { useCurrentStore } from "./app-store";
import { Board } from "./board/Board";
import { BoardStoreProvider, useGetBoardState } from "./board/board-store";
import { Navbar } from "./Navbar";

function BoardInitialized() {
  const getState = useGetBoardState();
  const [cards, lanes] = useMemo(
    () => [
      Object.fromEntries(getState().lanes.map((lane) => [lane.id, lane.cards])),
      getState().lanes.map((lane) => lane.id),
    ],
    [getState],
  );

  return <Board intialItems={cards} initialContainers={lanes} />;
}

function BoardWithProvider() {
  const storeName = useCurrentStore();
  return (
    <BoardStoreProvider storeName={storeName}>
      {/* In order to fully clear out the component with its state, so that we won't cause race condition in  */}
      <BoardInitialized key={storeName} />
    </BoardStoreProvider>
  );
}

function App() {
  return (
    <div className="h-dvh overflow-y-hidden">
      <Navbar />
      <div className="mx-auto h-full overflow-auto">
        <BoardWithProvider />
      </div>
    </div>
  );
}

export default App;
