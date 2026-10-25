'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/user.controller');
const { protect }= require('../middleware/auth.middleware');
const { rejectUnknownFields, validateRequest } = require('../middleware/validation.middleware');
const { updatePasswordValidators } = require('../middleware/auth.validation');
const { profileUpdateValidation } = require('../middleware/resource.validation');

router.use(protect); // all user routes are protected

router.get('/',             controller.getMe);
router.get('/me',           controller.getMe);
router.patch('/me',         profileUpdateValidation, validateRequest, controller.updateMe);
router.patch(
  '/me/password',
  rejectUnknownFields('body', ['currentPassword', 'newPassword']),
  updatePasswordValidators,
  validateRequest,
  controller.updatePassword
);

module.exports = router;
