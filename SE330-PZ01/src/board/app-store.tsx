import { immer } from "zustand/middleware/immer";
import { createGlobalStore, type SetState } from "../utils/store-utils";
import { persist } from "zustand/middleware";

const createBoardStore = () => {
  function store(set: SetState<typeof store>) {
    return {
      colorTheme: "light",
      isUsingHandleCard: true,
      isUsingHandleContainer: true,

      actions: {
        setTheme: (theme: string) =>
          set((state) => {
            state.colorTheme = theme;
          }),
      },
    };
  }

  return immer(store);
};

export const {
  useStore: useAppStore,
  useStoreShallow: useAppStoreShallow,
  getStoreState: getAppState,
} = createGlobalStore(() =>
  persist(createBoardStore(), {
    name: "app-settings",
    version: 1,
    partialize: (state) => ({
      colorTheme: state.colorTheme,
    }),
  }),
);

export const useCurrentTheme = () =>
  useAppStoreShallow((state) => state.colorTheme);
export const useIsUsingHandleContainer = () =>
  useAppStoreShallow((state) => state.isUsingHandleContainer);
export const useIsUsingHandleCard = () =>
  useAppStoreShallow((state) => state.isUsingHandleCard);

export const useAppStoreActions = () => useAppStore((state) => state.actions);
