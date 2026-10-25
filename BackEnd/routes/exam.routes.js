'use strict';

const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth.middleware');
const examCtrl    = require('../controllers/exam.controller');
const { validateRequest } = require('../middleware/validation.middleware');
const {
  idValidation,
  examCreateValidation,
  examUpdateValidation,
} = require('../middleware/resource.validation');

// All exam routes require authentication
router.use(protect);

router.get('/predictions', examCtrl.getPredictions);
router.post('/',            examCreateValidation, validateRequest, examCtrl.createExam);
router.put('/:id',          idValidation, examUpdateValidation, validateRequest, examCtrl.updateExam);
router.delete('/:id',       idValidation, validateRequest, examCtrl.deleteExam);

module.exports = router;
