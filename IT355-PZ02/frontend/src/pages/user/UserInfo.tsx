import { Link } from "react-router-dom";
import { useUser } from "../../data/auth";

export function UserInfo() {
  const user = useUser();

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <h1 className="text-3xl font-bold">Welcome, {user?.login}!</h1>
      <p className="text-lg italic">You can find anything there!</p>

      <div className="flex gap-3">
        <Link
          to="/products"
          className="rounded-full border-2 border-orange-700 bg-orange-50 px-5 py-2 hover:animate-pulse"
        >
          Products
        </Link>

        <Link
          to="/logout"
          className="rounded-full border-2 border-orange-700 bg-orange-50 px-5 py-2 hover:animate-pulse"
        >
          Logout
        </Link>
      </div>
    </div>
  );
}
