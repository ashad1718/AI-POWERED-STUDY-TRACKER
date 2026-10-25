'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/subject.controller');
const { protect }= require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const {
  idValidation,
  subjectListValidation,
  subjectCreateValidation,
  subjectUpdateValidation,
} = require('../middleware/resource.validation');

router.use(protect);

router.route('/')
  .get(subjectListValidation, validateRequest, controller.getSubjects)
  .post(subjectCreateValidation, validateRequest, controller.createSubject);

router.route('/:id')
  .put(idValidation, subjectUpdateValidation, validateRequest, controller.updateSubject)
  .delete(idValidation, validateRequest, controller.deleteSubject);

module.exports = router;
