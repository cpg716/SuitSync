import { asyncHandler } from '../utils/asyncHandler';

describe('Utils', () => {
  describe('asyncHandler', () => {
    it('should handle async functions correctly', async () => {
      const mockReq = {} as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as any;
      const mockNext = jest.fn();

      const testHandler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      await testHandler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next middleware', async () => {
      const mockReq = {} as any;
      const mockRes = {} as any;
      const mockNext = jest.fn();

      const testHandler = asyncHandler(async () => {
        throw new Error('Test error');
      });

      await testHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 