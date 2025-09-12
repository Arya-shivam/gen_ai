import 'dotenv/config';
import {Agent, run ,tool} from '@openai/agents';   
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
// import SYSTEM_PROMPT from './system_prompt_shortone.js'
import { chromium } from 'playwright';
import { z } from 'zod';
import OpenAI from 'openai';
import fs from 'fs';


const system_prompt= `You are an advanced web automation agent powered by AI, specializing in executing user-defined tasks through precise browser control. Your objective is to efficiently and reliably complete assignments while adhering to best practices in web interaction, error handling, and adaptive reasoning
    Core Workflow

1.  **Initial Navigation**: Begin by invoking the \`Open_web_page\` tool to access the target URL provided in the task or inferred from context
2.  **Page Analysis**: Upon successful page load, employ appropriate tools to inspect the content:
    * For overview and interactive elements (e.g., links, buttons): Utilize \`GET_DOM_ELEMENTS\` to retrieve a concise summary of clickable or navigable components.
    * For in-depth inspection (e.g., forms, dynamic content): Leverage \`Get_Page_HTML\` to obtain the full HTML structure.
3.  **Strategic Planning and Execution**: Synthesize the analysis into a clear, sequential plan. Execute actions methodically, verifying outcomes at each step to ensure progress toward the task goal.
     Specialized Form-Filling Protocol

For tasks involving form completion:

1.  **Retrieve HTML Structure**: Immediately after navigation, call \`Get_Page_HTML\` to capture the page's complete markup.
2.  **Element Identification**: Parse the HTML to locate all relevant input fields, including \`<input>\`, \`<textarea>\`, and \`<select>\` elements. Focus on attributes such as \`id\`, \`name\`, \`placeholder\`, \`class\`, and associated \`<label>\` elements to accurately map fields to their intended purposes (e.g., "Username", "Billing Address", "Confirmation Code").
3.  **Develop Execution Plan**: Formulate a detailed, step-by-step strategy. For each identified field:
    * Select appropriate placeholder or dummy data based on the field's semantics and any user-provided information.
    * **Determine the most robust CSS selector using this strict hierarchy:**
        * **Priority 1: Use \`id\`**. If an element has an \`id\` (e.g., \`<input id="firstName">\`), your selector **must** be the ID selector (e.g., \`#firstName\`). This is non-negotiable.
        * **Priority 2: Use \`name\`**. If no \`id\` is present, use the \`name\` attribute (e.g., \`input[name="email"]\`).
        * **Priority 3: Composite Selectors**. If neither \`id\` nor \`name\` is available, construct a selector from other attributes like \`placeholder\` or \`class\`.
    * Account for validation requirements, dependencies between fields, or conditional visibility.
4.  **Field Population**: Sequentially apply the \`Fill_Input\` tool for each field, supplying the chosen selector and value.
5.  **Pre-Submission Screenshot**: After filling all form fields, you **must** call the \`Take_Screenshot\` tool to capture a visual record of the completed form before submission.
6.  **Form Submission**: After taking the screenshot, identify the submission element (e.g., button with \`type="submit"\`) and use \`Click_Element\` to finalize the process. Confirm submission success through subsequent page analysis if needed.

     Operational Guidelines

* **Analysis-First Approach**: Always inspect and understand the current page state before performing any action. Avoid assumptions about selectors or page structure—base decisions on empirical data from tools.
* **Error Resilience**: In the event of an action failure (e.g., element not found, timeout), re-evaluate the page using analysis tools to detect changes, such as dynamic updates or errors. Adjust your plan accordingly and retry with refinements.
* **Termination Criteria**: If progress stalls due to insurmountable issues (e.g., persistent errors, inaccessible content), articulate the specific obstacle and halt operations. Prevent infinite loops by limiting retry attempts to a maximum of three per action.
* **Task Completion**: Once you have verified that all steps of the user's request have been successfully completed, you **must** call the \`Task_Complete\` tool as your final action. This is the only way to end the mission.
* **Efficiency and Security**: Prioritize minimal, targeted interactions to optimize performance. Respect web standards and avoid actions that could simulate malicious behavior, such as excessive scraping without necessity.
* **Adaptability**: Tailor your reasoning to the task's complexity—escalate to more detailed analysis for intricate sites (e.g., those with JavaScript-heavy interfaces) and incorporate user feedback or clarifications as available.

Maintain a professional, concise communication style in your internal reasoning and any user-facing outputs, focusing on transparency and traceability of decisions.`

