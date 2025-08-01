import {
  MoonIcon,
  RadioIcon,
  SunIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  useAppStoreActions,
  useCurrentTheme,
  useCurrentStore,
  useStoreList,
} from "./app-store";
import clsx from "clsx"; // For conditional classes

const THEMES = [
  { name: "light", icon: SunIcon },
  { name: "dark", icon: MoonIcon },
  { name: "retro", icon: RadioIcon },
];
const getThemeIndex = (theme: string) => {
  const index = THEMES.findIndex((t) => t.name === theme);
  return index === -1 ? 0 : index;
};
const getNextTheme = (theme: string) => {
  const index = getThemeIndex(theme);
  return THEMES[(index + 1) % THEMES.length];
};

export function Navbar() {
  const currentTheme = useCurrentTheme();
  const currentStore = useCurrentStore();
  const allStores = useStoreList();
  const { setTheme, addStore, setCurrentStore } = useAppStoreActions();

  const [isAddingNewStore, setIsAddingNewStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const newStoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (isAddingNewStore && newStoreInputRef.current) {
      newStoreInputRef.current.focus();
    }
  }, [isAddingNewStore]);

  const handleThemeSwitch = useCallback(() => {
    setTheme(getNextTheme(currentTheme).name);
  }, [setTheme, currentTheme]);

  const handleAddNewStoreClick = useCallback(() => {
    setIsAddingNewStore(true);
    setNewStoreName(""); // Clear previous input
  }, []);

  const handleNewStoreSubmit = useCallback(
    (e: React.FormEvent | React.FocusEvent) => {
      e.preventDefault(); // Prevent full form submission
      const trimmedName = newStoreName.trim();
      if (trimmedName && !allStores.includes(trimmedName)) {
        addStore(trimmedName);
      }
      setIsAddingNewStore(false);
      setNewStoreName("");
    },
    [newStoreName, addStore, allStores],
  );

  const handleNewStoreKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsAddingNewStore(false);
        setNewStoreName("");
      }
    },
    [],
  );

  const handleStoreClick = useCallback(
    (storeName: string) => {
      setCurrentStore(storeName);
    },
    [setCurrentStore],
  );

  const currentThemeIndex = getThemeIndex(currentTheme);

  return (
    <div className="navbar bg-base-100 z-10 shadow-sm">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">SE330 Life Admin</a>
      </div>

      {/* Store Navigation */}
      <div className="flex items-center gap-2 px-4">
        {isAddingNewStore ? (
          <form
            onSubmit={handleNewStoreSubmit}
            onBlur={handleNewStoreSubmit}
            className="flex gap-2"
          >
            <input
              ref={newStoreInputRef}
              type="text"
              placeholder="New Store Name"
              className="input input-bordered input-sm w-40"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={handleNewStoreKeyDown}
            />
            <button type="submit" className="btn btn-sm btn-primary">
              Add
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setIsAddingNewStore(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <ul className="menu menu-horizontal gap-1 px-1">
              {allStores.map((storeName) => (
                <li key={storeName}>
                  <a
                    onClick={() => handleStoreClick(storeName)}
                    className={clsx(
                      currentStore === storeName
                        ? "btn btn-sm btn-accent text-accent-content"
                        : "btn btn-sm btn-ghost",
                    )}
                  >
                    {storeName}
                  </a>
                </li>
              ))}
            </ul>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleAddNewStoreClick}
              aria-label="Add new store"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div>
        <button
          onClick={handleThemeSwitch}
          className="btn btn-ghost btn-circle hover:bg-accent-content/10 text-accent relative size-12 overflow-hidden"
          aria-label={`Switch to ${getNextTheme(currentTheme).name} theme`}
        >
          {THEMES.map((theme, index) => {
            const Icon = theme.icon;

            const rotation = (index - currentThemeIndex) * 120;
            const opacity = index === currentThemeIndex ? 1 : 0;

            return (
              <Icon
                key={theme.name}
                className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  opacity: opacity,
                }}
              />
            );
          })}
        </button>
      </div>
    </div>
  );
}
