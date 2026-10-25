'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/chapter.controller');
const { protect }= require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const {
  idValidation,
  chapterListValidation,
  chapterCreateValidation,
  chapterUpdateValidation,
} = require('../middleware/resource.validation');

router.use(protect);

router.route('/')
  .get(chapterListValidation, validateRequest, controller.getChapters)
  .post(chapterCreateValidation, validateRequest, controller.createChapter);

router.route('/:id')
  .put(idValidation, chapterUpdateValidation, validateRequest, controller.updateChapter)
  .delete(idValidation, validateRequest, controller.deleteChapter);

module.exports = router;
