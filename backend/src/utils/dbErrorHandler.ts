import logger from './logger';

export const handlePrismaError = (error: any) => {
  if (error.code === 'P2002') {
    return { status: 409, message: 'Unique constraint violation' };
  }
  if (error.code === 'P2025') {
    return { status: 404, message: 'Record not found' };
  }
  if (error.code === 'P2003') {
    return { status: 400, message: 'Foreign key constraint failed' };
  }
  if (error.code === 'P2014') {
    return { status: 400, message: 'Invalid ID provided' };
  }
  
  logger.error('Database error:', error);
  return { status: 500, message: 'Database operation failed' };
};