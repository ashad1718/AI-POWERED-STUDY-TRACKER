'use strict';

const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth.middleware');
const plannerCtrl = require('../controllers/planner.controller');

// All planner routes require authentication
router.use(protect);

router.get('/daily',  plannerCtrl.getDailyPlan);
router.get('/weekly', plannerCtrl.getWeeklyPlan);

module.exports = router;
