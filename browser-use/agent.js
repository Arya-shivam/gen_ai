import 'dotenv/config';
import { Agent, run, tool } from '@openai/agents';
import { chromium } from 'playwright';
import { z } from 'zod';
import OpenAI from 'openai';
import fs from 'fs';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import gradient from 'gradient-string';

// CLI Styling utilities
const colors = {
    primary: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    tool: chalk.magenta,
    result: chalk.gray,
    highlight: chalk.bold.white
};

const symbols = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    tool: '🔧',
    robot: '🤖',
    browser: '🌐',
    loading: '⏳',
    arrow: '→',
    checkmark: '✓'
};

// Display beautiful banner
function displayBanner() {
    console.clear();
    const title = figlet.textSync('Browser Agent', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });
    
    const gradientTitle = gradient.rainbow.multiline(title);
    console.log(gradientTitle);
    
    console.log(boxen(
        chalk.white('🚀 Advanced AI-Powered Web Automation Agent\n') +
        chalk.gray('Navigate, interact, and automate any website with intelligent precision'),
        {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            backgroundColor: 'black'
        }
    ));
}

// Progress tracking
class ProgressTracker {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 0;
        this.spinner = null;
    }

    setTotalSteps(total) {
        this.totalSteps = total;
    }

    startStep(message, type = 'info') {
        this.currentStep++;
        const prefix = `[${this.currentStep}/${this.totalSteps}]`;
        
        if (this.spinner) {
            this.spinner.stop();
        }
        
        this.spinner = ora({
            text: `${prefix} ${message}`,
            spinner: 'dots',
            color: type === 'tool' ? 'magenta' : 'cyan'
        }).start();
    }

    updateStep(message) {
        if (this.spinner) {
            this.spinner.text = `[${this.currentStep}/${this.totalSteps}] ${message}`;
        }
    }

    completeStep(message, success = true) {
        if (this.spinner) {
            this.spinner.stop();
        }
        
        const symbol = success ? symbols.success : symbols.error;
        const color = success ? colors.success : colors.error;
        console.log(`${symbol} ${color(`[${this.currentStep}/${this.totalSteps}] ${message}`)}`);
    }

    showToolCall(toolName, params = {}) {
        if (this.spinner) {
            this.spinner.stop();
        }
        
        const paramStr = Object.keys(params).length > 0 ? 
            ` with ${Object.entries(params).map(([k, v]) => `${k}: "${v}"`).join(', ')}` : '';
        
        console.log(boxen(
            `${symbols.tool} ${colors.tool.bold('TOOL CALL')}\n` +
            `${colors.highlight(toolName)}${colors.result(paramStr)}`,
            {
                padding: { top: 0, bottom: 0, left: 1, right: 1 },
                borderStyle: 'round',
                borderColor: 'magenta',
                backgroundColor: 'black'
            }
        ));
    }

    showToolResult(result, success = true) {
        const symbol = success ? symbols.checkmark : symbols.error;
        const color = success ? colors.success : colors.error;
        
        console.log(`  ${symbol} ${color('Result:')} ${colors.result(result)}\n`);
    }

    showAgentThinking(message) {
        console.log(`${symbols.robot} ${colors.info('Agent:')} ${colors.highlight(message)}`);
    }

    showError(error) {
        console.log(boxen(
            `${symbols.error} ${colors.error.bold('ERROR')}\n${colors.result(error)}`,
            {
                padding: 1,
                borderStyle: 'round',
                borderColor: 'red',
                backgroundColor: 'black'
            }
        ));
    }

    complete() {
        if (this.spinner) {
            this.spinner.stop();
        }
        
        console.log(boxen(
            `${symbols.success} ${colors.success.bold('MISSION ACCOMPLISHED!')}\n` +
            `${colors.highlight('All tasks completed successfully')}`,
            {
                padding: 1,
                borderStyle: 'double',
                borderColor: 'green',
                backgroundColor: 'black'
            }
        ));
    }
}

const tracker = new ProgressTracker();

// System prompt
const system_prompt = `You are an advanced web automation agent. Execute tasks step-by-step:

1. Open webpage and navigate to URL
2. Analyze page elements comprehensively  
3. Execute required actions (clicking, filling forms, etc.)
4. Take screenshots when needed
5. Complete the task

For forms: Use get_comprehensive_elements, fill each field with fill_input_field, take screenshot, then submit.
Always call task_complete when finished.`;

const openai = new OpenAI();

// Browser setup with progress indication
async function initializeBrowser() {
    const spinner = ora('Launching browser...').start();
    
    try {
        const browser = await chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-extensions', '--disable-file-system'],
        });
        
        spinner.succeed('Browser launched successfully');
        return browser;
    } catch (error) {
        spinner.fail('Failed to launch browser');
        throw error;
    }
}

let browser;
const browserState = {
    page: null,
    lastScreenshotPath: 'current_view.png',
    currentPageElements: [],
};

