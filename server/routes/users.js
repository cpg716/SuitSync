const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '../../public/uploads') });
const { getAllUsersSimple } = require('../controllers/usersController');

router.use(authMiddleware);

router.get('/', usersController.getUsers);
router.get('/all-simple', getAllUsersSimple);
router.get('/current', usersController.getCurrentUser);
router.get('/list', usersController.listUsers);
router.get('/lightspeed/employees', usersController.listLightspeedEmployees);
router.get('/:id', usersController.getUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);
router.post('/:id/photo', upload.single('photo'), usersController.uploadUserPhoto);
router.get('/:id/schedule', usersController.getUserSchedule);
router.put('/:id/schedule', usersController.updateUserSchedule);
router.post('/:id/schedule/confirm', usersController.confirmUserSchedule);
router.get('/:id/schedule/conflicts', usersController.getUserScheduleConflicts);

module.exports = router; 