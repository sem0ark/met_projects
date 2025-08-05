import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePost, usePostSchema } from "./queries";
import { LoginResponseSchema, type CurrentUser, type UserPost } from "./types";
import { useUserStore } from "../stores/user";
import { useNavigate } from "react-router-dom";

export function useSignUp() {
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();

  return usePost<UserPost>([["user"]], `/users/auth/signup`, () => {
    logout();
    navigate("/");
  });
}

export function useLogin() {
  const login = useUserStore((state) => state.login);
  const navigate = useNavigate();

  return usePostSchema<UserPost, typeof LoginResponseSchema>(
    [["user"]],
    `/users/auth/signin`,
    LoginResponseSchema,
    (data) => {
      login({
        token: data.token,
        ...data.user,
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
    mutationFn: async () => {},
    onSuccess: () => {
      queryClient.setQueryData(["user"], false);
      logout();
      navigate("/");
    },
  });
}

export function useUser(): CurrentUser | null {
  return useUserStore((state) => state.user);
}

export function useIsLoggedIn(): boolean {
  return useUserStore((state) => !!state.user);
}

export function useIsLoggedInAsUser(): boolean {
  return useUserStore((state) => !!state.user && state.user.role === "user");
}

export function useIsLoggedInAsAdmin(): boolean {
  return useUserStore((state) => !!state.user && state.user.role === "admin");
}
