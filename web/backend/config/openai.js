require("dotenv").config();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // key trong .env
});

module.exports = client;
