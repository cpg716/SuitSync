import express from 'express';
import { getUsers, getUser, updateUser, deleteUser, getCurrentUser, createUser, getUserActivity, syncUsers, getUserPinInfo, adminSetUserPin, adminRemoveUserPin } from '../controllers/usersController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.get('/', asyncHandler(getUsers));
router.get('/current', asyncHandler(getCurrentUser));
router.post('/sync', asyncHandler(syncUsers));
router.get('/:id/activity', asyncHandler(getUserActivity));
router.get('/:id/pin-info', asyncHandler(getUserPinInfo));
router.post('/:id/admin-set-pin', asyncHandler(adminSetUserPin));
router.delete('/:id/admin-remove-pin', asyncHandler(adminRemoveUserPin));
router.get('/:id', asyncHandler(getUser));
router.put('/:id', asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));

export default router;