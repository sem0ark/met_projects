import {
  QueryKey,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CategoryPost, CategorySchema, Product, ProductPost, ProductSchema, UserPost, UserSchema } from "./types";
import axios from "axios";
import { z } from "zod";

export const fullUrl = (str: string) => `${import.meta.env.VITE_API_URL}${str}`;

function useGet<T extends z.ZodTypeAny>(schema: T, keys: QueryKey, url: string, enabled = true) {
  return useQuery({
    queryKey: keys,
    queryFn: () => axios.get(fullUrl(url)).then((r) => {console.log(r.data);
    return schema.parse(r.data)}) as Promise<z.infer<T>>,
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
  useGet(z.array(CategorySchema), ["categories"], "/categories");

export const useQuery_FetchCategory = (id: string) =>
  useGet(CategorySchema, ["categories", id], `/categories/${id}`);

export const useQuery_AddCategory = () =>
  usePost<CategoryPost>([["categories"]], `/categories`);

export const useQuery_PutCategory = (id: string) =>
  usePut<CategoryPost>([["categories"]], `/categories/${id}`);

export const useQuery_DeleteCategory = (id: string) =>
  useDelete([["categories"]], `/categories/${id}`);

export const useQuery_FetchProducts = () =>
  useGet(z.array(ProductSchema), ["products"], `/products`);

export const useQuery_FetchProductsFiltered = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", id],
      queryFn: () =>
        axios
          .get(fullUrl(`/products/${id}`))
          .then((r) => ProductSchema.parse(r.data)) as Promise<Product>,
    })),
  });

export const useQuery_FetchProduct = (id: string) =>
  useGet(ProductSchema, ["products", id], `/products/${id}`);

export const useQuery_AddProduct = () =>
  usePost<ProductPost>([["products"]], `/products`);

export const useQuery_PutProduct = (id: string) =>
  usePut<ProductPost>([["products"]], `/products/${id}`);

export const useQuery_DeleteProduct = (id: string) =>
  useDelete([["products"]], `/products/${id}`);

export const useQuery_FetchUsers = () =>
  useGet(z.array(UserSchema), ["users"], `/users`);

export const useQuery_FetchUser = (id: string) =>
  useGet(UserSchema, ["users", id], `/users/${id}`);

export const useQuery_AddUser = () =>
  usePost<UserPost>([["users"]], `/users`);

export const useQuery_PutUser = (id: string) =>
  usePut<UserPost>([["users"]], `/users/${id}`);

export const useQuery_DeleteUser = (id: string) =>
  useDelete([["users"]], `/users/${id}`);
