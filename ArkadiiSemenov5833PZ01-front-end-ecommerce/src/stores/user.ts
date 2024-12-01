import { create } from "zustand";
import { Product, User } from "../data/types";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { useQuery_FetchProductsFiltered } from "../data/queries";

interface CartItem {
  productId: string;
  quantity: number;
}

interface UserState {
  items: CartItem[];
  user: User | null;

  addItem: (product: Product, quantity: number) => void;

  removeProduct: (productId: string) => void;
  clearCart: () => void;

  login: (newUser: User) => void;
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
  persist(
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

      login: (newUser: User) =>
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

      removeProduct: (productId: string) =>
        set((state) => {
          state.items = state.items.filter((it) => it.productId !== productId);
        }),
    })),
    { name: "user-data" },
  ),
);
