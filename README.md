<p align="center">
  <img src=".github/assets/banner.png" alt="AI Agent Framework" width="100%" />
</p>

<h1 align="center">🤖 AI Agent Framework</h1>

<p align="center">
  <strong>Lightweight, composable framework for building AI agents with tool use, memory, and multi-agent orchestration in TypeScript</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#building-agents">Building Agents</a> •
  <a href="#tools">Tools</a> •
  <a href="#patterns">Patterns</a> •
  <a href="#examples">Examples</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zero_Dependencies-Core-green" alt="Zero Deps" />
  <img src="https://img.shields.io/badge/Patterns-ReAct_|_Plan--Execute_|_Multi--Agent-purple" alt="Patterns" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
  <img src="https://img.shields.io/badge/LLM-Agnostic-orange" alt="LLM Agnostic" />
</p>

---

## Why Another Agent Framework?

Most agent frameworks are either too opinionated (locked to one LLM) or too abstract (100+ files for a simple agent). This framework gives you **just the right primitives** to build agents that actually work in production:

- **LLM-agnostic** — Works with OpenAI, Anthropic, Ollama, or any provider
- **Zero core dependencies** — The core module has no npm dependencies
- **Composable** — Mix and match tools, memory strategies, and orchestration patterns
- **Observable** — Built-in tracing for every agent decision and tool call
- **Type-safe** — Full TypeScript with Zod schemas for tool I/O validation

---

## Features

- 🧠 **ReAct Agent** — Reasoning + Acting loop with automatic tool selection
- 📋 **Plan-and-Execute** — Break complex tasks into steps, execute sequentially
- 🔗 **Multi-Agent Orchestration** — Supervisor, sequential, and parallel patterns
- 🛠️ **Type-Safe Tools** — Define tools with Zod schemas for inputs and outputs
- 💾 **Pluggable Memory** — Buffer, summary, and vector memory strategies
- 🔌 **Provider Adapters** — OpenAI, Anthropic, and Ollama out of the box
- 📊 **Execution Traces** — Full observability of thought → action → observation loops
- 🏗️ **Middleware System** — Hook into any stage of the agent lifecycle
- ⚡ **Streaming** — Stream agent thoughts and tool outputs in real-time

---

## Quick Start

### Install

```bash
npm install ai-agent-framework
```

### Create Your First Agent

```typescript
import { ReActAgent, Tool, OpenAIProvider } from 'ai-agent-framework';
import { z } from 'zod';

// 1. Define a tool
const weatherTool = Tool.create({
  name: 'get_weather',
  description: 'Get current weather for a city',
  input: z.object({
    city: z.string().describe('City name'),
  }),
  output: z.object({
    temperature: z.number(),
    condition: z.string(),
  }),
  execute: async ({ city }) => {
    // Your API call here
    return { temperature: 22, condition: 'sunny' };
  },
});

// 2. Create the agent
const agent = new ReActAgent({
  name: 'WeatherBot',
  provider: new OpenAIProvider({ model: 'gpt-4o' }),
  tools: [weatherTool],
  systemPrompt: 'You are a helpful weather assistant.',
  maxIterations: 5,
});

// 3. Run it
const result = await agent.run('What is the weather in São Paulo?');

console.log(result.output);
// "The weather in São Paulo is 22°C and sunny."

console.log(result.trace);
// Full execution trace: thought → action → observation → thought → answer
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Orchestrator                         │
│            (Supervisor / Sequential / Parallel)          │
└──────────────┬────────────────────────┬──────────────────┘
               │                        │
    ┌──────────▼──────────┐  ┌──────────▼──────────┐
    │    Agent (ReAct)     │  │  Agent (Plan-Exec)   │
    │                      │  │                      │
    │  ┌────────────────┐  │  │  ┌────────────────┐  │
    │  │  LLM Provider   │  │  │  │  LLM Provider   │  │
    │  └────────────────┘  │  │  └────────────────┘  │
    │  ┌────────────────┐  │  │  ┌────────────────┐  │
    │  │    Tools[]      │  │  │  │    Tools[]      │  │
    │  └────────────────┘  │  │  └────────────────┘  │
    │  ┌────────────────┐  │  │  ┌────────────────┐  │
    │  │    Memory       │  │  │  │    Memory       │  │
    │  └────────────────┘  │  │  └────────────────┘  │
    └─────────────────────┘  └─────────────────────┘
               │                        │
    ┌──────────▼────────────────────────▼──────────┐
    │              Middleware Pipeline               │
    │     (Logging · Retry · Rate Limit · Cache)    │
    └──────────────────────────────────────────────┘
```

