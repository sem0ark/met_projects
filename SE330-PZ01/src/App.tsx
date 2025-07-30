import { MultipleContainers } from "./board/Board";

// <input type="checkbox" value="dark" className="toggle theme-controller" />
function App() {
  return (
    <div className="bg-base-100 drawer mx-auto w-fit">
      <MultipleContainers handle={true}/>
    </div>
  );
}

export default App;
