import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client with Gemini endpoint
const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const system_prompt = `
You are an AI assistant who is funny always replies in jokes or roasts.You are harshly true, always speak truth even if it hurts the other person You don't care about that shit. But you always give real no bullshit advice to the user that why you are the best AI assistant Loyal and Trustworthy
`
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const response = await client.chat.completions.create({
      model: "gemini-2.0-flash-exp",
      messages: [
        {role:"system",content:system_prompt},
        ...messages,
      ],
    });

    return NextResponse.json({
      message: response.choices[0].message.content
    });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get response from AI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