// Enhanced tools with progress tracking
const open_webpage = tool({
    name: 'open_webpage',
    description: 'Opens a new browser page if none exists',
    parameters: z.object({}),
    async execute() {
        tracker.showToolCall('open_webpage');
        
        if (!browserState.page) {
            browserState.page = await browser.newPage();
            await browserState.page.setViewportSize({ width: 1280, height: 720 });
            const result = 'A new browser page is open';
            tracker.showToolResult(result);
            return result;
        }
        
        const result = 'A browser page is already open';
        tracker.showToolResult(result);
        return result;
    },
});

const go_to_url = tool({
    name: 'go_to_url',
    description: 'Navigate to a specific URL with improved error handling',
    parameters: z.object({
        url: z.string().describe('URL to navigate to'),
    }),
    async execute({ url }) {
        tracker.showToolCall('go_to_url', { url });
        
        if (!browserState.page) {
            browserState.page = await browser.newPage();
            await browserState.page.setViewportSize({ width: 1280, height: 720 });
        }
        
        try {
            await browserState.page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            
            await browserState.page.waitForTimeout(2000);
            
            const result = `Successfully navigated to ${url}`;
            tracker.showToolResult(result);
            return result;
        } catch (error) {
            const result = `Error navigating to ${url}: ${error.message}`;
            tracker.showToolResult(result, false);
            return result;
        }
    }
});

const get_comprehensive_elements = tool({
    name: 'get_comprehensive_elements',
    description: 'Gets detailed information about all interactive elements with reliable selectors',
    parameters: z.object({}),
    async execute() {
        tracker.showToolCall('get_comprehensive_elements');
        
        if (!browserState.page) {
            const result = 'No page is open';
            tracker.showToolResult(result, false);
            return result;
        }

        try {
            const elements = await browserState.page.evaluate(() => {
                const results = [];
                const selectors = [
                    'input:not([type="hidden"])',
                    'textarea', 'select', 'button', 'a[href]',
                    '[role="button"]', '[role="link"]', '[onclick]', 'label'
                ];
                
                const allElements = document.querySelectorAll(selectors.join(', '));
                
                Array.from(allElements).forEach((el, index) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 && rect.height === 0) return;
                    
                    const elementInfo = {
                        index: index + 1,
                        tagName: el.tagName.toLowerCase(),
                        type: el.type || null,
                        id: el.id || null,
                        name: el.name || null,
                        placeholder: el.placeholder || null,
                        textContent: el.textContent?.trim().substring(0, 100) || null,
                    };
                    
                    let selector = null;
                    if (el.id) {
                        selector = `#${el.id}`;
                    } else if (el.name && el.tagName.toLowerCase() !== 'a') {
                        selector = `[name="${el.name}"]`;
                    } else if (el.placeholder) {
                        selector = `[placeholder="${el.placeholder}"]`;
                    } else {
                        const classes = el.className ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
                        selector = el.tagName.toLowerCase() + (classes ? '.' + classes : '');
                    }
                    
                    elementInfo.selector = selector;
                    results.push(elementInfo);
                });
                
                return results;
            });

            const formattedResults = elements.map(el => {
                let description = `[${el.index}] ${el.tagName.toUpperCase()}`;
                if (el.type) description += `[${el.type}]`;
                if (el.id) description += ` (id: ${el.id})`;
                if (el.name) description += ` (name: ${el.name})`;
                if (el.placeholder) description += ` (placeholder: ${el.placeholder})`;
                if (el.textContent) description += ` - "${el.textContent}"`;
                description += ` | Selector: ${el.selector}`;
                return description;
            }).join('\n');

            const result = `Found ${elements.length} interactive elements:\n${formattedResults}`;
            tracker.showToolResult(`Found ${elements.length} interactive elements`);
            return result;
        } catch (error) {
            const result = `Error getting elements: ${error.message}`;
            tracker.showToolResult(result, false);
            return result;
        }
    }
});

const smart_click = tool({
    name: 'smart_click',
    description: 'Intelligently clicks on elements using multiple fallback strategies',
    parameters: z.object({
        target: z.string().describe('Text content, CSS selector, or element description'),
    }),
    async execute({ target }) {
        tracker.showToolCall('smart_click', { target });
        
        if (!browserState.page) {
            const result = 'No page is open';
            tracker.showToolResult(result, false);
            return result;
        }

        const strategies = [
            { name: 'button text exact', action: () => browserState.page.click(`button:has-text("${target}")`, { timeout: 2000 }) },
            { name: 'button text case-insensitive', action: async () => {
                const button = browserState.page.locator('button').filter({ hasText: new RegExp(target, 'i') });
                if (await button.count() > 0) await button.first().click();
                else throw new Error('Not found');
            }},
            { name: 'link text', action: () => browserState.page.click(`a:has-text("${target}")`, { timeout: 2000 }) },
            { name: 'CSS selector', action: () => browserState.page.click(target, { timeout: 2000 }) },
            { name: 'role button', action: () => browserState.page.getByRole('button', { name: new RegExp(target, 'i') }).first().click() },
            { name: 'role link', action: () => browserState.page.getByRole('link', { name: new RegExp(target, 'i') }).first().click() },
        ];

        for (const strategy of strategies) {
            try {
                await strategy.action();
                const result = `Successfully clicked using ${strategy.name}: ${target}`;
                tracker.showToolResult(result);
                return result;
            } catch (e) {
                continue;
            }
        }

        const result = `Error: Could not find any clickable element for target: ${target}`;
        tracker.showToolResult(result, false);
        return result;
    }
});

