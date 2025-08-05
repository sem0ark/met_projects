import { z } from "zod";

export type RoleType = "user" | "admin";

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.number(),
    login: z.string(),
    role: z.enum(["user", "admin"]),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserSchema = z.object({
  id: z.number(),
  login: z.string(),
  role: z.enum(["user", "admin"]),
});

export type User = z.infer<typeof UserSchema>;

export const CurrentUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  role: z.enum(["user", "admin"]),
  token: z.string(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export interface UserPost {
  login: string;
  password: string;
}

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  descriptionLong: z.optional(z.string()),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "string" ? Number.parseFloat(v) : v)),
  categoryIds: z.optional(z.array(z.number())).transform((v) => v ?? []),
  imageUrl: z.string(),
  imageUrls: z.optional(z.array(z.string())).transform((v) => v ?? []),
});

export type Product = z.infer<typeof ProductSchema>;

export interface ProductPost {
  name: string;
  description: string;
  descriptionLong: string;
  price: number;
  categoryIds: number[];
  imageUrl: string;
  imageUrls: string[];
}

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export interface CategoryPost {
  name: string;
}
