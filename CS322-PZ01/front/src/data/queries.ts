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
import { useUser } from "./auth";

export const fullUrl = (str: string) => `${import.meta.env.VITE_API_URL}/api${str}`;

export function useGet<T extends z.ZodTypeAny>(schema: T, keys: QueryKey, url: string, enabled = true) {
  const user = useUser();
  
  return useQuery({
    queryKey: keys,
    queryFn: () => axios.get(fullUrl(url), {
      headers: {
        "Auth": user?.token
      }
    }).then((r) => schema.parse(r.data)) as Promise<z.infer<T>>,
    enabled,
  });
}

export function usePost<T, R = unknown>(onSuccessInvalidate: QueryKey[], url: string, onSuccess?: ((data: R) => void)) {
  const client = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: (value: T) => axios.post(fullUrl(url), value, {
      headers: {
        "Auth": user?.token
      }
    }) as Promise<R>,
    onSuccess: (data) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if(onSuccess) onSuccess(data);
    },
  });
}

export function usePostSchema<T, R extends z.ZodTypeAny>(onSuccessInvalidate: QueryKey[], url: string, schema: R, onSuccess?: ((data: z.infer<R>, variables: T) => void)) {
  const client = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: (value: T) => axios.post(fullUrl(url), value, {
      headers: {
        "Auth": user?.token
      }
    }).then((r) => {
      console.log("Success POST", r.data);
      return schema.parse(r.data)
    }) as Promise<z.infer<R>>,
    onSuccess: (data, variables) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if(onSuccess) onSuccess(data, variables);
    },
  });
}


export function usePut<T, R = unknown>(onSuccessInvalidate: QueryKey[], url: string, onSuccess?: ((data: R) => void)) {
  const client = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: (value: T) => axios.put(fullUrl(url), value, {
      headers: {
        "Auth": user?.token
      }
    }) as Promise<R>,
    onSuccess: (data) => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if(onSuccess) onSuccess(data);
    },
  });
}

export function useDelete(onSuccessInvalidate: QueryKey[], url: string, onSuccess?: (() => void)) {
  const client = useQueryClient();
  const user = useUser();

  return useMutation({
    mutationFn: () => axios.delete(fullUrl(url), {
      headers: {
        "Auth": user?.token
      }
    }),
    onSuccess: () => {
      onSuccessInvalidate.forEach((key) =>
        client.invalidateQueries({
          queryKey: key,
        }),
      );

      if(onSuccess) onSuccess();
    },
  });
}

export const useQuery_FetchCategories = () =>
  useGet(z.array(CategorySchema), ["categories"], "/app/categories");

export const useQuery_FetchCategory = (id: number) =>
  useGet(CategorySchema, ["categories", id], `/app/categories/${id}`);

export const useQuery_AddCategory = () =>
  usePost<CategoryPost>([["categories"]], `/app/categories`);

export const useQuery_PutCategory = (id: number) =>
  usePut<CategoryPost>([["categories"]], `/app/categories/${id}`);

export const useQuery_DeleteCategory = (id: number) =>
  useDelete([["categories"]], `/app/categories/${id}`);

export const useQuery_FetchProducts = () =>
  useGet(z.array(ProductSchema), ["products"], `/app/products`);

export const useQuery_FetchProductsFiltered = (ids: number[]) => {
  const user = useUser();

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", id],
      queryFn: () =>
        axios
          .get(fullUrl(`/app/products/${id}`), {
            headers: {
              "Auth": user?.token
            }
          })
          .then((r) => ProductSchema.parse(r.data)) as Promise<Product>,
    })),
  });
}
  

export const useQuery_FetchProduct = (id: number) =>
  useGet(ProductSchema, ["products", id], `/app/products/${id}`);

export const useQuery_AddProduct = () =>
  usePost<ProductPost>([["products"]], `/app/products`);

export const useQuery_PutProduct = (id: number) =>
  usePut<ProductPost>([["products"]], `/app/products/${id}`);

export const useQuery_DeleteProduct = (id: number) =>
  useDelete([["products"]], `/app/products/${id}`);

export const useQuery_FetchUsers = () =>
  useGet(z.array(UserSchema), ["users"], `/users`);

export const useQuery_FetchUser = (id: number) =>
  useGet(UserSchema, ["users", id], `/users/${id}`);

export const useQuery_AddUser = () =>
  usePost<UserPost>([["users"]], `/users`);

export const useQuery_PutUser = (id: number) =>
  usePut<UserPost>([["users"]], `/users/${id}`);

export const useQuery_DeleteUser = (id: number) =>
  useDelete([["users"]], `/users/${id}`);
