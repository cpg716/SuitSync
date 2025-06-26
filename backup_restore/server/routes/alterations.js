const express = require('express');
const router = express.Router();
const alterationsController = require('../controllers/alterationsController');
const { verifyJWT } = require('../controllers/authController');

router.use(verifyJWT);

router.get('/', alterationsController.listAlterations);
router.get('/member/:memberId', alterationsController.getAlterationsByMember);
router.post('/', alterationsController.createAlteration);

module.exports = router;