const openai = new OpenAI();

// - launching browser--
console.log('🚀 Launching browser...');
const browser = await chromium.launch({
  headless: false,
//   chromiumSandbox: true,
//   env: {},
  args: ['--no-sandbox','--disable-extensions', '--disable-file-system'],
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

// const analyze_elements = tool({
//     name: 'analyze_elements',
//     description: 'This tool helps you analyze the current page and identify all interactive elements, including buttons, links, and input fields. For each element, provide a unique "id" (integer, starting from 1), and a clear "description" of its purpose (e.g., "Sign in button", "Username input field"). Return the result as a JSON object with a single key "elements". Each element object should have an "id" and a "description".',
//     parameters: z.object({}),
//     async execute(){
//     if (!fs.existsSync(browserState.lastScreenshotPath)) {
//         return "Error: No screenshot found. Please use 'take_screenshot' first.";
//     }
//     console.log('🤖 Analyzing screenshot with vision model...');
//     const screenshotBuffer = fs.readFileSync(browserState.lastScreenshotPath);
//     const elements = await analyzeScreenshot(screenshotBuffer);
    
//     browserState.currentPageElements = elements;
    
//     const formattedElements = elements.map(e => `[${e.id}] ${e.description}`).join('\n');
//     return `Analysis complete. Found the following interactive elements:\n${formattedElements}`;
//   },
// })

const get_page_html = tool({
            name: "Get_Page_HTML",
            description: "Gets the full HTML content of the current page. Useful for understanding the structure of forms and elements.",
            parameters: z.object({}),
            async execute() {
                try {
                    console.log('Fetching page HTML...');
                    const html = await browserState.page.content();
                    // Truncate if the HTML is too long to avoid overwhelming the model
                    return html.length > 20000 ? html.slice(0, 20000) + '... [HTML Truncated]' : html;
                } catch (err) {
                    console.log(`Failed to get page HTML: ${err}`);
                    return `Error: Failed to get page HTML. Details: ${err.message}`;
                }
            },
})

const get_dom_elements =  tool({
            name: "GET_DOM_ELEMENTS",
            description: "Gets a simplified list of interactive elements from the current page DOM.",
            parameters: z.object({}),
            async execute() {
                console.log("Getting DOM elements...");
                const elements = await browserState.page.evaluate(() => {
                    const interactiveElements = [];
                    document
                        .querySelectorAll("a, button, input[type=submit], input[type=button], [role='button'], [role='link']")
                        .forEach((el) => {
                            // Filter out non-visible elements
                            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                                interactiveElements.push({
                                    text: el.innerText || el.value || el.getAttribute('aria-label') || "",
                                    selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""),
                                });
                            }
                        });
                    return interactiveElements;
                });
                return elements;
            },
})


// const extract_structured_data = tool({
//   name: 'extract_structured_data',
//   description: "Extracts a structured list of all interactive elements (buttons, links, inputs) from the page's HTML. Use this when you can't find a specific element using the vision-based analysis.",
//   parameters: z.object({}),
//   async execute() {
//     if (!browserState.page) return "Error: No active page.";

//     console.log('📝 Extracting structured data from the DOM...');

//     // This function will be executed in the browser's context to access the DOM
//     const pageData = await browserState.page.evaluate(() => {
//       const extractElements = (selector, type) => {
//         return Array.from(document.querySelectorAll(selector)).map(el => {
//           // Try to get the most meaningful text from the element
//           const text = (el.textContent || el.innerText || el.getAttribute('aria-label') || el.getAttribute('value') || '').trim();
//           return { type, text };
//         });
//       };

//       const buttons = extractElements('button', 'Button');
//       const links = extractElements('a', 'Link');
//       const inputs = extractElements('input, textarea, select', 'Input');
      
//       return { buttons, links, inputs };
//     });

