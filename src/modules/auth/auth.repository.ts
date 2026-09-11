import {
  UserRepository,
} from "@/modules/users/user.repository";

import type {
  CreateUserData,
  UserDocument,
} from "@/modules/users/user.types";

export class AuthRepository {
  private readonly userRepository =
    new UserRepository();

  async findUserByEmail(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userRepository.findByEmail(
      email,
    );
  }

  async findUserById(
    id: string,
  ): Promise<UserDocument | null> {
    return this.userRepository.findById(
      id,
    );
  }

  async createUser(
    data: CreateUserData,
  ): Promise<UserDocument> {
    return this.userRepository.create(
      data,
    );
  }
}