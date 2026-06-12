'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/session.controller');
const { protect }= require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .post(controller.createSession)
  .get(controller.getSessions);

router.route('/:id')
  .get(controller.getSession)
  .delete(controller.deleteSession);

module.exports = router;
