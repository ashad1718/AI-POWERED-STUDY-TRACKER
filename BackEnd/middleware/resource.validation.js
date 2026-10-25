'use strict';

const { body, param, query } = require('express-validator');
const { rejectUnknownFields } = require('./validation.middleware');

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

const optional = (chain) => chain.optional({ values: 'undefined' });

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999) return false;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const numericValue = (value) => {
  if (typeof value === 'boolean' || value === null || value === undefined) return NaN;
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && !DECIMAL_PATTERN.test(value.trim())) return NaN;

  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

const stringField = (source, field, label, {
  required = false,
  max = 120,
  allowEmpty = false,
} = {}) => {
  let chain = source(field);
  if (!required) chain = optional(chain);

  chain = chain
    .isString().withMessage(`${label} must be a string.`)
    .bail()
    .trim();
  if (!allowEmpty) chain = chain.notEmpty().withMessage(`${label} is required.`);
  return chain.isLength({ max }).withMessage(`${label} cannot exceed ${max} characters.`);
};

const dateField = (source, field, label, { required = false } = {}) => {
  let chain = source(field);
  if (!required) chain = optional(chain);

  return chain
    .custom(isValidDateOnly)
    .withMessage(`${label} must be a valid date in YYYY-MM-DD format.`);
};

const numberField = (source, field, label, {
  required = false,
  integer = false,
  min,
  max,
} = {}) => {
  let chain = source(field);
  if (!required) chain = optional(chain);

  return chain
    .custom((value) => {
      const number = numericValue(value);
      if (!Number.isFinite(number)) return false;
      if (integer && !Number.isInteger(number)) return false;
      if (min !== undefined && number < min) return false;
      if (max !== undefined && number > max) return false;
      return true;
    })
    .withMessage(`${label} must be a finite ${integer ? 'integer' : 'number'}${min !== undefined ? ` from ${min}` : ''}${max !== undefined ? ` to ${max}` : ''}.`)
    .customSanitizer((value) => numericValue(value));
};

const booleanField = (source, field, label, { required = false } = {}) => {
  let chain = source(field);
  if (!required) chain = optional(chain);

  return chain
    .custom((value) => value === true || value === false || value === 'true' || value === 'false')
    .withMessage(`${label} must be a boolean.`)
    .customSanitizer((value) => value === true || value === 'true');
};

const uuidField = (source, field, label, { required = false } = {}) => {
  let chain = source(field);
  if (!required) chain = optional(chain);

  return chain
    .isUUID(4)
    .withMessage(`${label} must be a valid UUID.`);
};

