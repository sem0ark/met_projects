export type RoleType = "user" | "admin";

export interface User {
  id: string;
  login: string;
  role: RoleType;
}

export interface UserDTO {
  id: string;
  login: string;
  password: string;
}

export interface UserPost {
  login: string;
  password: string;
  role: RoleType;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  descriptionLong: string;
  price: number;
  categoryIds: string[];
  imageUrl: string;
  imageUrls: string[];
}
export interface ProductPost {
  name: string;
  description: string;
  descriptionLong: string;
  price: number;
  categoryIds: string[];
  imageUrl: string;
  imageUrls: string[];
}

export interface Category {
  id: string;
  name: string;
}
export interface CategoryPost {
  name: string;
}
