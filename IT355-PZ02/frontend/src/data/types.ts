import { z } from "zod";

const RoleSchema = z.union([z.literal("ADMIN"), z.literal("USER")]);
export type RoleType = z.infer<typeof RoleSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"), // Expects only "Bearer"
  username: z.string(),
  role: RoleSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(4, "Password must be at least 4 characters long"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(4, "Password must be at least 4 characters long"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export interface CurrentUser {
  token: string;
  username: string;
  role: "ADMIN" | "USER";
}

export interface UserPost {
  username: string;
  password: string;
}

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: RoleSchema,
});

export type User = z.infer<typeof UserSchema>;

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
