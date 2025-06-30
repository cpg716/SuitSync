import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        lightspeedEmployeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        lightspeedEmployeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role, photoUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { name, email, role, photoUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        lightspeedEmployeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, photoUrl } = req.body;
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }
    let passwordHash = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        photoUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        lightspeedEmployeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUserPhoto = async (req: Request, res: Response) => {
  // Implementation of updateUserPhoto method
}; 