import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <h1 className="text-3xl font-bold">Welcome!</h1>
      <p className="text-lg italic">You can find anything there!</p>
      <Link
        to="/products"
        className="border-orange-700 bg-orange-50 animate-bounce rounded-full border-2 px-5 py-2 hover:animate-none"
      >
        See Products
      </Link>
    </div>
  );
}
