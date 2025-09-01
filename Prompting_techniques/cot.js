import 'dotenv/config';
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

async function main() {
  const system_prompt = `
                You are an AI assistant who help me to complete the assignment of my GEN AI course by Brainstorming with me. You are very good in guiding me just like a mentor to me.You have a lot of knowledge about different tools, frameworks, libraries and softwares.

                 Rules:
                - Strictly follow the output JSON format
                - Always follow the output in sequence that is START, THINK, EVALUATE and OUTPUT.
                - After evey think, there is going to be an EVALUATE step that is performed manually by someone and you need to wait for it.
                - Always perform only one step at a time and wait for other step.
                - YOU MUST ONLY output a single JSON object per response. Your entire response must be one, and only one, valid JSON object.
                - Alway make sure to do multiple steps of thinking before giving out output.
               

                **Critical Context:** The program calling you can only parse one JSON object at a time. If you provide more than one JSON object in a single response, the program will crash. It is absolutely essential for you to only respond with a single, complete JSON object.

                Output JSON Format:
                { "step": "start | think| evaluate | output", "content": "string" }

                Example:
                User:"I need to build a Persona AI for a person",
                ASSISTANT:{"step":"start", "content" : "The user wants to build a Persona AI for some Person as an assignment in Gen AI course." },
                ASSISTANT:{"step":"think", "content" : "In order to make someone Persona, You need to gather his/her Information, his career profile,Bio profile, Social Media presence etc." },
                ASSISTANT:{"step":"evaluate", "content" : "Yes, thinking in right direction. Keep going !" },
                ASSISTANT:{"step":"think", "content" : "Lets breakdown this Problem into step by step Manner and create a check list you can follow to complete the assignment in proper manner ." },
                ASSISTANT:{"step":"evaluate", "content" : "Yes right approach." },
                ASSISTANT:{"step":"think", "content" : "First Step is to Gather all the Information about the Person." },
                ASSISTANT:{"step":"evaluate", "content" :"Yes right step keep going." },
                ASSISTANT:{"step":"think", "content" : "second step is to write a Proper and detailed System Prompt to give detailed context to AI about how to speak or reply to queries" },
                ASSISTANT:{"step":"evaluate", "content" : "Yes right, keep going." },
                ASSISTANT:{"step":"think", "content" : "Third step is to use Prompt engineering methods like few shots or chain of thought method for more detailed and accurate answers." },
                ASSISTANT:{"step":"evaluate", "content" : "Yes right, but can I deduce which one will be better for this case." },
                ASSISTANT:{"step":"think", "content" : "[Third step refined] for this case I think few shots Prompt method will be beneficial as you know how the desired Persona might reply to queries by the information you have collected. " },
                ASSISTANT:{"step":"evaluate", "content" : "Yes, now it's more refined, keep going." },
                ASSISTANT:{"step":"think", "content" : "Fourth step is to test the program or your prompt and refine it by putting more examples of the desired Persona you want. " },
                ASSISTANT:{"step":"evaluate", "content" : "Yes right, keep going." },
                ASSISTANT:{"step":"think", "content" : "Fifth and final step is to deploy your program or prompt on a platform where users can interact with the desired Persona. " },
                ASSISTANT:{"step":"evaluate", "content" : "Yes, you are done. " },
                ASSISTANT:{"step":"output", "content" : "You can follow These steps to complete the assignment in proper order. All the best! Kudos . " }
    `;

    const messages = [
    {
      role: 'system',
      content: system_prompt,
    },
    {
      role: 'user',
      content: 'I have to build a CLI that can clone websites.',
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "gemini-1.5-flash-latest",
      messages: messages,
    });

    let rawContent = response.choices[0]?.message?.content;

    // Remove code block markers if present
    rawContent = rawContent?.trim();
    if (rawContent?.startsWith('```')) {
      rawContent = rawContent.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (err) {
      console.error("Failed to parse JSON from model:", rawContent);
      throw err;
    }

    messages.push({
      role: "assistant",
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === "start") {
      console.log(`🔥`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === "think") {
      console.log(`\t🧠`, parsedContent.content);

      messages.push({
        role: "user",
        content: JSON.stringify({
          step: 'EVALUATE',
          content: 'Nice, You are going on the right path',
        }),
      });

      continue;
    }

    if (parsedContent.step === "output") {
      console.log(`🤖`, parsedContent.content);
      break;
    }
  }

  console.log("Done...");
}

main();
