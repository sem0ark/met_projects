import { MultipleContainers } from "./board/Board";

function App() {
  return (
    <div className="bg-base-100 drawer mx-auto w-fit">
      <input type="checkbox" value="dark" className="toggle theme-controller" />
      <MultipleContainers handle={true} />
    </div>
  );
}

export default App;