const objectField = (field, label, allowedFields) => body(field)
  .optional({ values: 'undefined' })
  .custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} must be an object.`);
    }

    const unknownFields = Object.keys(value).filter((key) => !allowedFields.includes(key));
    if (unknownFields.length > 0) {
      throw new Error(`Unexpected ${label} field(s): ${unknownFields.join(', ')}.`);
    }
    if (Object.keys(value).length === 0) {
      throw new Error(`${label} must contain at least one field.`);
    }
    return true;
  });

const dateRange = (endSource, endField, startField, message) => endSource(endField)
  .optional({ values: 'undefined' })
  .custom((value, { req }) => !req[endSource === query ? 'query' : 'body'][startField] || value > req[endSource === query ? 'query' : 'body'][startField])
  .withMessage(message);

const bodyOnly = (fields, options) => rejectUnknownFields('body', fields, options);
const queryOnly = (fields) => rejectUnknownFields('query', fields);

const subjectListValidation = [
  queryOnly(['active', 'isArchived']),
  booleanField(query, 'active', 'Active filter'),
  booleanField(query, 'isArchived', 'Archived filter'),
];

const subjectCreateValidation = [
  bodyOnly(['name', 'completionThreshold', 'completionRule', 'active', 'order']),
  stringField(body, 'name', 'Subject name', { required: true }),
  objectField('completionThreshold', 'Completion threshold', ['sessions', 'hours']),
  numberField(body, 'completionThreshold.sessions', 'Completion session threshold', { integer: true, min: 1, max: 10000 }),
  numberField(body, 'completionThreshold.hours', 'Completion hour threshold', { min: 0.1, max: 100000 }),
  optional(body('completionRule'))
    .isString().withMessage('Completion rule must be a string.')
    .isIn(['first_session', 'sixty_minutes', 'custom_threshold'])
    .withMessage('Invalid completion rule.'),
  booleanField(body, 'active', 'Active flag'),
  numberField(body, 'order', 'Subject order', { integer: true, min: 0, max: 100000 }),
];

const subjectUpdateValidation = [
  bodyOnly(['name', 'active', 'isArchived', 'completionThreshold', 'completionRule', 'order'], { requireOne: true }),
  stringField(body, 'name', 'Subject name'),
  booleanField(body, 'active', 'Active flag'),
  booleanField(body, 'isArchived', 'Archived flag'),
  objectField('completionThreshold', 'Completion threshold', ['sessions', 'hours']),
  numberField(body, 'completionThreshold.sessions', 'Completion session threshold', { integer: true, min: 1, max: 10000 }),
  numberField(body, 'completionThreshold.hours', 'Completion hour threshold', { min: 0.1, max: 100000 }),
  optional(body('completionRule'))
    .isString().withMessage('Completion rule must be a string.')
    .isIn(['first_session', 'sixty_minutes', 'custom_threshold'])
    .withMessage('Invalid completion rule.'),
  numberField(body, 'order', 'Subject order', { integer: true, min: 0, max: 100000 }),
];

const chapterListValidation = [
  queryOnly(['subjectId']),
  uuidField(query, 'subjectId', 'Subject ID'),
];

const chapterCreateValidation = [
  bodyOnly(['subjectId', 'name', 'completed', 'order', 'estimatedTime']),
  uuidField(body, 'subjectId', 'Subject ID', { required: true }),
  stringField(body, 'name', 'Chapter name', { required: true }),
  booleanField(body, 'completed', 'Completed flag'),
  numberField(body, 'order', 'Chapter order', { integer: true, min: 0, max: 100000 }),
  numberField(body, 'estimatedTime', 'Estimated completion time', { required: true, min: 0.1, max: 100000 }),
];

const chapterUpdateValidation = [
  bodyOnly(['name', 'completed', 'completedMethod', 'order', 'estimatedTime'], { requireOne: true }),
  stringField(body, 'name', 'Chapter name'),
  booleanField(body, 'completed', 'Completed flag'),
  optional(body('completedMethod'))
    .isString().withMessage('Completed method must be a string.')
    .isIn(['manual', 'none'])
    .withMessage('Completed method must be manual or none.'),
  numberField(body, 'order', 'Chapter order', { integer: true, min: 0, max: 100000 }),
  numberField(body, 'estimatedTime', 'Estimated completion time', { min: 0.1, max: 100000 }),
];

const sessionCreateValidation = [
  bodyOnly(['subject', 'subjectId', 'chapterId', 'duration', 'date']),
  stringField(body, 'subject', 'Subject name'),
  uuidField(body, 'subjectId', 'Subject ID'),
  uuidField(body, 'chapterId', 'Chapter ID'),
  numberField(body, 'duration', 'Session duration', { required: true, integer: true, min: 1, max: 1440 }),
  dateField(body, 'date', 'Session date', { required: true }),
];

const sessionListValidation = [
  queryOnly(['page', 'limit', 'from', 'to']),
  numberField(query, 'page', 'Page', { integer: true, min: 1, max: 100000 }),
  numberField(query, 'limit', 'Page size', { integer: true, min: 1, max: 100 }),
  dateField(query, 'from', 'Start date'),
  dateField(query, 'to', 'End date'),
  dateRange(query, 'to', 'from', 'End date must be on or after start date.'),
];

const examCreateValidation = [
  bodyOnly(['subjectId', 'date']),
  uuidField(body, 'subjectId', 'Subject ID', { required: true }),
  dateField(body, 'date', 'Exam date', { required: true }),
];

const examUpdateValidation = [
  bodyOnly(['date']),
  dateField(body, 'date', 'Exam date', { required: true }),
];

const semesterSetupValidation = [
  bodyOnly(['name', 'startDate', 'endDate', 'expectedHoursPerWeek', 'goalGPA', 'archiveActive', 'newSubjects']),
  stringField(body, 'name', 'Semester name', { required: true, max: 100 }),
  dateField(body, 'startDate', 'Start date', { required: true }),
  dateField(body, 'endDate', 'End date', { required: true }),
  dateRange(body, 'endDate', 'startDate', 'End date must be after start date.'),
  numberField(body, 'expectedHoursPerWeek', 'Expected study hours per week', { required: true, min: 0.5, max: 168 }),
  numberField(body, 'goalGPA', 'Goal GPA', { min: 0, max: 10 }),
  booleanField(body, 'archiveActive', 'Archive active flag'),
  body('newSubjects')
    .isArray({ min: 1, max: 100 })
    .withMessage('New subjects must be a non-empty array of at most 100 subjects.')
    .custom((subjects) => new Set(subjects.map((subject) => typeof subject === 'string' ? subject.trim().toLowerCase() : subject)).size === subjects.length)
    .withMessage('New subjects must not contain duplicates.'),
  body('newSubjects.*')
    .isString().withMessage('Each new subject must be a string.')
    .bail()
    .trim()
    .notEmpty().withMessage('New subject names cannot be empty.')
    .isLength({ max: 120 }).withMessage('New subject names cannot exceed 120 characters.'),
];

const profileUpdateValidation = [
  bodyOnly(['name', 'location', 'avatarUrl'], { requireOne: true }),
  stringField(body, 'name', 'Name', { max: 60 }),
  stringField(body, 'location', 'Location', { max: 120, allowEmpty: true }),
  stringField(body, 'avatarUrl', 'Avatar URL', { max: 2048, allowEmpty: true }),
];

const chatValidation = [
  bodyOnly(['message']),
  stringField(body, 'message', 'Message', { required: true, max: 4000 }),
];

const emptyBodyValidation = [bodyOnly([])];

const plannerQueryValidation = [
  queryOnly(['initial']),
  booleanField(query, 'initial', 'Initial-load flag'),
];

const weeklyStatsQueryValidation = [
  queryOnly(['week']),
  dateField(query, 'week', 'Week date'),
];

const idValidation = [param('id').isUUID(4).withMessage('ID must be a valid UUID.')];

module.exports = {
  idValidation,
  subjectListValidation,
  subjectCreateValidation,
  subjectUpdateValidation,
  chapterListValidation,
  chapterCreateValidation,
  chapterUpdateValidation,
  sessionCreateValidation,
  sessionListValidation,
  examCreateValidation,
  examUpdateValidation,
  semesterSetupValidation,
  profileUpdateValidation,
  chatValidation,
  emptyBodyValidation,
  plannerQueryValidation,
  weeklyStatsQueryValidation,
};
