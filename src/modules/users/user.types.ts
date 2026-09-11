import type { ObjectId } from "mongodb";

export type UserRole = "ADMIN" | "USER";

export type UserStatus =
  | "ACTIVE"
  | "BLOCKED"
  | "DISABLED";

export interface UserDocument {
  _id?: ObjectId;

  name: string;
  email: string;
  passwordHash: string;

  role: UserRole;
  status: UserStatus;

  emailVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;

  name: string;
  email: string;

  role: UserRole;
  status: UserStatus;

  emailVerified: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;

  role?: UserRole;
  status?: UserStatus;

  emailVerified?: boolean;
}