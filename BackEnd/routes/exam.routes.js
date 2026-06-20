'use strict';

const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth.middleware');
const examCtrl    = require('../controllers/exam.controller');

// All exam routes require authentication
router.use(protect);

router.get('/predictions', examCtrl.getPredictions);
router.post('/',            examCtrl.createExam);
router.put('/:id',          examCtrl.updateExam);
router.delete('/:id',       examCtrl.deleteExam);

module.exports = router;
