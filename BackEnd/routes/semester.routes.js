'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/semester.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

// Endpoint for retrieving progress
router.get('/', controller.getSemesterProgress);

// Endpoint for setting up a new semester
router.post('/setup', controller.setupNewSemester);

module.exports = router;
