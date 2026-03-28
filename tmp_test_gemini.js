import './polyfill.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    console.log('Testing Gemini API key...');
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond with "OK"' }] }],
    });
    console.log('Response:', response.text);
    console.log('Success!');
  } catch (error) {
    console.error('Gemini API Error:', error);
  }
}

test();
