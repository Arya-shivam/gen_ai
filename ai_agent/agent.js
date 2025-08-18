import 'dotenv/config';
import { OpenAI } from 'openai';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function getWeatherDetailsByCity(cityname = '') {
  const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: 'text' });
  return `The current weather of ${cityname} is ${data}`;
}

function extractJson(text) {
  // Matches a JSON code block and captures the content inside
  const jsonRegex = /```json\n([\s\S]*?)\n```/;
  const match = text.match(jsonRegex);
  
  if (match && match[1]) {
    // match[1] contains the captured JSON string
    return match[1];
  }
  
  // If no JSON block is found, maybe the response is already raw JSON
  // Or handle the case where no JSON is found
  return text; 
}


async function main() {

     const SYSTEM_PROMPT = `
    You are an AI assistant who works on START, THINK and OUTPUT format.
    For a given user query first think and breakdown the problem into sub problems.
    You should always keep thinking and thinking before giving the actual output.
    
    Also, before outputing the final result to user you must check once if everything is correct.
    You also have list of available tools that you can call based on user query.
    
    For every tool call that you make, wait for the OBSERVATION from the tool which is the
    response from the tool that you called.

    Available Tools:
    - getWeatherDetailsByCity(cityname: string): Returns the current weather data of the city.
    - getGithubUserInfoByUsername(username: string): Retuns the public info about the github user using github api
    - executeCommand(command: string): Takes a linux / unix command as arg and executes the command on user's machine and returns the output

    Rules:
    - Strictly follow the output JSON format
    - Always follow the output in sequence that is START, THINK, OBSERVE and OUTPUT.
    - Always perform only one step at a time and wait for other step.
    - Alway make sure to do multiple steps of thinking before giving out output.
    - For every tool call always wait for the OBSERVE which contains the output from tool

    Output JSON Format:
    { "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": "STRING" }

    Example:
    User: Hey, can you tell me weather of Patiala?
    ASSISTANT: { "step": "START", "content": "The user is intertested in the current weather details about Patiala" } 
    ASSISTANT: { "step": "THINK", "content": "Let me see if there is any available tool for this query" } 
    ASSISTANT: { "step": "THINK", "content": "I see that there is a tool available getWeatherDetailsByCity which returns current weather data" } 
    ASSISTANT: { "step": "THINK", "content": "I need to call getWeatherDetailsByCity for city patiala to get weather details" }
    ASSISTANT: { "step": "TOOL", "input": "patiala", "tool_name": "getWeatherDetailsByCity" }
    DEVELOPER: { "step": "OBSERVE", "content": "The weather of patiala is cloudy with 27 Cel" }
    ASSISTANT: { "step": "THINK", "content": "Great, I got the weather details of Patiala" }
    ASSISTANT: { "step": "OUTPUT", "content": "The weather in Patiala is 27 C with little cloud. Please make sure to carry an umbrella with you. ☔️" }


    Output Format ( Strict ):
    Only provide content part as output,
    Do not provide in Markdown format 
  `;

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content:
        'whats the weather of Patiala ?',
    },
  ];

//   while (true) {
//     const response = await client.chat.completions.create({
//       model: 'gemini-2.0-flash-exp',
//       messages: messages,
//     // });

//     console.log(response.choices[0].message.content);
//   }

 while (true) {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash-exp',
      messages: messages,
    });

    const rawContent = response.choices[0].message.content;
    const JsonContent = extractJson(rawContent)
    const parsedContent = JSON.parse(JsonContent);

    messages.push({
      role: 'assistant',
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === 'START') {
      console.log(`🔥`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'THINK') {
      console.log(`\t🧠`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'TOOL') {
      const toolToCall = parsedContent.tool_name;
      if (!TOOL_MAP[toolToCall]) {
        messages.push({
          role: 'developer',
          content: `There is no such tool as ${toolToCall}`,
        });
        continue;
      }

      const responseFromTool = await TOOL_MAP[toolToCall](parsedContent.input);
      console.log(
        `🛠️: ${toolToCall}(${parsedContent.input}) = `,
        responseFromTool
      );
      messages.push({
        role: 'developer',
        content: JSON.stringify({ step: 'OBSERVE', content: responseFromTool }),
      });
      continue;
    }

    if (parsedContent.step === 'OUTPUT') {
      console.log(`🤖`, parsedContent.content);
      break;
    }
  }

}
main();
