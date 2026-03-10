/**
 * Example: Weather Agent
 *
 * A simple ReAct agent that can look up weather information
 * and answer questions about it.
 *
 * Usage:
 *   npx tsx examples/weather-agent.ts
 */

import { ReActAgent, Tool } from '../src/index.js';
import { z } from 'zod';

// --- Define Tools ---

const getWeather = Tool.create({
  name: 'get_weather',
  description: 'Get the current weather for a city. Returns temperature in Celsius and conditions.',
  input: z.object({
    city: z.string().describe('The city name, e.g. "São Paulo"'),
    country: z.string().optional().describe('ISO country code, e.g. "BR"'),
  }),
  output: z.object({
    city: z.string(),
    temperature: z.number(),
    feelsLike: z.number(),
    condition: z.string(),
    humidity: z.number(),
  }),
  execute: async ({ city, country }) => {
    // In production, call a real weather API
    console.log(`🌍 Fetching weather for ${city}${country ? `, ${country}` : ''}...`);

    // Simulated response
    return {
      city,
      temperature: 24,
      feelsLike: 26,
      condition: 'Partly cloudy',
      humidity: 72,
    };
  },
});

const convertTemperature = Tool.create({
  name: 'convert_temperature',
  description: 'Convert a temperature between Celsius and Fahrenheit',
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
    const unit = from === 'celsius' ? 'fahrenheit' : 'celsius';
    return { original: value, converted: Math.round(converted * 10) / 10, unit };
  },
});

// --- Create Agent ---

// NOTE: Replace with your actual LLM provider
// import { OpenAIProvider } from '../src/providers/openai.provider.js';
// const provider = new OpenAIProvider({ model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY });

// For this example, we'll show the structure only
console.log('🤖 Weather Agent Example');
console.log('========================');
console.log('');
console.log('To run this example, configure an LLM provider:');
console.log('');
console.log('  const agent = new ReActAgent({');
console.log("    name: 'WeatherBot',");
console.log('    provider: new OpenAIProvider({ model: "gpt-4o" }),');
console.log('    tools: [getWeather, convertTemperature],');
console.log("    systemPrompt: 'You are a helpful weather assistant.',");
console.log('  });');
console.log('');
console.log('  const result = await agent.run("What\\'s the weather in São Paulo in Fahrenheit?");');
console.log('  console.log(result.output);');
console.log('  console.log(result.trace);');

// Show the tool schemas that would be sent to the LLM
console.log('\n📋 Registered tool schemas:');
console.log(JSON.stringify(getWeather.toFunctionSchema(), null, 2));
console.log(JSON.stringify(convertTemperature.toFunctionSchema(), null, 2));
