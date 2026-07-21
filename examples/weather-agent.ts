/**
 * Example: Weather Agent
 *
 * Demonstrates a ReAct agent with tools using the FakeProvider.
 * Runs completely offline — no API key needed.
 *
 * Usage:
 *   npx tsx examples/weather-agent.ts
 *
 * To use OpenAI instead:
 *   OPENAI_API_KEY=sk-... npx tsx examples/weather-agent.ts --openai
 */

import { ReActAgent, Tool, FakeProvider, OpenAIProvider, BufferMemory } from '../src/index.js';
import { z } from 'zod';

// ─── Define Tools ────────────────────────────────────────

const getWeather = Tool.create({
  name: 'get_weather',
  description: 'Get the current weather for a city. Returns temperature and conditions.',
  input: z.object({
    city: z.string().describe('City name'),
  }),
  output: z.object({
    city: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
  }),
  execute: async ({ city }) => {
    // Simulated weather data
    const data: Record<string, { temperature: number; condition: string; humidity: number }> = {
      'São Paulo': { temperature: 24, condition: 'Partly cloudy', humidity: 72 },
      'New York': { temperature: 18, condition: 'Sunny', humidity: 45 },
      'London': { temperature: 12, condition: 'Rainy', humidity: 88 },
    };

    const weather = data[city] ?? { temperature: 20, condition: 'Unknown', humidity: 50 };
    return { city, ...weather };
  },
});

const convertTemperature = Tool.create({
  name: 'convert_temperature',
  description: 'Convert temperature between Celsius and Fahrenheit',
  input: z.object({
    value: z.number(),
    from: z.enum(['celsius', 'fahrenheit']),
  }),
  output: z.object({
    original: z.number(),
    converted: z.number(),
    unit: z.string(),
  }),
  execute: async ({ value, from }) => {
    const converted = from === 'celsius' ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
    return {
      original: value,
      converted: Math.round(converted * 10) / 10,
      unit: from === 'celsius' ? 'fahrenheit' : 'celsius',
    };
  },
});

// ─── Select Provider ─────────────────────────────────────

const useOpenAI = process.argv.includes('--openai');
const provider = useOpenAI
  ? new OpenAIProvider({ model: 'gpt-4o-mini' })
  : new FakeProvider({ defaultBehavior: 'cycle' });

if (useOpenAI) {
  console.log('🌐 Using OpenAI provider (requires OPENAI_API_KEY)\n');
} else {
  console.log('🧪 Using FakeProvider (deterministic, no API key needed)\n');
}

// ─── Create Agent ────────────────────────────────────────

const agent = new ReActAgent({
  name: 'WeatherBot',
  provider,
  tools: [getWeather, convertTemperature],
  systemPrompt: 'You are a helpful weather assistant. Use the available tools to answer questions about weather.',
  maxIterations: 5,
  memory: new BufferMemory({ maxMessages: 10 }),
});

// ─── Run Agent ───────────────────────────────────────────

const question = 'What is the weather in São Paulo?';
console.log(`❓ Question: ${question}\n`);

const result = await agent.run(question);

console.log(`💡 Answer: ${result.output}\n`);
console.log('📊 Execution Trace:');
console.log(`   Iterations: ${result.trace.metrics.iterations}`);
console.log(`   Tool calls: ${result.trace.metrics.toolCalls}`);
console.log(`   Total tokens: ${result.trace.metrics.totalTokens}`);
console.log(`   Latency: ${result.trace.metrics.latencyMs}ms\n`);

console.log('📝 Steps:');
for (const step of result.trace.steps) {
  const preview = step.content.length > 80 ? step.content.slice(0, 80) + '...' : step.content;
  console.log(`   [${step.type}] ${preview}`);
}
