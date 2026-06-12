'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/stats.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.get('/overview',  controller.getOverview);
router.get('/weekly',    controller.getWeekly);
router.get('/subjects',  controller.getSubjects);

module.exports = router;
