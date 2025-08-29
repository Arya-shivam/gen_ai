import 'dotenv/config';
import { Agent, run } from '@openai/agents';
import { aisdk } from '@openai/agents-extensions';
import { google } from '@ai-sdk/google';

const SYSTEM_PROMPT = `You are a helpful agent that assists the user by completing given tasks.`;

// Wrap Google Gemini with aisdk using the updated API
const model = aisdk(
        google("gemini-2.0-flash-exp", {
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    })
);

// Create the Agent
const agent = new Agent({
  name: "my-agent",
  instructions: SYSTEM_PROMPT,
  model,
});
 
// Run the Agent
const response = await run(agent, "When did sharks first appear?");
console.log(response.finalOutput);
