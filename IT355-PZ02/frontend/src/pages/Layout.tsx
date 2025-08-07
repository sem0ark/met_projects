import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { BrandIcon, CartIcon, OpenAPI } from "../components/icons";
import { getTotalProducts, useUserStore } from "../stores/user";
import { useIsLoggedIn, useIsLoggedInAsUser } from "../data/auth";
import { AdminPanelButton } from "./admin/AdminPanel";

const CopyRight = () => (
  <img
    className="h-3"
    src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Copyright.svg"
    alt=""
  />
);

const ProfileLink = () => {
  const isLoggedIn = useIsLoggedIn();
  if (!isLoggedIn)
    return (
      <NavLink
        to="/login"
        className={({ isActive }) =>
          clsx(
            isActive ? "font-bold text-orange-400" : "hover:text-orange-700",
            "relative p-2 text-lg transition duration-100 ease-in-out",
          )
        }
      >
        Login
      </NavLink>
    );

  return (
    <NavLink
      to="/profile"
      className={({ isActive }) =>
        clsx(
          isActive ? "text-orange-400" : "hover:text-orange-700",
          "relative p-2 text-lg transition duration-100 ease-in-out",
        )
      }
    >
      Profile
    </NavLink>
  );
};

const CartButton = () => {
  const totalProducts = useUserStore(getTotalProducts);

  const isLoggedIn = useIsLoggedInAsUser();
  if (!isLoggedIn) return null;

  return (
    <NavLink
      to="/cart"
      className={({ isActive }) =>
        clsx(
          isActive ? "text-orange-400" : "hover:text-orange-700",
          "relative rounded-lg border-2 border-slate-600 bg-slate-200 p-2 text-lg transition duration-100 ease-in-out hover:border-orange-600",
        )
      }
    >
      <CartIcon className="h-5" />
      {totalProducts > 0 && (
        <div className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-orange-500"></div>
      )}
      {totalProducts > 0 && (
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500"></div>
      )}
    </NavLink>
  );
};

const NavigationLink = ({ to, title }: { to: string; title: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        isActive ? "font-bold text-orange-400" : "hover:text-orange-700",
        "text-lg transition duration-300 ease-in",
      )
    }
  >
    {title}
  </NavLink>
);

const Navigation = () => {
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  const handleScroll = () => {
    const currentScrollPos = window.scrollY;

    if (currentScrollPos > prevScrollPos) {
      setVisible(false);
    } else {
      setVisible(true);
    }

    setPrevScrollPos(currentScrollPos);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });

  return (
    <div
      className={clsx(
        visible ? "top-0" : "top-[-100px]",
        "sticky z-10 flex h-16 w-full items-center border-b-2 border-orange-600 bg-white py-2 shadow-md duration-300 ease-in-out",
      )}
    >
      <div className="container mx-auto flex items-center gap-1 px-2">
        <Link
          to="/"
          className="flex flex-1 items-center text-2xl font-bold text-orange-700"
        >
          True C<BrandIcon />
          lors
        </Link>

        <nav className="relative flex h-full w-full flex-1 items-center justify-end gap-3 duration-500 sm:flex sm:h-auto sm:items-center">
          <Popover className="block sm:hidden">
            <PopoverButton className="block w-full rounded-md ring-transparent hover:font-bold sm:hidden">
              Menu
            </PopoverButton>
            <PopoverPanel
              transition
              anchor="bottom"
              className="top-9 z-20 flex flex-col items-center rounded-xl border-2 bg-orange-50 p-5 text-sm/6 transition duration-200 ease-in-out [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0"
            >
              <NavigationLink to="/" title="Home" />
              <NavigationLink to="/products" title="Products" />
              <NavigationLink to="/about" title="About" />
            </PopoverPanel>
          </Popover>

          <div className="hidden h-auto items-center justify-between gap-3 sm:flex">
            <NavigationLink to="/" title="Home" />
            <NavigationLink to="/products" title="Products" />
            <NavigationLink to="/about" title="About" />
            <ProfileLink />
            <CartButton />
            <AdminPanelButton />
          </div>
        </nav>
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="font-body container mx-auto flex h-10 w-full items-center justify-between gap-1 px-2">
      <div className="text-body flex items-center gap-1 font-bold">
        True Colors <CopyRight /> 2025
      </div>
      <a
        target="_blank"
        href="http://localhost:8080/swagger-ui/index.html"
        className="rounded-full border-2 border-orange-700 bg-orange-50 px-5 transition-colors duration-200 ease-in-out hover:bg-orange-200 hover:shadow-md"
      >
        <OpenAPI className="-my-8 size-24" />
      </a>
      <div className="text-body">Arkadii Semenov</div>
    </footer>
  );
};

export const MainLayout = () => (
  <div className="flex h-fit min-h-screen flex-col bg-orange-50/50">
    <Navigation />

    <main className="relative container mx-auto my-5 flex max-w-screen-lg flex-1 flex-col items-center justify-center">
      <Outlet />
    </main>

    <div className="z-10 h-fit w-full border-t-2 border-orange-600 bg-white py-2 text-orange-700 shadow-md">
      <Footer />
    </div>
  </div>
);