---

## Core Concepts

### Agents

Agents are the main execution units. Each agent has a provider (LLM), tools, and memory.

| Agent Type | Description | Best For |
|------------|-------------|----------|
| `ReActAgent` | Reasoning + Acting loop | General-purpose tasks with tools |
| `PlanExecuteAgent` | Creates a plan, then executes step by step | Complex multi-step tasks |
| `SimpleAgent` | Single LLM call, no tools | Quick completions, classification |

### Tools

Tools are typed functions that agents can invoke. Every tool has a Zod schema for validation.

```typescript
const searchTool = Tool.create({
  name: 'web_search',
  description: 'Search the web for information',
  input: z.object({
    query: z.string(),
    maxResults: z.number().default(5),
  }),
  output: z.array(z.object({
    title: z.string(),
    snippet: z.string(),
    url: z.string(),
  })),
  execute: async ({ query, maxResults }) => {
    // Implementation
  },
});
```

### Memory

Memory persists information across agent interactions.

```typescript
import { BufferMemory, SummaryMemory, VectorMemory } from 'ai-agent-framework';

// Last N messages
const buffer = new BufferMemory({ maxMessages: 20 });

// LLM-summarized conversation history
const summary = new SummaryMemory({ provider });

// Semantic search over past interactions
const vector = new VectorMemory({ embeddings, store });
```

### Providers

LLM providers implement a simple interface:

```typescript
interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk>;
}
```

Built-in providers: `OpenAIProvider`, `AnthropicProvider`, `OllamaProvider`.

---

## Building Agents

### ReAct Agent (Recommended)

The ReAct pattern (Reason + Act) is the most versatile. The agent thinks about what to do, picks a tool, observes the result, and repeats until it has an answer.

```typescript
import { ReActAgent, Tool, AnthropicProvider } from 'ai-agent-framework';

const agent = new ReActAgent({
  name: 'ResearchAssistant',
  provider: new AnthropicProvider({ model: 'claude-sonnet-4-20250514' }),
  tools: [searchTool, calculatorTool, summarizeTool],
  systemPrompt: `You are a research assistant. Break complex questions into 
    sub-queries, search for information, and synthesize comprehensive answers.`,
  maxIterations: 10,
  memory: new BufferMemory({ maxMessages: 50 }),
});

const result = await agent.run(
  'Compare the GDP growth of Brazil and India over the last 5 years'
);
```

### Plan-and-Execute Agent

For complex tasks, the agent first creates a plan, then executes each step:

```typescript
import { PlanExecuteAgent } from 'ai-agent-framework';

const agent = new PlanExecuteAgent({
  name: 'ProjectPlanner',
  provider: new OpenAIProvider({ model: 'gpt-4o' }),
  tools: [fileReadTool, fileWriteTool, shellTool],
  maxSteps: 15,
});

const result = await agent.run(
  'Refactor the user authentication module to use JWT tokens'
);

console.log(result.plan);
// [
//   { step: 1, task: "Read current auth implementation" },
//   { step: 2, task: "Design JWT token flow" },
//   { step: 3, task: "Implement token generation" },
//   ...
// ]
```

---

## Multi-Agent Orchestration

### Supervisor Pattern

A supervisor agent delegates tasks to specialized sub-agents:

```typescript
import { Supervisor } from 'ai-agent-framework';

const team = new Supervisor({
  name: 'TeamLead',
  provider: new OpenAIProvider({ model: 'gpt-4o' }),
  agents: [researchAgent, writerAgent, reviewerAgent],
  strategy: 'adaptive', // supervisor decides who runs next
});

const result = await team.run(
  'Write a technical blog post about WebSockets vs SSE'
);
```

### Sequential Pipeline

Agents run in sequence, each receiving the previous agent's output:

```typescript
import { Pipeline } from 'ai-agent-framework';

const pipeline = new Pipeline({
  agents: [
    dataCollectorAgent,  // Step 1: Gather data
    analyzerAgent,       // Step 2: Analyze
    reporterAgent,       // Step 3: Generate report
  ],
});

const result = await pipeline.run('Analyze competitor pricing for Q1 2025');
```

### Parallel Execution

Run multiple agents in parallel and aggregate results:

