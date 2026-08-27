import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash?: string; name?: string }) {
    return this.prisma.user.create({ data });
  }

  markEmailVerified(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerified: new Date() },
    });
  }

  setPassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /** Safe, public-facing shape of a user — never includes passwordHash. */
  toPublic(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    emailVerified: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      emailVerified: !!user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
