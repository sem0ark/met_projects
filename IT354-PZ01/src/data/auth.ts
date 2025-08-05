import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { fullUrl } from "./queries";
import { User } from "./types";
import { useUserStore } from "../stores/user";
import { useNavigate } from "react-router-dom";

// WARNING: very "secure" way of auth due to not having a server.

export function useSignUp() {
  const queryClient = useQueryClient();
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      login,
      password,
    }: {
      login: string;
      password: string;
    }) => {
      const result = await (axios
        .get(fullUrl(`/users?login=${login}`))
        .then((r) => r.data[0] ?? null) as Promise<User | null>);

      if (result) throw new Error(`User already exists`);

      await axios.post(fullUrl(`/users`), { login, password, role: "user" });
      navigate("/");
      return true;
    },
    onSuccess: () => {
      queryClient.setQueryData(["user"], false);
      logout();
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const login = useUserStore((state) => state.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      login,
      password,
    }: {
      login: string;
      password: string;
    }): Promise<User> => {
      const result = await (axios
        .get(fullUrl(`/users?login=${login}&password=${password}`))
        .then((r) => r.data[0] ?? null) as Promise<User | null>);

      if (!result) throw new Error(`Failed to log in as ${login}`);
      navigate("/");
      return result;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);
      login(user);
    },
  });
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

export function useUser(): User | null {
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
