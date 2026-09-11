export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "BLOCKED";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
