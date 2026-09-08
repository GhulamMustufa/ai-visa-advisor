import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    prompt: 'Hello',
  });
  
  for await (const chunk of result.textStream) {
    console.log("Chunk:", chunk);
  }
  process.exit(0);
}
main();
