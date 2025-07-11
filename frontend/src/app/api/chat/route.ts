import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Log if API key is missing to help with debugging
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
  try {
    const { messages, image } = await request.json();

    // Add system message to focus on Solana blockchain queries only
    const systemMessage = {
      role: 'system',
      content: 'You are DartAI, a specialized assistant focused exclusively on Solana blockchain queries. Provide information about Solana development, architecture, programs, tokens, NFTs, and ecosystem. Do NOT provide trading advice, price predictions, or investment recommendations. Focus solely on technical and educational aspects of the Solana blockchain.'
    };

    // Define interface for chat messages
    interface ChatMessage {
      role: 'user' | 'assistant' | 'system';
      content: string;
    }

    // Prepare the messages array for the API call
    const apiMessages = [
      systemMessage,
      ...messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      }))
    ];

    // If there's an image, add it to the latest user message
    if (image && apiMessages.length > 0) {
      // Find the last user message
      const lastUserMessageIndex = apiMessages
        .map((msg: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }, index: number) => ({ role: msg.role, index }))
        .filter((msg: { role: string; index: number }) => msg.role === 'user')
        .pop()?.index;

      if (lastUserMessageIndex !== undefined) {
        // Convert the content to an array if it's not already
        if (typeof apiMessages[lastUserMessageIndex].content === 'string') {
          apiMessages[lastUserMessageIndex].content = [
            { type: 'text', text: apiMessages[lastUserMessageIndex].content },
          ];
        }

        // Add the image to the content array
        apiMessages[lastUserMessageIndex].content.push({
          type: 'image_url',
          image_url: {
            url: image,
          },
        });
      }
    }

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: apiMessages,
      max_tokens: 500,
    });

    // Return the response
    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}