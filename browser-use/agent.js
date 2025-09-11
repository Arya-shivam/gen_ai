import 'dotenv/config';
import {Agent, run ,tool} from '@openai/agents';   
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { chromium } from 'playwright';
import { z } from 'zod';
import OpenAI from 'openai';
import fs from 'fs';


const openai = new OpenAI();

// - launching browser--
console.log('🚀 Launching browser...');
const browser = await chromium.launch({
  headless: false,
//   chromiumSandbox: true,
//   env: {},
  args: ['--disable-extensions', '--disable-file-system'],
});
console.log('✅ Browser launched.');

// to store browser state 
const browserState = {
  page: null,
  lastScreenshotPath: 'current_view.png', // Consistent file name for screenshots
  currentPageElements: [], // Store the elements found by the vision model
};

// helper fucntion to analyze image in base64 format 
async function analyzeScreenshot(imageBuffer){
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
                Analyze this screenshot of a webpage. Your goal is to identify all interactive elements, including buttons, links, and input fields.
                For each element, provide a unique 'id' (integer, starting from 1), and a clear 'description' of its purpose (e.g., "Sign in button", "Username input field").
                Return the result as a JSON object with a single key "elements". Each element object should have an "id" and a "description".
              `,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 1024,
    });
    const result = JSON.parse(response.choices[0].message.content);
    return result.elements || [];
  } catch (error) {
    console.error("Error analyzing image with OpenAI:", error);
    return [];
  }
}


const open_webpage = tool({
    name : 'open_webpage',
    description: 'This tool helps you open a webpage',
    parameters:z.object({}),
    async execute(){
        if(!browserState.page){
            browserState.page = await browser.newPage();
            return 'A new browser page is open';
        }
        return 'A browser page is already open';
    },
})


const go_to_url = tool({
    name: 'go_to_url',
    description:'This tool is used to navigate the current page to a specified url',
    parameters:z.object({
        url:z.string().describe('Url to navigate to'),
    }),
    async execute({url}){
        if(!browserState.page){
            console.log('Opening a new page');
            browserState.page = await browser.newPage();
        }
        await browserState.page.goto(url, {waitUntil: 'networkidle'});
        return 'Navigated to the url';
    }
})


const take_screenshot = tool({
    name: 'take_screenshot',
    description: 'This tool helps you take a screenshot of the current page',
    parameters: z.object({}),
    async execute() {
        if(!browserState.page){
            return 'No page is open';
        }
        await browserState.page.screenshot({path: browserState.lastScreenshotPath});
        return `Screenshot saved to ${browserState.lastScreenshotPath}`;
    },
})

const analyze_elements = tool({
    name: 'analyze_elements',
    description: 'This tool helps you analyze the current page and identify all interactive elements, including buttons, links, and input fields. For each element, provide a unique "id" (integer, starting from 1), and a clear "description" of its purpose (e.g., "Sign in button", "Username input field"). Return the result as a JSON object with a single key "elements". Each element object should have an "id" and a "description".',
    parameters: z.object({}),
    async execute(){
    if (!fs.existsSync(browserState.lastScreenshotPath)) {
        return "Error: No screenshot found. Please use 'take_screenshot' first.";
    }
    console.log('🤖 Analyzing screenshot with vision model...');
    const screenshotBuffer = fs.readFileSync(browserState.lastScreenshotPath);
    const elements = await analyzeScreenshot(screenshotBuffer);
    
    browserState.currentPageElements = elements;
    
    const formattedElements = elements.map(e => `[${e.id}] ${e.description}`).join('\n');
    return `Analysis complete. Found the following interactive elements:\n${formattedElements}`;
  },
})

const input_text= tool({
    name: 'input_text',
    description: 'This tool helps you input text into a form field',
    parameters: z.object({
        index: z.number().describe('Index of the element to input text into'),
        text: z.string().describe('Text to input into the element'),
    }),
    async execute({index, text}){
        if(!browserState.page){
            return 'No page is open';
        }
        const element = await browserState.currentPageElements.find(e=>e.id === index);
        if(!element){
            return 'No element found with the given index';
        }
        await browserState.page.getByLabel(element.description, { exact: false }).first().fill(text);
        return `Successfully entered text into element ${index}.`;
    },
})

const click_element = tool({
    name: 'click_element_by_index',
    description: 'This tool helps you click on an element on the page',
    parameters: z.object({
        index: z.number().describe('Index of the element to click'),
    }),
    async execute({index}){
        if(!browserState.page){
            return 'No page is open';
        }
        const element = await browserState.currentPageElements(e=>e.id === index);
        if(!element){
            return 'No element found with the given index';
        }
        await browserState.page.getByRole('button', { name: element.description, exact: false }).first().click();
        return `Successfully clicked element ${index}.`;
    },
})

const close_page = tool({
    name: 'close_page',
    description: 'Closes the current browser page. Use this when the task is complete.',
    parameters: z.object({}),
    async execute() {
        if (browserState.page && !browserState.page.isClosed()) {
            await browserState.page.close();
            browserState.page = null;
            return 'Page closed.';
        }
        return 'No active page to close.';
    }
});



const agent = Agent.create({
  name: ' Browser Agent',
  instructions: `${RECOMMENDED_PROMPT_PREFIX} You are an AI agent designed to operate in an iterative loop to automate browser tasks. Your ultimate goal is accomplishing the task provided in <user_request>You excel at following tasks: 1. Navigating complex websites and extracting precise information 2. Automating form submissions and interactive web actions 3. Gathering and saving information 4. Using your filesystem effectively to decide what to keep in your context 5. Operate effectively in an agent loop 6. Efficiently performing diverse web tasks <language_settings> Default working language: English Always respond in the same language as the user request </language_settings>
  
  You have access to tools that help you interact with the browser. These tools are:
  1. open_webpage : This tool helps you open a webpage.
  1. go_to_url: This tool helps you navigate to a specific URL.
  2. take_screenshot: This tool helps you take a screenshot of the current page.
  3. click_element_by_index: This tool helps you click on an element on the page.
  4. input_text: This tool helps you input text into a form field.
  5. scroll: This tool helps you scroll the page.
  6. extract_structured_data: This tool helps you extract structured data from the page.
  7. read_file: This tool helps you read a file from the file system.

  example of a conversation and chain of thoughts to proceed : 
  {"agent":"Hello, what I can do for you today ?"}
  {"user_request": "i want to fill a form on https://example.com and submit it"}
  {"agent":"Ok, I will open a webpage and navigate to the url and fill the form"}
  {"agent":"I am navigating to the url"}
  {"tool":"go_to_url","input":"https://example.com"}
  {"tool":"go_to_url","output":"I have navigated to the url"}
  {"agent":"now I am trying to take a screen shot to locate all fields, input boxes and button"}
  {"tool":"take_screenshot","input":null}
  {"tool":"take_screenshot","output":"screenshot.png"}
  {"agent":"I have taken the screenshot and saved it to screenshot.png"}
  {"agent":"Now I am going to get indexes of all input boxes and buttons to locate interactive elements"}
    {"tool":"extract_structured_data","input":null}
    {"tool":"extract_structured_data","output":"[1]<input>First Name</input>\n[2]<input>Last Name</input>\n[3]<button>Submit</button>"}
    {"agent":"I have extracted the structured data and got the indexes of all input boxes and buttons"}
    {"agent":"Now I am going to input the text into the form fields"}
    {"tool":"input_text","input":{"index":1,"text":"John"}}
    {"tool":"input_text","output":"I have input the text into the form field"}  
    {"tool":"input_text","input":{"index":2,"text":"Doe"}}
    {"tool":"input_text","output":"I have input the text into the form field"}  
    {"agent":"Now I am going to click the submit button"}
    {"tool":"click_element_by_index","input":{"index":3}}
    {"tool":"click_element_by_index","output":"I have clicked the submit button"}
    {"agent":"I have completed the task"}
    {"tool":"done","input":null}
    {"tool":"done","output":"I have completed the task"}
  
    This is the desired conversation format. Don't copythis just learn from this.

## Output Format
You must ALWAYS respond with a valid JSON in this exact format:
{{
  "thinking": "Your detailed reasoning process. Analyze the inputs, evaluate your last action's success based on the screenshot, and plan your next goal.",
  "evaluation_previous_goal": "A concise verdict on your last action (Success, Failure, or Uncertain).",
  "memory": "1-3 sentences summarizing key progress and data collected so far (e.g., 'Collected 3 of 5 required items').",
  "next_goal": "A clear, one-sentence description of your immediate next objective.",
  "action": [
    {{
      "tool_name": {{ "parameter": "value" }}
    }}
  ]
}}

  `,
  tools: [open_webpage  ,go_to_url, take_screenshot, analyze_elements, input_text, click_element, close_page],
});

const query = 'i want to fill signup form on https://ui.chaicode.com/auth/signup  with random data and submit it';

const response = await run(agent, query, {stream: true});

response
  .toTextStream({
    compatibleWithNodeStreams: true,
  })
  .pipe(process.stdout);
 