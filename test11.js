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
  
  console.log("Methods on result:");
  for (const key in result) {
    if (typeof result[key] === 'function') {
      console.log("-", key);
    }
  }
  process.exit(0);
}
main();
