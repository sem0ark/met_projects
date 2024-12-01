import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { SettingsIcon } from "../../components/icons";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useIsLoggedInAsAdmin } from "../../data/auth";

export const AdminPanelButton = () => {
  const isLoggedIn = useIsLoggedInAsAdmin();
  if (!isLoggedIn) return null;

  return (
    <Popover className="block">
      <PopoverButton className="relative rounded-lg border-2 border-slate-600 bg-slate-200 p-2 text-lg transition duration-100 ease-in-out hover:border-accent-600 hover:text-accent-700">
        <SettingsIcon className="h-5" />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor="bottom"
        className="top-9 z-20 flex flex-col items-center rounded-xl border-2 bg-accent-50 p-5 text-sm/6 transition duration-200 ease-in-out [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0"
      >
        <NavLink
          to="/admin/products"
          className={({ isActive }) =>
            clsx(
              isActive ? "font-bold text-accent-400" : "hover:text-accent-700",
              "text-lg transition duration-300 ease-in",
            )
          }
        >
          Products
        </NavLink>
        <NavLink
          to="/admin/categories"
          className={({ isActive }) =>
            clsx(
              isActive ? "font-bold text-accent-400" : "hover:text-accent-700",
              "text-lg transition duration-300 ease-in",
            )
          }
        >
          Categories
        </NavLink>
        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            clsx(
              isActive ? "font-bold text-accent-400" : "hover:text-accent-700",
              "text-lg transition duration-300 ease-in",
            )
          }
        >
          Users
        </NavLink>
      </PopoverPanel>
    </Popover>
  );
};
