'use strict';

const { GoogleGenAI } = require('@google/genai');

const PRIMARY_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash'
];
const API_VERSION = 'v1';

let aiClient = null;

/**
 * Initializes and returns the Gemini SDK client.
 */
const getAIClient = () => {
  if (aiClient) {
    return aiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  aiClient = new GoogleGenAI({
    apiKey,
    apiVersion: API_VERSION
  });

  return aiClient;
};

/**
 * Returns the candidate list of models to try, starting with the environment configured model,
 * then primary model, then fallback models.
 */
const getModelsToTry = () => {
  const models = [];
  
  if (process.env.GEMINI_MODEL) {
    const customModel = process.env.GEMINI_MODEL.replace(/^models\//, '').trim();
    if (customModel) {
      models.push(customModel);
    }
  }

  models.push(PRIMARY_MODEL);
  FALLBACK_MODELS.forEach(m => models.push(m));

  // Deduplicate candidate models
  return [...new Set(models)];
};

module.exports = {
  getAIClient,
  getModelsToTry,
  PRIMARY_MODEL,
  FALLBACK_MODELS,
  API_VERSION
};
