'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/achievement.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.get('/', controller.getAchievements);

module.exports = router;
