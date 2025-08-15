import 'dotenv/config';
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function main() {
    const response = await client.chat.completions.create({
        model: "gemini-2.0-flash-exp",
        messages: [
            { role: "user", content: "Explain how AI works in a few words" }
        ],
    });

    console.log(response.choices[0].message.content);
}

main().catch(console.error);