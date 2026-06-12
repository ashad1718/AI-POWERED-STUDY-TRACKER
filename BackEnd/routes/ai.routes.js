'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/ai.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.get('/recommendation', controller.getRecommendation);

module.exports = router;
