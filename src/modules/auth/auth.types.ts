import type {
  PublicUser,
  UserRole,
} from "@/modules/users/user.types";

export type AuthClient =
  | "web"
  | "mobile";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  client: AuthClient;
}

export interface RegisterResult {
  user: PublicUser;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

export interface LoginResult
  extends AuthTokens {
  user: PublicUser;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: "access";
}