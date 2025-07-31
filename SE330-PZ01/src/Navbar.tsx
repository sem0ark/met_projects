import { MoonIcon, RadioIcon, SunIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect } from "react";
import { useAppStoreActions, useCurrentTheme } from "./board/app-store";

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
  const { setTheme } = useAppStoreActions();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  const handleThemeSwitch = useCallback(() => {
    setTheme(getNextTheme(currentTheme).name);
  }, [setTheme, currentTheme]);

  const currentThemeIndex = getThemeIndex(currentTheme);

  return (
    <div className="navbar bg-base-100 z-10 shadow-sm">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">SE330 Life Admin</a>
      </div>

      <div>
        <button
          onClick={handleThemeSwitch}
          className="btn btn-ghost btn-circle hover:bg-accent-content/10 text-accent relative size-12 overflow-hidden"
          aria-label={`Switch to ${getNextTheme(currentTheme).name} theme`}
        >
          {THEMES.map((theme, index) => {
            const Icon = theme.icon;

            const rotation = (index - currentThemeIndex) * 120; // 120 degrees per step
            const opacity = index === currentThemeIndex ? 1 : 0; // Only show current icon

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
