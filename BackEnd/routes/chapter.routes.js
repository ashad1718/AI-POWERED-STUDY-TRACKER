'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/chapter.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(controller.getChapters)
  .post(controller.createChapter);

router.route('/:id')
  .put(controller.updateChapter)
  .delete(controller.deleteChapter);

module.exports = router;
