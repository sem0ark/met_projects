import { create } from "zustand";
import { Product, CurrentUser } from "../data/types";
import { immer } from "zustand/middleware/immer";
import { useQuery_FetchProductsFiltered } from "../data/queries";

interface CartItem {
  productId: number;
  quantity: number;
}

interface UserState {
  items: CartItem[];
  user: CurrentUser | null;

  addItem: (product: Product, quantity: number) => void;

  removeProduct: (productId: number) => void;
  clearCart: () => void;

  login: (newUser: CurrentUser) => void;
  logout: () => void;
}

export const getTotalProducts = (state: UserState) =>
  state.items.map((it) => it.quantity).reduce((a, b) => a + b, 0);

export const useTotalPrice = () => {
  const items = useUserStore((state) => state.items);
  const quantities = new Map(
    items.map((item) => [item.productId, item.quantity]),
  );
  const results = useQuery_FetchProductsFiltered(
    items.map((it) => it.productId),
  )
    .map((r) => r.data)
    .filter((data) => !!data);

  return results
    .map((product) => product.price * (quantities.get(product.id) ?? 0))
    .reduce((a, b) => a + b, 0);
};

export const useUserStore = create<UserState>()(
  immer((set) => ({
    items: [],
    user: null,

    addItem: (product: Product, quantity: number) =>
      set((state) => {
        const item = state.items.filter(
          (it) => it.productId === product.id,
        )[0];

        if (item) item.quantity += quantity;
        else
          state.items.push({
            productId: product.id,
            quantity: quantity,
          });
      }),

    login: (newUser: CurrentUser) =>
      set((state) => {
        if (state.user !== null) state.clearCart();
        state.user = newUser;
      }),

    logout: () =>
      set((state) => {
        state.user = null;
        state.clearCart();
      }),

    clearCart: () =>
      set((state) => {
        state.items = [];
      }),

    removeProduct: (productId: number) =>
      set((state) => {
        state.items = state.items.filter((it) => it.productId !== productId);
      }),
  })),
);
