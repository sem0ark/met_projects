import {
  type QueryKey,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CategorySchema,
  ProductSchema,
  UserSchema,
  type CategoryPost,
  type Product,
  type ProductPost,
  type UserPost,
} from "./types";
import axios from "axios";
import { z } from "zod";
import { useUserHeaders } from "./auth";

export const fullUrl = (str: string) =>
  `${import.meta.env.VITE_API_URL}/api${str}`;

export function useGet<T extends z.ZodTypeAny>(
  schema: T,
  keys: QueryKey,
  url: string,
  enabled = true,
) {
  const userHeaders = useUserHeaders();

  return useQuery({
    queryKey: keys,
    queryFn: () =>
      axios
        .get(fullUrl(url), {
          headers: {
            ...userHeaders,
          },
        })
        .then((r) => schema.parse(r.data)) as Promise<z.infer<T>>,
    enabled,
  });
}

export function usePost<T, R = unknown>(
  onSuccessInvalidate: QueryKey[],
  url: string,
  onSuccess?: (data: R) => void,
) {
  const client = useQueryClient();
  const userHeaders = useUserHeaders();

  return useMutation({
    mutationFn: (value: T) =>
      axios.post(fullUrl(url), value, {
        headers: {
          ...userHeaders,
        },
      }) as Promise<R>,
    onSuccess: (data) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if (onSuccess) onSuccess(data);
    },
  });
}

export function usePostSchema<T, R extends z.ZodTypeAny>(
  onSuccessInvalidate: QueryKey[],
  url: string,
  schema: R,
  onSuccess?: (data: z.infer<R>, variables: T) => void,
) {
  const client = useQueryClient();
  const userHeaders = useUserHeaders();

  return useMutation({
    mutationFn: (value: T) =>
      axios
        .post(fullUrl(url), value, {
          headers: {
            ...userHeaders,
          },
        })
        .then((r) => {
          return schema.parse(r.data);
        }) as Promise<z.infer<R>>,
    onSuccess: (data, variables) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if (onSuccess) onSuccess(data, variables);
    },
  });
}

export function usePut<T, R = unknown>(
  onSuccessInvalidate: QueryKey[],
  url: string,
  onSuccess?: (data: R) => void,
) {
  const client = useQueryClient();
  const userHeaders = useUserHeaders();

  return useMutation({
    mutationFn: (value: T) =>
      axios.put(fullUrl(url), value, {
        headers: {
          ...userHeaders,
        },
      }) as Promise<R>,
    onSuccess: (data) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if (onSuccess) onSuccess(data);
    },
  });
}

export function useDelete(
  onSuccessInvalidate: QueryKey[],
  url: string,
  onSuccess?: () => void,
) {
  const client = useQueryClient();
  const userHeaders = useUserHeaders();

  return useMutation({
    mutationFn: () =>
      axios.delete(fullUrl(url), {
        headers: {
          ...userHeaders,
        },
      }),
    onSuccess: () => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if (onSuccess) onSuccess();
    },
  });
}

export const useQuery_FetchCategories = () =>
  useGet(z.array(CategorySchema), ["categories"], "/categories");

export const useQuery_FetchCategory = (id: number) =>
  useGet(CategorySchema, ["categories", id], `/categories/${id}`);

export const useQuery_AddCategory = () =>
  usePost<CategoryPost>([["categories"]], `/categories`);

export const useQuery_PutCategory = (id: number) =>
  usePut<CategoryPost>([["categories"]], `/categories/${id}`);

export const useQuery_DeleteCategory = (id: number) =>
  useDelete([["categories"]], `/categories/${id}`);

export const useQuery_FetchProducts = () =>
  useGet(z.array(ProductSchema), ["products"], `/products`);

export const useQuery_FetchProductsFiltered = (ids: number[]) => {
  const userHeaders = useUserHeaders();

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", id],
      queryFn: () =>
        axios
          .get(fullUrl(`/products/${id}`), {
            headers: {
              ...userHeaders,
            },
          })
          .then((r) => ProductSchema.parse(r.data)) as Promise<Product>,
    })),
  });
};

export const useQuery_FetchProduct = (id: number) =>
  useGet(ProductSchema, ["products", id], `/products/${id}`);

export const useQuery_AddProduct = () =>
  usePost<ProductPost>([["products"]], `/products`);

export const useQuery_PutProduct = (id: number) =>
  usePut<ProductPost>([["products"]], `/products/${id}`);

export const useQuery_DeleteProduct = (id: number) =>
  useDelete([["products"]], `/products/${id}`);

export const useQuery_FetchUsers = () =>
  useGet(z.array(UserSchema), ["users"], `/users`);

export const useQuery_FetchUser = (id: number) =>
  useGet(UserSchema, ["users", id], `/users/${id}`);

export const useQuery_AddUser = () => usePost<UserPost>([["users"]], `/users`);

export const useQuery_PutUser = (id: number) =>
  usePut<UserPost>([["users"]], `/users/${id}`);

export const useQuery_DeleteUser = (id: number) =>
  useDelete([["users"]], `/users/${id}`);