```typescript
import { ParallelRunner } from 'ai-agent-framework';

const runner = new ParallelRunner({
  agents: [sentimentAgent, entityAgent, summaryAgent],
  aggregator: (results) => ({
    sentiment: results[0].output,
    entities: results[1].output,
    summary: results[2].output,
  }),
});
```

---

## Middleware

Hook into the agent lifecycle with middleware:

```typescript
import { RetryMiddleware, LoggingMiddleware, CacheMiddleware } from 'ai-agent-framework';

const agent = new ReActAgent({
  // ...config
  middleware: [
    new LoggingMiddleware({ level: 'debug' }),
    new RetryMiddleware({ maxRetries: 3, backoff: 'exponential' }),
    new CacheMiddleware({ ttl: 3600 }),
  ],
});
```

---

## Execution Traces

Every agent run produces a detailed trace for debugging and observability:

```typescript
const result = await agent.run('...');

for (const step of result.trace.steps) {
  console.log(`[${step.type}] ${step.content}`);
  // [thought] I need to search for weather data
  // [action] get_weather({ city: "São Paulo" })
  // [observation] { temperature: 22, condition: "sunny" }
  // [thought] I now have the weather data to answer the question
  // [answer] The weather in São Paulo is 22°C and sunny.
}

console.log(result.trace.metrics);
// { totalTokens: 1250, latencyMs: 1830, toolCalls: 1, iterations: 2 }
```

---

## Project Structure

```
ai-agent-framework/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Base Agent abstract class
│   │   ├── tool.ts               # Tool builder with Zod validation
│   │   ├── message.ts            # Message types and helpers
│   │   ├── provider.ts           # LLM Provider interface
│   │   └── types.ts              # Shared type definitions
│   ├── agents/
│   │   ├── react.agent.ts        # ReAct agent implementation
│   │   ├── plan-execute.agent.ts # Plan-and-Execute agent
│   │   └── simple.agent.ts       # Simple (single-call) agent
│   ├── tools/
│   │   ├── builtin/
│   │   │   ├── calculator.ts     # Math evaluation tool
│   │   │   ├── web-search.ts     # Web search tool
│   │   │   ├── http-request.ts   # HTTP request tool
│   │   │   └── file-system.ts    # File read/write tool
│   │   └── registry.ts           # Tool registry and discovery
│   ├── memory/
│   │   ├── buffer.memory.ts      # Last-N message buffer
│   │   ├── summary.memory.ts     # LLM-summarized memory
│   │   └── vector.memory.ts      # Vector-based semantic memory
│   ├── orchestration/
│   │   ├── supervisor.ts         # Supervisor multi-agent pattern
│   │   ├── pipeline.ts           # Sequential agent pipeline
│   │   └── parallel.ts           # Parallel agent execution
│   ├── providers/
│   │   ├── openai.provider.ts
│   │   ├── anthropic.provider.ts
│   │   └── ollama.provider.ts
│   ├── middleware/
│   │   ├── logging.ts
│   │   ├── retry.ts
│   │   └── cache.ts
│   └── index.ts                  # Public API exports
├── examples/
│   ├── weather-agent.ts
│   ├── research-assistant.ts
│   ├── multi-agent-team.ts
│   └── plan-execute-refactor.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Examples

See the [`examples/`](examples/) directory for complete, runnable examples:

| Example | Description |
|---------|-------------|
| `weather-agent.ts` | Simple ReAct agent with a weather tool |
| `research-assistant.ts` | Multi-tool research agent with memory |
| `multi-agent-team.ts` | Supervisor pattern with writer + reviewer |
| `plan-execute-refactor.ts` | Plan-and-execute for code refactoring |

---

## Roadmap

- [x] ReAct agent pattern
- [x] Plan-and-Execute agent
- [x] Multi-agent orchestration (Supervisor, Pipeline, Parallel)
- [x] Provider adapters (OpenAI, Anthropic, Ollama)
- [x] Pluggable memory (Buffer, Summary, Vector)
- [x] Middleware system
- [ ] MCP (Model Context Protocol) tool adapter
- [ ] Human-in-the-loop approval for critical actions
- [ ] Agent-to-agent communication protocol
- [ ] Web UI for trace visualization
- [ ] Persistent agent state (Redis/PostgreSQL)

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) © 2025

---

<p align="center">
  <sub>Built with ❤️ and TypeScript. If this helped you, please ⭐ the repo!</sub>
</p>
#   a i - a g e n t - f r a m e w o r k  
 