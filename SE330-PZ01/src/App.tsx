import { Board } from "./board/Board";
import { Navbar } from "./Navbar";

function App() {
  return (
    <>
      <Navbar />
      <div className="mx-auto w-fit">
        <Board handle={true} />
      </div>
    </>
  );
}

export default App;
