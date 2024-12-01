import {
  QueryKey,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Category, CategoryPost, Product, ProductPost, User, UserPost } from "./types";
import axios from "axios";

export const fullUrl = (str: string) => `${import.meta.env.VITE_API_URL}${str}`;

function useGet<T>(keys: QueryKey, url: string, enabled = true) {
  return useQuery({
    queryKey: keys,
    queryFn: () => axios.get(fullUrl(url)).then((r) => r.data) as Promise<T>,
    enabled,
  });
}

function usePost<T, R = unknown>(onSuccessInvalidate: QueryKey[], url: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (value: T) => axios.post(fullUrl(url), value) as Promise<R>,

    onSuccess: () => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );
    },
  });
}

function usePut<T, R = unknown>(onSuccessInvalidate: QueryKey[], url: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (value: T) => axios.put(fullUrl(url), value) as Promise<R>,

    onSuccess: () => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );
    },
  });
}

function useDelete(onSuccessInvalidate: QueryKey[], url: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => axios.delete(fullUrl(url)),

    onSuccess: () => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );
    },
  });
}

export const useQuery_FetchCategories = () =>
  useGet<Category[]>(["categories"], "/categories");

export const useQuery_FetchCategory = (id: string) =>
  useGet<Category>(["categories", id], `/categories/${id}`);

export const useQuery_AddCategory = () =>
  usePost<CategoryPost>([["categories"]], `/categories`);

export const useQuery_PutCategory = (id: string) =>
  usePut<CategoryPost>([["categories"]], `/categories/${id}`);

export const useQuery_DeleteCategory = (id: string) =>
  useDelete([["categories"]], `/categories/${id}`);



export const useQuery_FetchProducts = () =>
  useGet<Product[]>(["products"], `/products`);

export const useQuery_FetchProductsFiltered = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", id],
      queryFn: () =>
        axios
          .get(fullUrl(`/products/${id}`))
          .then((r) => r.data) as Promise<Product>,
    })),
  });

export const useQuery_FetchProduct = (id: string) =>
  useGet<Product>(["products", id], `/products/${id}`);

export const useQuery_AddProduct = () =>
  usePost<ProductPost>([["products"]], `/products`);

export const useQuery_PutProduct = (id: string) =>
  usePut<ProductPost>([["products"]], `/products/${id}`);

export const useQuery_DeleteProduct = (id: string) =>
  useDelete([["products"]], `/products/${id}`);




export const useQuery_FetchUsers = () =>
  useGet<User[]>(["users"], `/users`);

export const useQuery_FetchUser = (id: string) =>
  useGet<User>(["users", id], `/users/${id}`);

export const useQuery_AddUser = () =>
  usePost<UserPost>([["users"]], `/users`);

export const useQuery_PutUser = (id: string) =>
  usePut<UserPost>([["users"]], `/users/${id}`);

export const useQuery_DeleteUser = (id: string) =>
  useDelete([["users"]], `/users/${id}`);


