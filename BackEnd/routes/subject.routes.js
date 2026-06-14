'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/subject.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(controller.getSubjects)
  .post(controller.createSubject);

router.route('/:id')
  .put(controller.updateSubject)
  .delete(controller.deleteSubject);

module.exports = router;
