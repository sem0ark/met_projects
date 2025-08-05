export function About() {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <h1 className="text-3xl font-bold">Welcome!</h1>
      <p className="text-caption italic">
        You can find anything related to flower there!
      </p>
      <p className="max-w-md text-center">
        Hi! I am <b>Arkadii Semenov 5833 SE FIT</b>, this is a React project
        with a switchable backend of either <code>json-server</code> and ASP.NET
        Core API.
      </p>

      <h2 className="text-lg italic">Description: Used stack</h2>

      <ul className="flex max-w-lg flex-col justify-start gap-3 text-sm">
        <li className="list-disc">React (Vite bundler)</li>
        <li className="list-disc">
          <code className="rounded-md border border-neutral-500 bg-neutral-200 p-1 text-sm shadow-inner">
            tailwindcss
          </code>{" "}
          - "CSS++" library for writing styles;
        </li>
        <li className="list-disc">
          <code className="rounded-md border border-neutral-500 bg-neutral-200 p-1 text-sm shadow-inner">
            @tanstack/react-query
          </code>{" "}
          - async query processor;
        </li>
        <li className="list-disc">
          <code className="rounded-md border border-neutral-500 bg-neutral-200 p-1 text-sm shadow-inner">
            @headlessui/react
          </code>{" "}
          - UI library for building accessible and fully functioning UI
          components;
        </li>
        <li className="list-disc">
          <code className="rounded-md border border-neutral-500 bg-neutral-200 p-1 text-sm shadow-inner">
            zustand
          </code>{" "}
          - state management library, which is like Redux, but better.
        </li>
        <li className="list-disc">
          <code className="rounded-md border border-neutral-500 bg-neutral-200 p-1 text-sm shadow-inner">
            react-hook-form
          </code>{" "}
          - utility library for implementing forms, which automatically
          configures all the complexity of state management in forms.
        </li>
      </ul>
    </div>
  );
}
