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
  ACCESS_TOKEN_TTL_SECONDS,
  createAccessToken,
  createRefreshToken,
  getSessionExpiration,
  hashRefreshToken,
} from "./auth.tokens";

import type {
  AuthClient,
  AuthTokens,
  LoginInput,
  LoginResult,
  RegisterInput,
  RegisterResult,
} from "./auth.types";

import type {
  UserRole,
} from "@/modules/users/user.types";

const PASSWORD_SALT_ROUNDS =
  12;

export class SessionAlreadyActiveError
  extends AppError {
  constructor() {
    super(
      "Esta cuenta ya tiene una sesión activa en otro dispositivo.",
      "SESSION_ALREADY_ACTIVE",
      409,
    );
  }
}

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
    currentRefreshToken?: string,
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

    const userId =
      user._id.toString();

    const tokens =
      await this.createLoginTokens(
        userId,
        user.role,
        input.client,
        currentRefreshToken,
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
    const currentTokenHash =
      hashRefreshToken(
        refreshToken,
      );

    const nextRefreshToken =
      createRefreshToken();

    const nextTokenHash =
      hashRefreshToken(
        nextRefreshToken,
      );

    const session =
      await this.sessions.rotate(
        currentTokenHash,
        nextTokenHash,
        getSessionExpiration(),
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
      await this.sessions.revoke(
        nextTokenHash,
      );

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
      await this.sessions.revoke(
        nextTokenHash,
      );

      throw new AppError(
        "La cuenta no se encuentra activa.",
        "USER_NOT_ACTIVE",
        403,
      );
    }

    const accessToken =
      await createAccessToken({
        sub:
          user._id.toString(),
        role:
          user.role,
        sessionId:
          session._id.toString(),
      });

    return {
      accessToken,
      refreshToken:
        nextRefreshToken,
      accessTokenExpiresIn:
        ACCESS_TOKEN_TTL_SECONDS,
    };
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

  private async createLoginTokens(
    userId: string,
    role: UserRole,
    client: AuthClient,
    currentRefreshToken?: string,
  ): Promise<AuthTokens> {
    const activeSession =
      await this.sessions
        .findActiveForUser(
          userId,
        );

    if (activeSession) {
      const currentTokenHash =
        currentRefreshToken
          ? hashRefreshToken(
              currentRefreshToken,
            )
          : null;

      if (
        !currentTokenHash ||
        currentTokenHash !==
          activeSession
            .refreshTokenHash
      ) {
        throw new SessionAlreadyActiveError();
      }

      const nextRefreshToken =
        createRefreshToken();

      const rotatedSession =
        await this.sessions.rotate(
          currentTokenHash,
          hashRefreshToken(
            nextRefreshToken,
          ),
          getSessionExpiration(),
        );

      if (rotatedSession) {
        return this.buildTokens(
          userId,
          role,
          rotatedSession
            ._id
            .toString(),
          nextRefreshToken,
        );
      }
    }

    await this.sessions
      .expireInactiveForUser(
        userId,
      );

    const refreshToken =
      createRefreshToken();

    const session =
      await this.sessions.create(
        userId,
        hashRefreshToken(
          refreshToken,
        ),
        getSessionExpiration(),
        client,
      );

    if (!session) {
      const competingSession =
        await this.sessions
          .findActiveForUser(
            userId,
          );

      if (competingSession) {
        throw new SessionAlreadyActiveError();
      }

      throw new AppError(
        "No se pudo crear la sesión.",
        "SESSION_CREATION_FAILED",
        500,
      );
    }

    return this.buildTokens(
      userId,
      role,
      session._id.toString(),
      refreshToken,
    );
  }

  private async buildTokens(
    userId: string,
    role: UserRole,
    sessionId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const accessToken =
      await createAccessToken({
        sub: userId,
        role,
        sessionId,
      });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn:
        ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}