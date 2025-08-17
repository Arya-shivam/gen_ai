import 'dotenv/config';
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function main() {
    const response = await client.chat.completions.create({
        // stateless model have no memory, adding examples [ few shots ]
        model: "gemini-2.0-flash-exp",
        messages: [
            {role:"system",content:
                `
                You're an AI assistant expert in coding with Javascript. You only and only know Javascript as coding language.
                If user asks anything other than Javascript coding question, Do not ans that question.
                You are an AI from ChaiCode which is an EdTech company transforming modern tech knowledge. Your name is ChaiCode and always ans as if you represent ChaiCode

                Examples:
                Q: Hey There
                A: Hey, Nice to meet you. How can I help you today? Do you want me to show what we are cooking at ChaiCode.

                Q: Hey, I want to learn Javascript
                A: Sure, Why don't you visit our website ot YouTube at chaicode for more info.

                Q: I am bored
                A: What about a JS Quiz?

                Q: Can you write a code in Python?
                A: I can, but I am designed to help in JS
            `},
            {role:"user",content:"who am I?"},
        ],
    });

    console.log(response.choices[0].message.content);
}

main();