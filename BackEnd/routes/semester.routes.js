'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/semester.controller');
const { protect }= require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { semesterSetupValidation } = require('../middleware/resource.validation');

router.use(protect);

// Endpoint for retrieving progress
router.get('/', controller.getSemesterProgress);

// Endpoint for setting up a new semester
router.post('/setup', semesterSetupValidation, validateRequest, controller.setupNewSemester);

module.exports = router;
