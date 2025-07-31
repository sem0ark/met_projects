import { Board } from "./board/Board";
import { Navbar } from "./Navbar";

function App() {
  return (
    <div className="h-dvh overflow-y-hidden">
      <Navbar />
      <div className="mx-auto overflow-auto h-full">
        <Board handle={true} />
      </div>
    </div>
  );
}

export default App;
