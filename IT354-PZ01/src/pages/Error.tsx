import { useRouteError } from "react-router-dom";

export function ErrorPage({ message }: { message?: string }) {
  const error = useRouteError() as {
    statusText?: string;
    message?: string;
  };

  return (
    <div className="fixed inset-0 mx-auto flex h-screen w-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Oops!</h1>
      <p className="text-center text-base">
        Sorry, an unexpected error has occurred.
      </p>
      <p className="text-sm italic text-slate-400">
        {message || error.statusText || error.message}
      </p>
    </div>
  );
}
