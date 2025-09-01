import 'dotenv/config';
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

async function main() {
  // These api calls are stateless (Chain Of Thought)
  const SYSTEM_PROMPT = `
    You are an AI assistant who works on START, THINK and OUTPUT format.
    For a given user query first think and breakdown the problem into sub problems.
    You should always keep thinking and thinking before giving the actual output.
    Also, before outputing the final result to user you must check once if everything is correct.

    Rules:
    - Strictly follow the output JSON format
    - Always follow the output in sequence that is START, THINK, EVALUATE and OUTPUT.
    - After evey think, there is going to be an EVALUATE step that is performed manually by someone and you need to wait for it.
    - Always perform only one step at a time and wait for other step.
    - Alway make sure to do multiple steps of thinking before giving out output.

    Output JSON Format:
    { "step": "START | THINK | EVALUATE | OUTPUT", "content": "string" }

    Example:
    User: Can you solve 3 + 4 * 10 - 4 * 3
    ASSISTANT: { "step": "START", "content": "The user wants me to solve 3 + 4 * 10 - 4 * 3 maths problem" } 
    ASSISTANT: { "step": "THINK", "content": "This is typical math problem where we use BODMAS formula for calculation" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "Lets breakdown the problem step by step" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "As per bodmas, first lets solve all multiplications and divisions" }
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" }  
    ASSISTANT: { "step": "THINK", "content": "So, first we need to solve 4 * 10 that is 40" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "Great, now the equation looks like 3 + 40 - 4 * 3" }
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "Now, I can see one more multiplication to be done that is 4 * 3 = 12" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "Great, now the equation looks like 3 + 40 - 12" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "As we have done all multiplications lets do the add and subtract" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "so, 3 + 40 = 43" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "new equations look like 43 - 12 which is 31" } 
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" } 
    ASSISTANT: { "step": "THINK", "content": "great, all steps are done and final result is 31" }
    ASSISTANT: { "step": "EVALUATE", "content": "Alright, Going good" }  
    ASSISTANT: { "step": "OUTPUT", "content": "3 + 4 * 10 - 4 * 3 = 31" } 
  `;

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: 'Write a code in JS to find a prime number as fast as possible',
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: 'gemini-1.5-flash-latest',
      messages: messages,
    });

    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      console.error("Model returned empty content. Exiting.");
      break;
    }

    // ✅ **THE FIX IS HERE** ✅
    // The model is sending multiple JSON objects at once. We need to split them.
    // We split by the markdown fence, which separates each JSON block.
    const jsonBlocks = messageContent.split(/```(?:json)?/).filter(block => block.trim() !== '');

    // If splitting doesn't work, it might be a single valid/invalid block
    if (jsonBlocks.length === 0) {
        jsonBlocks.push(messageContent);
    }


    for (const block of jsonBlocks) {
        let rawContent = block.trim();
        let parsedContent;

        try {
            parsedContent = JSON.parse(rawContent);
        } catch (err) {
            console.error("Failed to parse a JSON block:", rawContent);
            // Continue to the next block instead of crashing
            continue; 
        }

        messages.push({
            role: 'assistant',
            content: JSON.stringify(parsedContent),
        });

        if (parsedContent.step === 'START') {
            console.log(`🔥`, parsedContent.content);
            continue; // Continues the for loop
        }

        if (parsedContent.step === 'THINK') {
            console.log(`\t🧠`, parsedContent.content);

            messages.push({
                role: 'user',
                content: JSON.stringify({
                    step: 'EVALUATE',
                    content: 'Nice, You are going on the correct path',
                }),
            });
            continue; // Continues the for loop
        }

        if (parsedContent.step === 'OUTPUT') {
            console.log(`🤖`, parsedContent.content);
            // We need to exit both the for loop and the while loop
            console.log('Done...');
            return; 
        }
    }
    
    // After processing all blocks, check if the last step was OUTPUT
    // This is a safeguard in case the loop structure changes
    const lastStep = JSON.parse(messages[messages.length - 1].content).step;
    if(lastStep === 'OUTPUT') {
        break;
    }
  }

  console.log('Done...');

 
}

main();