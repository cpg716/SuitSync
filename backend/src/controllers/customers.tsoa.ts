import { Controller, Get, Path, Route, Tags } from 'tsoa';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

@Route('customers')
@Tags('Customers')
export class CustomerController extends Controller {
  /** List all customers */
  @Get('/')
  public async list(): Promise<any[]> {
    return prisma.customer.findMany();
  }

  /** Get customer by ID */
  @Get('{id}')
  public async getById(@Path() id: string): Promise<any | null> {
    return prisma.customer.findUnique({ where: { id: Number(id) } });
  }
} 