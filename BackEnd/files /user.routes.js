'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/user.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect); // all user routes are protected

router.get('/',             controller.getMe);
router.get('/me',           controller.getMe);
router.patch('/me',         controller.updateMe);
router.patch('/me/password',controller.updatePassword);

module.exports = router;
