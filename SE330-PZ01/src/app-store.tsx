import { immer } from "zustand/middleware/immer";
import { createGlobalStore, type SetState } from "./utils/store-utils";
import { persist } from "zustand/middleware";

const createBoardStore = () => {
  function store(set: SetState<typeof store>) {
    return {
      colorTheme: "light",
      isUsingHandleCard: true,
      isUsingHandleContainer: true,
      stores: ["Default"] as string[],
      currentStore: "Default",

      actions: {
        setTheme: (theme: string) =>
          set((state) => {
            state.colorTheme = theme;
          }),
        addStore: (storeName: string) =>
          set((state) => {
            state.stores.push(storeName);
            state.currentStore = storeName;
          }),
        setCurrentStore: (storeName: string) =>
          set((state) => {
            state.currentStore = storeName;
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
      isUsingHandleCard: state.isUsingHandleCard,
      isUsingHandleContainer: state.isUsingHandleContainer,
      stores: state.stores,
      currentStore: state.currentStore,
    }),
  }),
);

export const useCurrentTheme = () =>
  useAppStoreShallow((state) => state.colorTheme);
export const useCurrentStore = () =>
  useAppStoreShallow((state) => state.currentStore);
export const useStoreList = () => useAppStoreShallow((state) => state.stores);

export const useIsUsingHandleContainer = () =>
  useAppStoreShallow((state) => state.isUsingHandleContainer);
export const useIsUsingHandleCard = () =>
  useAppStoreShallow((state) => state.isUsingHandleCard);

export const useAppStoreActions = () => useAppStore((state) => state.actions);
