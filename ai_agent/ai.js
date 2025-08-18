import 'dotenv/config';
import { OpenAI } from 'openai';
import { exec } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

// --- Essential Setup for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/"
});

// --- Tool Definitions ---

async function executeCommand(cmd = '') {
    return new Promise((res) => {
        exec(cmd, (error, data) => {
            if (error) {
                res(`Error running command: ${error.message}`);
            } else {
                res(data);
            }
        });
    });
}

async function identifyTypeOfWebsite(url) {
    if (!url) return "error";
    console.log(`🕵️‍♂️ Identifying website type for: ${url}`);
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        await browser.close();

        if (content.includes('/_next/')) {
            console.log("... Verdict: Dynamic (Next.js) site detected.");
            return 'dynamic';
        } else {
            console.log("... Verdict: Static site detected.");
            return 'static';
        }
    } catch (error) {
        console.error(`Error identifying website type: ${error.message}`);
        return 'error';
    }
}


async function rebuildDynamicUI(url, projectDir = 'nextjs_template') {
    if (!url) return "URL is required.";
    console.log(`🚀 Rebuilding DYNAMIC UI from ${url} into '${projectDir}'...`);
    const fullProjectPath = path.join(__dirname, projectDir);

    // --- THIS IS THE FIX ---
    // Check if the Next.js project exists. If not, create it automatically.
    if (!fs.existsSync(path.join(fullProjectPath, 'next.config.js'))) {
        console.log(`... Next.js project not found. Creating it now in '${projectDir}'. This will take a few moments...`);
        try {
            // Use a promise-based exec for cleaner async/await
            const command = `npx create-next-app@latest ${projectDir} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`;
            await new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(`Error creating Next.js app: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                    }
                    console.log(`stdout: ${stdout}`);
                    resolve(stdout);
                });
            });
            console.log("✅ Next.js project created successfully.");
        } catch (error) {
            return `Failed to create Next.js project: ${error}`;
        }
    }
}


async function createNextApp(projectDir) {
    const fullProjectPath = path.join(__dirname, projectDir);
    if (fs.existsSync(fullProjectPath)) {
        return `Directory '${projectDir}' already exists. Skipping creation.`;
    }
    console.log(`🏗️ Creating new Next.js app in '${projectDir}'. This will take a few moments...`);
    try {
        const command = `npx create-next-app@latest ${projectDir} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`;
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject(`Error creating Next.js app: ${error.message}`);
                }
                resolve(stdout);
            });
        });
        return `✅ Next.js project created successfully in '${projectDir}'.`;
    } catch (error) {
        return `Failed to create Next.js project: ${error}`;
    }
}

/**
 * Clones a website's core UI and rewrites asset paths to be relative.
 * This version is more robust for dynamic sites.
 * @param {string} url The URL of the website to clone.
 * @param {string} outputDir The directory to save the cloned UI.
 * @returns {Promise<string>} A summary of the cloning operation.
 */
async function cloneCoreUI(url, outputDir = 'cloned_site') {
    if (!url) return "URL is required.";
    console.log(`🚀 Starting UI capture for: ${url}`);
    const fullOutputDir = path.join(__dirname, outputDir);
    await mkdir(fullOutputDir, { recursive: true });
    const urlMap = new Map();

    let browser;
    try {
        console.log("... Launching browser");
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        page.on('response', async (response) => {
            const responseUrl = response.url();
            const resourceType = response.request().resourceType();
            
            if (['stylesheet', 'script', 'image', 'font'].includes(resourceType)) {
                try {
                    if (response.ok()) {
                        const buffer = await response.buffer();
                        const fileName = path.basename(new URL(responseUrl).pathname);
                        if (fileName) {
                            const localPath = path.join(fullOutputDir, fileName);
                            await writeFile(localPath, buffer);
                            urlMap.set(responseUrl, `./${fileName}`);
                        }
                    }
                } catch (e) { /* Suppress errors */ }
            }
        });

        console.log(`... Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log("... Waiting for main content to render.");
        await page.waitForSelector('main', { timeout: 60000 });

        let html = await page.content();
        
        console.log("🔧 Rewriting asset paths in the cloned HTML...");
        const $ = cheerio.load(html);

        $('link[href], script[src], img[src]').each((i, el) => {
            const oldSrcAttr = $(el).is('[href]') ? 'href' : 'src';
            const oldSrc = $(el).attr(oldSrcAttr);
            if (oldSrc) {
               try {
                   const absoluteUrl = new URL(oldSrc, url).href;
                   if (urlMap.has(absoluteUrl)) {
                       const newSrc = urlMap.get(absoluteUrl);
                       $(el).attr(oldSrcAttr, newSrc);
                   }
               } catch (e) { /* Ignore invalid URLs */ }
            }
        });
        
        const finalHtml = $.html();
        await writeFile(path.join(fullOutputDir, 'index.html'), finalHtml, 'utf8');

        console.log("✅ UI Capture and path rewriting complete!");
        return `Successfully cloned UI from ${url}. Saved index.html and ${urlMap.size} assets to '${outputDir}'.`;
    } catch (error) {
        return `An error occurred during UI capture: ${error.message}`;
    } finally {
        if (browser) {
            await browser.close();
            console.log("... Browser closed.");
        }
    }
}


function startLocalServer(directory, port = 8080) {
    const fullPath = path.join(__dirname, directory);

    // Check if the directory exists before starting the server.
    if (!fs.existsSync(fullPath)) {
        const errorMsg = `Failed to start server: Directory '${directory}' does not exist at '${fullPath}'.`;
        console.error(`🚨 ${errorMsg}`);
        return errorMsg;
    }

    const server = http.createServer((req, res) => {
        const requestedUrl = req.url === '/' ? '/index.html' : req.url;
        let filePath = path.join(fullPath, requestedUrl);

        // Log every incoming request for debugging purposes.
        console.log(`[Server] Request: ${req.url}`);
        console.log(`[Server] Attempting to serve: ${filePath}`);

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml'
        };
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                // Log the specific error for the file.
                console.error(`[Server] Error for ${req.url}: ${error.code}`);
                if (error.code == 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>');
                } else {
                    res.writeHead(500);
                    res.end(`Server Error: ${error.code}`);
                }
            } else {
                console.log(`[Server] Success: Serving ${filePath}`);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(port, 'localhost', () => {
         console.log(`✅ Server running at http://localhost:${port}`);
    });

    return `Started local server for directory '${directory}' on http://localhost:${port}.`;
}


// --- Tool Mapping ---
const TOOL_MAP = {
    executeCommand,
    cloneCoreUI,       // The new, improved tool
    startLocalServer,
};

function extractJson(text) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[1]) return match[1];
    return text;
}

async function main() {
    try {
        const SYSTEM_PROMPT = `
You are an AI assistant that clones website UIs.

**CRITICAL RULES:**
1.  **ONE STEP AT A TIME:** Perform only one step per turn.
2.  **ONE JSON OBJECT:** Your response MUST be a single, raw JSON object.
3.  **NO MARKDOWN:** Do NOT use Markdown or code fences.
4.  **WAIT FOR OBSERVATION:** After a "TOOL" step, you MUST wait for the user to provide the "OBSERVE" step.

**Available Tools:**
 - executeCommand(command: string): Executes a shell command.
 - cloneCoreUI(url: string, outputDir: string): Downloads a website's UI (HTML/CSS/JS/images) and rewrites asset paths to be relative,  making it ready for local hosting.
 - startLocalServer(directory: string, port?: number): Starts a local web server to host the files in the specified directory.
 - identifyTypeOfWebsite(url: string): Identifies if the website is static or dynamic.
 - createNextApp(projectDir: string): Creates a new Next.js project in the specified directory.
 - rebuildDynamicUI(url: string, projectDir: string): Rebuilds a dynamic website's UI into a static one, suitable for local hosting.


**Cloning Flow:**
User: Clone example.com and run it locally.
ASSISTANT: { "step": "START", "content": "The user wants to just clone the UI of 'example.com' and run it on a local server." }
ASSISTANT :{"step" : "THINK" , "content" : "I need to check if the website is static or dynamic. I will use the 'identifyTypeOfWebsite' tool." }
ASSISTANT: { "step": "TOOL", "tool_name": "identifyTypeOfWebsite", "input": "http://example.com" }
ASSISTANT: { "step": "OBSERVE", "content": "The website is static. OR The website is dynamic." }
ASSISTANT:{ "step" : "THINK" , "content" : "if the website is static, I will use the 'cloneCoreUI' tool to download the UI and make it ready for local hosting." }
ASSISTANT :{"step":"THINK" , "content" :" I will use the 'cloneCoreUI' tool to download the UI and make it ready for local hosting." }
ASSISTANT: { "step": "TOOL", "tool_name": "cloneCoreUI", "input": "http://example.com", "args": ["cloned_site"] }
ASSISTANT :{ "step":"THINK" , "content":"Or if site is dynamic I will use 'rebuildDynamicUI' tool with nextjs_template to rebuild the UI and make it ready for local hosting." }
ASSISTANT :{ "step" : " THINK" , "content": "since site is dynamic I will use 'createNextApp' tool to create a new Next.js project." }
ASSISTANT:{ "step":"TOOL" , "tool_name":"createNextApp" , "input":"nextjs_template" }
ASSISTANT :{ "step":"THINK", "content" :"after creating next js app now i will clone the UI into this app using rebuildDynamicUI tool. "}
ASSISTANT:{"step":"TOOL" , "tool_name":"rebuildDynamicUI" , "input":"http://example.com" , "args":["nextjs_template"] }

USER (provides observation): { "step": "OBSERVE", "content": "Successfully cloned UI from http://example.com... Saved to 'nextjs_template'." }
ASSISTANT: { "step": "THINK", "content": "The website UI is now cloned and ready to be hosted. I will use the 'startLocalServer' tool to serve the 'cloned_site' directory." }
ASSISTANT: { "step": "THINK", "content":" if website is static I'll use startlocalServer tool to serve on http://localhost:8080. " }
ASSISTANT: { "step": "TOOL", "tool_name": "startLocalServer", "input": "cloned_site" }
USER (provides observation): { "step": "OBSERVE", "content": "Started local server for directory 'cloned_site' on http://localhost:8080." }
ASSISTANT: { "step": "OUTPUT", "content": "I have successfully cloned the website's UI and it is now running on http://localhost:8080." }
ASSISTANT: { "step": "THINK", "content":" if website is dynamic I'll move to the location of nextjs_template and run npm run dev command to start the server." }
ASSISTANT: { "step": "TOOL", "tool_name": "executeCommand", "input": "cd nextjs_template && npm run dev" }
USER (provides observation): { "step": "OBSERVE", "content": "The website is running on http://localhost:3000." }
ASSISTANT: { "step": "OUTPUT", "content": "I have successfully cloned the website's UI and it is now running on http://localhost:3000." }



Output JSON Format (A single, raw JSON object per turn):
{ "step": "START" | "THINK" | "OBSERVE" | "OUTPUT" | "TOOL", "content": string, "tool_name"?: string, "input"?: string, "args"?: any[] }
`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: 'Please clone the UI of the website at https://www.chaicode.com/ and run it on my local machine.' },
        ];
        
        let loopCount = 0;
        const maxLoops = 10;
        
        while (loopCount < maxLoops) {
            loopCount++;
            const response = await client.chat.completions.create({
                model: 'models/gemini-1.5-flash-latest',
                messages: messages,
                temperature: 0.7,
                response_format: { type: "json_object" },
            });

            const rawContent = response.choices[0].message.content;
            if (!rawContent) {
                console.log("🤖 The model returned an empty response. Ending conversation.");
                break;
            }
            
            const jsonString = extractJson(rawContent);
            let parsedContent;

            try {
                parsedContent = JSON.parse(jsonString);
            } catch (e) {
                console.error("🚨 Failed to parse JSON:", jsonString);
                messages.push({
                    role: 'user',
                    content: `Your last response was not valid JSON. Please correct it. Your invalid response was: ${rawContent}`
                });
                continue; 
            }

            messages.push({
                role: 'assistant',
                content: JSON.stringify(parsedContent),
            });

            if (parsedContent.step === 'START') {
                console.log(`🔥 ${parsedContent.content}`);
            } else if (parsedContent.step === 'THINK') {
                console.log(`\t🧠 ${parsedContent.content}`);
            } else if (parsedContent.step === 'TOOL') {
                const toolToCall = parsedContent.tool_name;
                const toolInput = parsedContent.input;
                const toolArgs = parsedContent.args || [];
                
                console.log(`\t🛠️ Calling Tool: ${toolToCall} with input: "${toolInput}"`);

                if (!TOOL_MAP[toolToCall]) {
                    const errorMsg = `There is no such tool as ${toolToCall}`;
                    console.error(`🚨 ${errorMsg}`);
                    messages.push({
                        role: 'user',
                        content: JSON.stringify({ step: 'OBSERVE', content: errorMsg }),
                    });
                } else {
                    const responseFromTool = await TOOL_MAP[toolToCall](toolInput, ...toolArgs);
                    console.log(`\t\t🔬 Observation: ${responseFromTool}`);
                    
                    messages.push({
                        role: 'user',
                        content: JSON.stringify({ step: 'OBSERVE', content: responseFromTool }),
                    });
                }
            } else if (parsedContent.step === 'OUTPUT') {
                console.log(`\n🤖 ${parsedContent.content}`);
                return; // End the process
            }
        }
    } catch (error) {
        console.error("\nAn error occurred in the main loop:", error);
    }
}

main();
