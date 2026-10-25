'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/stats.controller');
const { protect }= require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { weeklyStatsQueryValidation } = require('../middleware/resource.validation');

router.use(protect);

router.get('/overview',  controller.getOverview);
router.get('/weekly',    weeklyStatsQueryValidation, validateRequest, controller.getWeekly);
router.get('/subjects',  controller.getSubjects);
router.get('/heatmap',   controller.getHeatmap);

module.exports = router;
