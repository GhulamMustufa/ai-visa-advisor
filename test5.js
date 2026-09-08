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
  console.log("toAIStreamResponse:", typeof result.toAIStreamResponse);
  console.log("toDataStreamResponse:", typeof result.toDataStreamResponse);
  console.log("toDataStream:", typeof result.toDataStream);
  process.exit(0);
}
main();
