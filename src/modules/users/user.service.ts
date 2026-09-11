import type {
  PublicUser,
  UserDocument,
} from "./user.types";

export class UserService {
  static toPublicUser(
    user: UserDocument,
  ): PublicUser {
    if (!user._id) {
      throw new Error(
        "El usuario no posee un identificador.",
      );
    }

    return {
      id: user._id.toString(),

      name: user.name,
      email: user.email,

      role: user.role,
      status: user.status,

      emailVerified:
        user.emailVerified,

      createdAt:
        user.createdAt.toISOString(),

      updatedAt:
        user.updatedAt.toISOString(),
    };
  }
}