import { useShallow } from "zustand/shallow";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostSchema } from "./queries";
import {
  LoginResponseSchema,
  type CurrentUser,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
} from "./types";
import { useUserStore } from "../stores/user";
import { useNavigate } from "react-router-dom";

export function useSignUp() {
  const navigate = useNavigate();
  const login = useUserStore((state) => state.login);

  return usePostSchema<RegisterRequest, typeof LoginResponseSchema>(
    [["user", "signup"]],
    `/auth/register`,
    LoginResponseSchema,
    (data: LoginResponse) => {
      login({
        token: data.accessToken,
        username: data.username,
        role: data.role,
      });
      navigate("/");
    },
  );
}

export function useLogin() {
  const login = useUserStore((state) => state.login);
  const navigate = useNavigate();

  return usePostSchema<LoginRequest, typeof LoginResponseSchema>(
    [["user", "login"]],
    `/auth/login`,
    LoginResponseSchema,
    (data: LoginResponse) => {
      login({
        token: data.accessToken,
        username: data.username,
        role: data.role,
      });
      navigate("/");
    },
  );
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      // No API call needed for client-side logout.
    },
    onSuccess: () => {
      queryClient.setQueryData(["users"], null);
      logout();
      navigate("/");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUser(): CurrentUser | null {
  return useUserStore((state) => state.user);
}

export function useUserHeaders(): Record<string, string> {
  return useUserStore(
    useShallow((state) => {
      const result: Record<string, string> = {};
      if (state?.user?.token) {
        result["Authorization"] = `Bearer ${state.user.token}`;
      }
      return result;
    }),
  );
}

export function useIsLoggedIn(): boolean {
  return useUserStore((state) => !!state.user);
}

export function useIsLoggedInAsUser(): boolean {
  return useUserStore((state) => !!state.user && state.user.role === "USER");
}

export function useIsLoggedInAsAdmin(): boolean {
  return useUserStore((state) => !!state.user && state.user.role === "ADMIN");
}
