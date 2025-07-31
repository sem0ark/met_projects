import {
  createGlobalStore,
  // type GetState,
  type SetState,
} from "../utils/store-utils";

const createBoardStore = () =>
  function store(set: SetState<typeof store>) {
    return {
      colorTheme: "light",
      isUsingHandleCard: true,
      isUsingHandleContainer: true,

      actions: {
        setTheme: (theme: "light" | "retro" | "dark") =>
          set((state) => {
            state.colorTheme = theme;
          }),
      },
    };
  };

export const {
  useStore: useAppStore,
  useStoreShallow: useAppStoreShallow,
  getStoreState: getAppState,
} = createGlobalStore(createBoardStore);

export const useCurrentTheme = () =>
  useAppStoreShallow((state) => state.colorTheme);
export const useIsUsingHandleContainer = () =>
  useAppStoreShallow((state) => state.isUsingHandleContainer);
export const useIsUsingHandleCard = () =>
  useAppStoreShallow((state) => state.isUsingHandleCard);

export const useAppStoreActions = () => useAppStore((state) => state.actions);
