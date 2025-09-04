import 'dotenv/config';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import axios from 'axios';

const googleSearch = tool({
  name: 'googleSearch',
  description: 'This tool helps you search on Google',
  parameters: z.object({
    query: z.string().describe('Query to search on Google'),
  }),
  async execute({ query }) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0' }, // helps avoid 403s
    });
    return data;
  },
});

const agent = new Agent({
  name: 'Basic Agent',
  instructions:
    'You are a day-to-day agent helping with college and life. Reply step by step.',
  tools: [googleSearch],
});

const query =
  'My college is in Bangalore, can you give me some details about it, like weather?';

const response = await run(agent, query);

console.log(response.history);
console.log(response.finalOutput);
