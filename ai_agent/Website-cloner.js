import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora'; // <-- Import ora for spinners
import boxen from 'boxen'; // <-- Import boxen for boxes

// --- Essential Setup for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Tool Definitions ---

/**
 * A robust tool to clone a website's UI, preserving folder structure and rewriting paths.
 * @param {string} url The URL of the website to clone.
 * @param {string} outputDir The directory to save the cloned UI.
 * @returns {Promise<string>} A summary of the cloning operation.
 */
async function cloneWebsiteUI(url, outputDir = 'cloned_site') {
    if (!url) return "URL is required.";
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

        return `Cloned UI from ${url} and saved ${assetsToSave.size} assets to '${outputDir}'.`;

    } catch (error) {
        throw new Error(`An error occurred during UI capture: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Starts a simple static file server for a given directory.
 */
function startLocalServer(directory, port = 8080) {
    const fullPath = path.join(__dirname, directory);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Directory '${fullPath}' does not exist.`);
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

    return `Server for '${directory}' is running on http://localhost:${port}.`;
}

// --- Main Execution Block ---
async function main() {
  const targetUrl = process.argv[2];

  console.log(boxen(chalk.bold('Website UI Cloner'), { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }));

  if (!targetUrl) {
    console.error(chalk.red('Error: Please provide a website URL as a command-line argument.'));
    console.log(chalk.yellow('Example: node your_script_name.js https://www.example.com'));
    process.exit(1);
  }

  const urlObject = new URL(targetUrl);
  const outputDirectory = `cloned_${urlObject.hostname}`;

  const cloningSpinner = ora(`Cloning UI from ${chalk.cyan(targetUrl)}...`).start();
  
  try {
    const cloneResult = await cloneWebsiteUI(targetUrl, outputDirectory);
    cloningSpinner.succeed(chalk.green(cloneResult));

    const serverSpinner = ora('Starting local server...').start();
    const serverResult = startLocalServer(outputDirectory);
    serverSpinner.succeed(chalk.green('Local server started successfully!'));

    const finalMessage = `
${chalk.bold('Success!')}

Your cloned website is now running.

${chalk.bold('Local URL:')} ${chalk.cyan(`http://localhost:8080`)}
${chalk.bold('Files saved to:')} ${chalk.cyan(outputDirectory)}

${chalk.dim('Press Ctrl+C to stop the server.')}
    `;
    console.log(boxen(finalMessage, { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'green' }));

  } catch (error) {
    cloningSpinner.fail(chalk.red('Cloning failed.'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

main();
