'use strict';

const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth.middleware');
const plannerCtrl = require('../controllers/planner.controller');
const { validateRequest } = require('../middleware/validation.middleware');
const { plannerQueryValidation } = require('../middleware/resource.validation');

// All planner routes require authentication
router.use(protect);

router.get('/daily',  plannerQueryValidation, validateRequest, plannerCtrl.getDailyPlan);
router.get('/weekly', plannerQueryValidation, validateRequest, plannerCtrl.getWeeklyPlan);

module.exports = router;
