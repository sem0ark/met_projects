import { Container } from "./board/Container";
import { Item } from "./board/Item";

// <input type="checkbox" value="dark" className="toggle theme-controller" />
function App() {
  return (
    <div className="bg-base-200 drawer mx-auto max-w-[100rem]">
      <Container label="Hello">
        <Item value={"123"} />
        <Item value={"123"} />
        <Item value={"123"} />
      </Container>
    </div>
  );
}

export default App;
