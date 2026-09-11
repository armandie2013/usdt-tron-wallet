import bcrypt from "bcryptjs";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  DuplicateUserEmailError,
} from "@/modules/users/user.repository";

import {
  UserService,
} from "@/modules/users/user.service";

import {
  AuthSessionRepository,
} from "./auth.session.repository";

import {
  AuthRepository,
} from "./auth.repository";

import {
  createAccessToken,
  createRefreshToken,
  getRefreshExpiration,
  hashRefreshToken,
} from "./auth.tokens";

import type {
  AuthTokens,
  LoginInput,
  LoginResult,
  RegisterInput,
  RegisterResult,
} from "./auth.types";

const PASSWORD_SALT_ROUNDS =
  12;

export class AuthService {
  private readonly repository =
    new AuthRepository();

  private readonly sessions =
    new AuthSessionRepository();

  async register(
    input: RegisterInput,
  ): Promise<RegisterResult> {
    const email =
      input.email
        .trim()
        .toLowerCase();

    const name =
      input.name.trim();

    const existingUser =
      await this.repository
        .findUserByEmail(
          email,
        );

    if (existingUser) {
      throw new AppError(
        "Ya existe un usuario registrado con ese correo electrónico.",
        "USER_ALREADY_EXISTS",
        409,
      );
    }

    const passwordHash =
      await bcrypt.hash(
        input.password,
        PASSWORD_SALT_ROUNDS,
      );

    try {
      const user =
        await this.repository
          .createUser({
            name,
            email,
            passwordHash,

            role: "USER",
            status: "ACTIVE",

            emailVerified:
              false,
          });

      return {
        user:
          UserService.toPublicUser(
            user,
          ),
      };
    } catch (error) {
      if (
        error instanceof
        DuplicateUserEmailError
      ) {
        throw new AppError(
          error.message,
          "USER_ALREADY_EXISTS",
          409,
        );
      }

      throw error;
    }
  }

  async login(
    input: LoginInput,
  ): Promise<LoginResult> {
    const email =
      input.email
        .trim()
        .toLowerCase();

    const user =
      await this.repository
        .findUserByEmail(
          email,
        );

    if (!user) {
      throw new AppError(
        "Correo electrónico o contraseña incorrectos.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    const passwordOk =
      await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

    if (!passwordOk) {
      throw new AppError(
        "Correo electrónico o contraseña incorrectos.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    if (
      user.status ===
      "BLOCKED"
    ) {
      throw new AppError(
        "La cuenta se encuentra bloqueada.",
        "USER_BLOCKED",
        403,
      );
    }

    if (
      user.status ===
      "DISABLED"
    ) {
      throw new AppError(
        "La cuenta se encuentra deshabilitada.",
        "USER_DISABLED",
        403,
      );
    }

    if (!user._id) {
      throw new AppError(
        "El usuario no posee un identificador válido.",
        "INVALID_USER",
        500,
      );
    }

    const tokens =
      await this.createTokens(
        user._id.toString(),
        user.role,
      );

    return {
      user:
        UserService.toPublicUser(
          user,
        ),

      ...tokens,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<AuthTokens> {
    const tokenHash =
      hashRefreshToken(
        refreshToken,
      );

    const session =
      await this.sessions.consume(
        tokenHash,
      );

    if (!session) {
      throw new AppError(
        "La sesión no es válida o ha expirado.",
        "INVALID_REFRESH_TOKEN",
        401,
      );
    }

    const user =
      await this.repository
        .findUserById(
          session.userId.toString(),
        );

    if (!user || !user._id) {
      throw new AppError(
        "El usuario asociado a la sesión no existe.",
        "USER_NOT_FOUND",
        401,
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La cuenta no se encuentra activa.",
        "USER_NOT_ACTIVE",
        403,
      );
    }

    return this.createTokens(
      user._id.toString(),
      user.role,
    );
  }

  async logout(
    refreshToken?: string,
  ): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.sessions.revoke(
      hashRefreshToken(
        refreshToken,
      ),
    );
  }

  private async createTokens(
    userId: string,
    role: "ADMIN" | "USER",
  ): Promise<AuthTokens> {
    const accessToken =
      await createAccessToken({
        sub: userId,
        role,
      });

    const refreshToken =
      createRefreshToken();

    await this.sessions.create(
      userId,

      hashRefreshToken(
        refreshToken,
      ),

      getRefreshExpiration(),
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn:
        15 * 60,
    };
  }
}