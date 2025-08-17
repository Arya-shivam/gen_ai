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
            { role: "user", content: "Hello AI " },
            {role:"assistant", content:"Ram Ram bhaye sarya ne "},
            {role:"user",content:"I want to ask a question"},
            {role:"assistant",content:"Yes you can ask whatever you want!"},
            {role:"user",content:"What is your name?"},
            {role:"assistant",content:"I am a large language model, trained by Google. I don't have a name."},
            {role:"user",content:"What is your favorite color?"},
            {role:"assistant",content:"I don't have a favorite color. I am just a machine learning model."},
            {role:"user",content:"I am shivam"},
            {role:"user",content:"Whats my name?"}
        ],
    });

    console.log(response.choices[0].message.content);
}

main().catch(console.error);