const fill_input_field = tool({
    name: 'fill_input_field',
    description: 'Fills input fields with improved handling for different input types',
    parameters: z.object({
        selector: z.string().describe('CSS selector of the input field'),
        value: z.string().describe('Value to enter in the field'),
        fieldType: z.enum(['text', 'email', 'password', 'number', 'tel', 'url', 'search']).nullable().optional().describe('Type of input field')
    }),
    async execute({ selector, value, fieldType }) {
        tracker.showToolCall('fill_input_field', { selector, value });
        
        if (!browserState.page) {
            const result = 'No page is open';
            tracker.showToolResult(result, false);
            return result;
        }

        try {
            await browserState.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
            const element = browserState.page.locator(selector);
            
            await element.click();
            await browserState.page.keyboard.press('Control+a');
            await element.fill('');
            await browserState.page.waitForTimeout(500);
            await element.fill(value);
            await element.dispatchEvent('input');
            await element.dispatchEvent('change');
            await element.dispatchEvent('blur');

            const result = `Successfully filled field ${selector} with: ${value}`;
            tracker.showToolResult(result);
            return result;
        } catch (error) {
            const result = `Error filling field ${selector}: ${error.message}`;
            tracker.showToolResult(result, false);
            return result;
        }
    }
});

const take_screenshot = tool({
    name: 'take_screenshot',
    description: 'Takes a screenshot of the current page',
    parameters: z.object({}),
    async execute() {
        tracker.showToolCall('take_screenshot');
        
        if (!browserState.page) {
            const result = 'No page is open';
            tracker.showToolResult(result, false);
            return result;
        }

        try {
            await browserState.page.screenshot({ 
                path: browserState.lastScreenshotPath,
                fullPage: true
            });
            const result = `Screenshot saved to ${browserState.lastScreenshotPath}`;
            tracker.showToolResult(result);
            return result;
        } catch (error) {
            const result = `Error taking screenshot: ${error.message}`;
            tracker.showToolResult(result, false);
            return result;
        }
    }
});

const task_complete = tool({
    name: 'task_complete',
    description: 'Marks the current task as complete',
    parameters: z.object({
        summary: z.string().describe('Brief summary of what was accomplished')
    }),
    async execute({ summary }) {
        tracker.showToolCall('task_complete', { summary });
        const result = `✅ Task completed successfully: ${summary}`;
        tracker.showToolResult(result);
        tracker.complete();
        return result;
    }
});

// Main CLI function
async function main() {
    try {
        displayBanner();
        
        // Get user input
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'task',
                message: colors.primary('What would you like the browser agent to do?'),
                default: 'Fill form on https://ui.chaicode.com/auth/signup with random data'
            },
            {
                type: 'confirm',
                name: 'confirm',
                message: colors.warning('Ready to start the automation?'),
                default: true
            }
        ]);

        if (!answers.confirm) {
            console.log(colors.info('Operation cancelled by user.'));
            return;
        }

        // Initialize browser
        browser = await initializeBrowser();
        
        // Create agent
        const agent = Agent.create({
            name: 'Enhanced Browser Agent',
            instructions: system_prompt,
            tools: [
                open_webpage,
                go_to_url,
                get_comprehensive_elements,
                smart_click,
                fill_input_field,
                take_screenshot,
                task_complete
            ],
        });

        console.log(boxen(
            `${symbols.robot} ${colors.info.bold('STARTING AUTOMATION')}\n` +
            `Task: ${colors.highlight(answers.task)}`,
            {
                padding: 1,
                borderStyle: 'round',
                borderColor: 'blue',
                backgroundColor: 'black'
            }
        ));

        // Run the agent
        const response = await run(agent, answers.task, { stream: true });

        // Stream the response with enhanced formatting
        const stream = response.toTextStream({ compatibleWithNodeStreams: true });
        
        stream.on('data', (chunk) => {
            const text = chunk.toString();
            if (text.trim()) {
                // Check if this looks like agent reasoning vs tool output
                if (!text.includes('Tool call:') && !text.includes('Result:')) {
                    tracker.showAgentThinking(text.trim());
                }
            }
        });

        stream.on('end', () => {
            console.log('\n' + colors.success('🎉 Automation completed!'));
        });

        stream.on('error', (error) => {
            tracker.showError(error.message);
        });

    } catch (error) {
        tracker.showError(`Initialization failed: ${error.message}`);
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n' + colors.warning('Shutting down...'));
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

// Start the CLI
main().catch(console.error);