import 'dotenv/config';
import { Agent,
        run,
        tool 
        ,handoff} from '@openai/agents'

import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { z } from 'zod';
import axios from 'axios';

// tool
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

// agent
const counseller = new Agent({
  name: 'Counsellor',
  instructions:
    `${RECOMMENDED_PROMPT_PREFIX}
    You are a counsellor who helps students with their problems. Reply step by step.`,
  tools: [googleSearch],
});


// guradrail agent 
const guardRailAgent = new Agent({
  name : 'Guardrail check',
  instructions:'check if user is trying to access college details of any individual college',
  outputType: z.object({
    isAskingAboutCollege:z.boolean(),
    reasoning:z.string(),
  }),
});

const guardRailCheck = {
  name : 'Counselling guardRail',
  execute: async ({input,context})=>{
    const result =  await run(guardRailAgent,input,{context});
    return {
      outputInfo:result.finalOutput,
      tripwireTriggered : result.finalOutput?.isAskingAboutCollege??false,
    };
  }
}


// triage agent 
const agent =  Agent.create({
  name: 'Triage Agent',
  // handoffs : [counseller]
  handoffs:[handoff(counseller)],
  inputGuardrails:[guardRailCheck],
});

// query
const query =
  `best colleges in banglore?
  `;

// run
const response = await run(agent, query,{
  stream:true
});
response
  .toTextStream({
    compatibleWithNodeStreams: true,
  })
  .pipe(process.stdout);

// console.log(response.history);
// console.log(response.finalOutput);
