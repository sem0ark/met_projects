import { createHashRouter } from "react-router-dom";

import { Home } from "./Home";
import { ErrorPage } from "./Error";
import { Products } from "./Products";
import { About } from "./About";
import { ProductDetails } from "./ProductDetails";
import { Cart } from "./user/Cart";
import { MainLayout } from "./Layout";
import { Login } from "./Login";
import { UserInfo } from "./user/UserInfo";
import { SignUp } from "./SignUp";
import { Logout } from "./Logout";
import { AdminProducts } from "./admin/AdminProducts";
import { AdminCategories } from "./admin/AdminCategories";
import { AdminUsers } from "./admin/AdminUsers";
import { RequireAuth } from "./RequireAuth";

export const router = createHashRouter([
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
        path: "/index.html",
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
