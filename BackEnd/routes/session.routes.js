'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/session.controller');
const { protect }= require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const {
  idValidation,
  sessionCreateValidation,
  sessionListValidation,
} = require('../middleware/resource.validation');

router.use(protect);

router.route('/')
  .post(sessionCreateValidation, validateRequest, controller.createSession)
  .get(sessionListValidation, validateRequest, controller.getSessions);

router.route('/:id')
  .get(idValidation, validateRequest, controller.getSession)
  .delete(idValidation, validateRequest, controller.deleteSession);

module.exports = router;
