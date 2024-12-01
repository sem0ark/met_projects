import {
  createBrowserRouter,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";

import { Home } from "./Home";
import { ErrorPage } from "./Error";
import { Products } from "./Products";
import { About } from "./About";
import { ProductDetails } from "./ProductDetails";
import { Cart } from "./user/Cart";
import { MainLayout } from "./Layout";
import { useUser } from "../data/auth";
import { Login } from "./Login";
import { UserInfo } from "./user/UserInfo";
import { SignUp } from "./SignUp";
import { Logout } from "./Logout";
import { AdminProducts } from "./admin/AdminProducts";
import { AdminCategories } from "./admin/AdminCategories";
import { RoleType } from "../data/types";
import { AdminUsers } from "./admin/AdminUsers";


function RequireAuth({ role, roles }: { role?: RoleType; roles?: RoleType[] }) {
  const user = useUser();
  const location = useLocation();

  if (
    !user ||
    (role && user.role !== role) ||
    (roles && roles.includes(user.role))
  )
    return <Navigate to="/login" state={{ from: location }} />;

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home />,
        errorElement: <ErrorPage />,
        index: true,
      },
      {
        path: "/products",
        element: <Products />,
        errorElement: <ErrorPage />,
        loader: ({ params }) => params,
      },
      {
        path: "/about",
        element: <About />,
        errorElement: <ErrorPage />,
      },
      {
        path: "/products/:productId",
        element: <ProductDetails />,
        errorElement: <ErrorPage />,
        loader: ({ params }) => params,
      },
      {
        path: "/login",
        element: <Login />,
        errorElement: <ErrorPage />,
      },
      {
        path: "/signup",
        element: <SignUp />,
        errorElement: <ErrorPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/profile",
            element: <UserInfo />,
          },
          {
            path: "/logout",
            element: <Logout />,
          },
        ],
      },
      {
        element: <RequireAuth role="user" />,
        children: [
          {
            path: "/cart",
            element: <Cart />,
            errorElement: <ErrorPage />,
          },
        ],
      },
      {
        element: <RequireAuth role="admin" />,
        children: [
          {
            path: "/admin/products",
            element: <AdminProducts />,
          },
          {
            path: "/admin/categories",
            element: <AdminCategories />,
          },
          {
            path: "/admin/users",
            element: <AdminUsers />,
          },
        ],
      },
      {
        path: "*",
        element: <ErrorPage message="Page Not Found" />,
      },
    ],
  },
]);
