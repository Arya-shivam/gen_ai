import 'dotenv/config';
import { OpenAI } from 'openai';
import { exec } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

// --- Essential Setup for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- AI Client Setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/"
});


// --- Tool Definitions ---

async function cloneWebsiteUI(url, outputDir) {
    if (!url) return "Error: URL is required.";
    const spinner = ora(`Cloning UI from ${chalk.cyan(url)}...`).start();
    const fullOutputDir = path.join(__dirname, outputDir);
    const urlMap = new Map();

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const assetsToSave = new Map();

        page.on('response', async (response) => {
            const responseUrl = response.url();
            const resourceType = response.request().resourceType();
            
            if (['stylesheet', 'script', 'image', 'font'].includes(resourceType)) {
                try {
                    if (response.ok()) {
                        const buffer = await response.buffer();
                        const urlPath = new URL(responseUrl).pathname;
                        const relativePath = path.join('.', urlPath).replace(/^(\.\.[/\\])+/, '');
                        assetsToSave.set(responseUrl, { buffer, relativePath });
                    }
                } catch (e) { /* Suppress errors */ }
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        let html = await page.content();
        
        for (const [assetUrl, { buffer, relativePath }] of assetsToSave) {
            const finalPath = path.join(fullOutputDir, relativePath);
            await mkdir(path.dirname(finalPath), { recursive: true });
            await writeFile(finalPath, buffer);
            urlMap.set(assetUrl, relativePath);
        }

        for (const [originalUrl, localPath] of urlMap) {
            const relativeUrl = path.relative(path.dirname(path.join(fullOutputDir, 'index.html')), path.join(fullOutputDir, localPath));
            html = html.split(originalUrl).join(relativeUrl);
        }
        
        for (const [assetUrl, { relativePath }] of assetsToSave) {
            if (relativePath.endsWith('.css')) {
                const cssPath = path.join(fullOutputDir, relativePath);
                let cssContent = fs.readFileSync(cssPath, 'utf8');
                for (const [originalUrl, localPath] of urlMap) {
                     const relativeUrl = path.relative(path.dirname(cssPath), path.join(fullOutputDir, localPath));
                     cssContent = cssContent.split(originalUrl).join(relativeUrl);
                }
                await writeFile(cssPath, cssContent, 'utf8');
            }
        }

        await writeFile(path.join(fullOutputDir, 'index.html'), html, 'utf8');
        
        spinner.succeed(chalk.green(`Cloned UI and saved ${assetsToSave.size} assets to '${outputDir}'.`));
        return `Successfully cloned UI from ${url}.`;

    } catch (error) {
        spinner.fail(chalk.red('Cloning failed.'));
        return `An error occurred during UI capture: ${error.message}`;
    } finally {
        if (browser) await browser.close();
    }
}

function startLocalServer(directory, port = 8080) {
    const spinner = ora(`Starting local server for '${chalk.cyan(directory)}'...`).start();
    const fullPath = path.join(__dirname, directory);
    if (!fs.existsSync(fullPath)) {
        spinner.fail(chalk.red(`Directory '${fullPath}' does not exist.`));
        return `Error: Directory '${fullPath}' does not exist.`;
    }
    http.createServer((req, res) => {
        let filePath = path.join(fullPath, req.url === '/' ? 'index.html' : req.url);
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml'
        };
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('<h1>404 Not Found</h1>');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }).listen(port, 'localhost');
    
    spinner.succeed(chalk.green(`Server for '${directory}' is running.`));
    return `Server for '${directory}' is running on http://localhost:${port}.`;
}

// --- Tool Mapping ---
const TOOL_MAP = {
    cloneWebsiteUI,
    startLocalServer,
};

// --- Main AI Agent Loop ---
async function main() {
    console.log(boxen(chalk.bold('AI Website UI Cloner'), { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));

    // --- FIX: Directly read the URL from the command line ---
    const targetUrl = process.argv[2];

    if (!targetUrl) {
        console.error(chalk.red('Error: Please provide a website URL as a command-line argument.'));
        console.log(chalk.yellow('Example: node your_script_name.js https://www.example.com'));
        process.exit(1);
    }
    // --- END OF FIX ---

    // --- FIX: Construct a clear query for the AI ---
    const userQuery = `Please clone the UI of the website at ${targetUrl} and run it on my local machine.`;
    // --- END OF FIX ---

    const SYSTEM_PROMPT = `
You are an expert AI assistant that clones website UIs. Your goal is to take a user's request, clone the specified website's UI, and then host it on a local server.

**CRITICAL RULES:**
1.  **ONE STEP AT A TIME:** Perform only one step per turn.
2.  **ONE JSON OBJECT:** Your entire response MUST be a single, raw JSON object.
3.  **NO MARKDOWN:** Do NOT use Markdown or code fences.
4.  **WAIT FOR OBSERVATION:** After a "TOOL" step, you MUST wait for the user to provide the "OBSERVE" step.

**Available Tools:**
 - cloneWebsiteUI(url: string, outputDir: string): A robust tool to clone a website's UI, preserving folder structure and rewriting paths for local use.
 - startLocalServer(directory: string, port?: number): Starts a local web server for a directory of static files.

**Cloning Flow:**
1.  **START**: State the user's goal and identify the URL from the user's query.
2.  **THINK**: Decide to use 'cloneWebsiteUI' to download and prepare the website. Determine a suitable output directory name based on the URL's hostname.
3.  **TOOL**: Call 'cloneWebsiteUI' with the URL and the chosen directory name.
4.  **OBSERVE**: Get the result of the cloning operation.
5.  **THINK**: If cloning was successful, decide to use 'startLocalServer' on the same directory.
6.  **TOOL**: Call 'startLocalServer'.
7.  **OBSERVE**: Get the result of the server launch.
8.  **OUTPUT**: Provide the final result and instructions to the user in a clear, user-friendly format.

Output JSON Format:
{ "step": "START" | "THINK" | "OUTPUT" | "TOOL", "content": string, "tool_name"?: string, "input"?: string, "args"?: any[] }
`;

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userQuery },
    ];
    
    while (true) {
        const response = await client.chat.completions.create({
            model: 'models/gemini-1.5-flash-latest',
            messages: messages,
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0].message.content;
        if (!rawContent) {
            console.log(chalk.red("🤖 The model returned an empty response. Ending conversation."));
            break;
        }
        
        let parsedContent;
        try {
            parsedContent = JSON.parse(rawContent);
        } catch (e) {
            console.error(chalk.red("🚨 Failed to parse JSON:"), rawContent);
            messages.push({ role: 'user', content: `Your last response was not valid JSON. Please correct it.` });
            continue; 
        }

        messages.push({ role: 'assistant', content: JSON.stringify(parsedContent) });

        if (parsedContent.step === 'START') {
            console.log(chalk.magenta(`🔥 ${parsedContent.content}`));
        } else if (parsedContent.step === 'THINK') {
            console.log(chalk.dim(`\t🧠 ${parsedContent.content}`));
        } else if (parsedContent.step === 'TOOL') {
            const { tool_name, input, args = [] } = parsedContent;
            
            if (!TOOL_MAP[tool_name]) {
                const errorMsg = `There is no such tool as ${tool_name}`;
                console.error(chalk.red(`🚨 ${errorMsg}`));
                messages.push({ role: 'user', content: JSON.stringify({ step: 'OBSERVE', content: errorMsg }) });
            } else {
                const responseFromTool = await TOOL_MAP[tool_name](input, ...args);
                messages.push({ role: 'user', content: JSON.stringify({ step: 'OBSERVE', content: responseFromTool }) });
            }
        } else if (parsedContent.step === 'OUTPUT') {
            const finalMessage = `
${chalk.bold('AI Task Complete!')}

${parsedContent.content}
            `;
            console.log(boxen(finalMessage, { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'green' }));
            break; 
        }
    }
}

main();
