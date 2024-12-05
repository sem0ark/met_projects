import { z } from "zod";

export type RoleType = "user" | "admin";

export const UserSchema = z.object({
  id: z.string(),
  login: z.string(),
  role: z.enum(["user", "admin"]),
});

export type User = z.infer<typeof UserSchema>;

export interface UserPost {
  login: string;
  password: string;
  role: RoleType;
}

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  descriptionLong: z.string(),
  // For some reason, json-server jumps between string and number values.
  price: z.union([z.string(), z.number()]).transform((v) => typeof v === "string" ? Number.parseFloat(v) : v),
  categoryIds: z.array(z.string()),
  imageUrl: z.string(),
  imageUrls: z.array(z.string()),
});

export type Product = z.infer<typeof ProductSchema>;

export interface ProductPost {
  name: string;
  description: string;
  descriptionLong: string;
  price: number;
  categoryIds: string[];
  imageUrl: string;
  imageUrls: string[];
}

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export interface CategoryPost {
  name: string;
}
