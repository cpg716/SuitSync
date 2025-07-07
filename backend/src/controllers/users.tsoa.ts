import { Controller, Get, Path, Route, Tags } from 'tsoa';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

@Route('users')
@Tags('Users')
export class UserController extends Controller {
  /** List all users */
  @Get('/')
  public async list(): Promise<any[]> {
    return prisma.user.findMany();
  }

  /** Get user by ID */
  @Get('{id}')
  public async getById(@Path() id: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { id: Number(id) } });
  }
} 