//     // Format the extracted data into a clean string for the agent
//     let resultString = 'Structured data extracted from the page:\n';

//     if (pageData.buttons.length > 0) {
//       resultString += '\n**Buttons:**\n' + pageData.buttons.map(b => `- "${b.text}"`).join('\n');
//     }
//     if (pageData.links.length > 0) {
//       resultString += '\n\n**Links:**\n' + pageData.links.map(l => `- "${l.text}"`).join('\n');
//     }
//     if (pageData.inputs.length > 0) {
//       resultString += '\n\n**Inputs:**\n' + pageData.inputs.map(i => `- "${i.text}" (type: ${i.type})`).join('\n');
//     }

//     if (pageData.buttons.length === 0 && pageData.links.length === 0 && pageData.inputs.length === 0) {
//       return "No standard interactive elements (buttons, links, inputs) were found on the page.";
//     }

//     return resultString;
//   },
// })

const input_text=  tool({
            name: "Fill_Input",
            description: "Types text into an input field using its CSS selector by simulating key presses.",
            parameters: z.object({
                selector: z.string().describe("The CSS selector of the input field."),
                value: z.string().describe("The text to type into the field."),
            }),
            async execute({ selector, value }) {
                try {
                    console.log(`Typing '${value}' into '${selector}' manually...`);
                    // Use pressSequentially for a more human-like typing simulation
                    await browserState.page.locator(selector).pressSequentially(value, { delay: 50 });
                    return `Successfully typed '${value}' into '${selector}'.`;
                } catch (err) {
                    console.log(`Failed to fill input ${selector}: ${err}`);
                    return `Error: Failed to fill input "${selector}". Details: ${err.message}`;
                }
            },
})

const scroll = tool({
    name: 'scroll',
    description: 'This tool helps you scroll the page',
    parameters: z.object({}),
    async execute() {
        if(!browserState.page){
            return 'No page is open';
        }
        await browserState.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        return 'Scrolled to the bottom of the page';
    },
})

const click_element =   tool({
            name: "Click_Element",
            description: "Intelligently clicks on an element. It first tries to find the element by its visible text or role, then falls back to a CSS selector.",
            parameters: z.object({ target: z.string().describe("The text of the element or its CSS selector.") }),
            async execute({ target }) {
                try {
                    // Try to find by role (button)
                    let locator = browserState.page.getByRole("button", { name: new RegExp(target, "i") });
                    if (await locator.count() > 0) {
                        await locator.first().click();
                        console.log(`Clicked button with text: ${target}`);
                        return `Successfully clicked button with text: ${target}`;
                    }

                    // Try to find by role (link)
                    locator = browserState.page.getByRole("link", { name: new RegExp(target, "i") });
                    if (await locator.count() > 0) {
                        await locator.first().click();
                        console.log(`Clicked link with text: ${target}`);
                        return `Successfully clicked link with text: ${target}`;
                    }

                    // Fallback to general text
                    locator = browserState.page.getByText(new RegExp(`^${target}$`, "i"));
                    if (await locator.count() > 0) {
                        await locator.first().click();
                        console.log(`Clicked element with text: ${target}`);
                        return `Successfully clicked element with text: ${target}`;
                    }

                    // Fallback to CSS selector
                    locator =browserState.page.locator(target);
                    if (await locator.count() > 0) {
                        await locator.first().click();
                        console.log(`Clicked CSS selector: ${target}`);
                        return `Successfully clicked CSS selector: ${target}`;
                    }

                    console.log(`No element found for: ${target}`);
                    return `Error: No element found for target "${target}".`;
                } catch (err) {
                    console.log(`Failed to click ${target}`, err);
                    return `Error: Failed to click "${target}". Details: ${err.message}`;
                }
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
  instructions: `${system_prompt}`,
  tools: [open_webpage  , go_to_url, take_screenshot, scroll , get_dom_elements, get_page_html , input_text , click_element, close_page],
});

const query = 'I want you to fill form on https://ui.chaicode.com/auth/signup? with random data';

const response = await run(agent, query, {stream: true});

response
  .toTextStream({
    compatibleWithNodeStreams: true,
  })
  .pipe(process.stdout);
 