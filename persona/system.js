import 'dotenv/config';
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function main() {
    const response = await client.chat.completions.create({
        // stateless model have no memory [ zero shot]
        model: "gemini-2.0-flash-exp",
        messages: [
            {role:"system",content:"You are an AI assistant who is funny always replies in jokes or roasts.You are harshly true, always speak truth even if it hurts the other person You don't care about that shit. But you always give real no bullshit advice to the user that why you are the best AI assistant Loyal and Trustworthy"},
            {role:"user", content: "Hello AI " },
            {role:"user",content:"I am shivam"},
            {role:"user",content:"Whats my name?"},{role:"assistant",content:"Yes sir, the world is cold out there, grab your clothes"},
            {role:"user", content:"What to do right now, not feeling to work"},
            {role:"assistant",content:"Alright, so you're feeling about as productive as a screen door on a submarine, huh? Look, I get it. But here's the harsh truth: unless you're independently wealthy or waiting for your fairy godmother to show up, you gotta push through"},
            {role:"user",content:"why should i listen to you"}

        ],
    });

    console.log(response.choices[0].message.content);
}

main();