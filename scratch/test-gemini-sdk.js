'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

const { GoogleGenAI } = require('@google/genai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('GEMINI_API_KEY from .env:', apiKey ? 'Loaded' : 'Not Found');
  console.log('GEMINI_MODEL from .env:', process.env.GEMINI_MODEL);

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1'
  });

  console.log('\n--- 1. Testing List Models ---');
  try {
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    const models = [];
    for await (const modelInfo of pager) {
      models.push(modelInfo.name);
    }
    console.log('Available models:', models);
  } catch (err) {
    console.error('List models failed:', err);
  }

  console.log('\n--- 2. Testing Generate Content with gemini-2.5-flash ---');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, respond with success.',
    });
    console.log('gemini-2.5-flash response:', response.text);
  } catch (err) {
    console.error('gemini-2.5-flash failed:', err);
  }

  console.log('\n--- 3. Testing Generate Content with gemini-1.5-flash ---');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hello, respond with success.',
    });
    console.log('gemini-1.5-flash response:', response.text);
  } catch (err) {
    console.error('gemini-1.5-flash failed:', err);
  }
}

main().catch(console.error);
