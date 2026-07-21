# ai-agent-framework

Lightweight TypeScript framework for building AI agents with tool use, memory, and execution tracing.

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Tests](https://img.shields.io/badge/Tests-29_passing-brightgreen)
![LLM](https://img.shields.io/badge/LLM-Agnostic-blueviolet)

## Architecture

```
┌─────────────────────────────────────────────┐
│              ReAct Agent                    │
│   (Reasoning + Acting loop)                │
├─────────────────────────────────────────────┤
│  Tools (Zod)  │  Memory (Buffer)           │
├─────────────────────────────────────────────┤
│         Provider Adapters                   │
│       OpenAI  ·  Fake (testing)            │
└─────────────────────────────────────────────┘
```

## Quick Start

```bash
npm install ai-agent-framework
```

```typescript
import { ReActAgent, Tool, FakeProvider } from 'ai-agent-framework';
import { z } from 'zod';

const searchTool = Tool.create({
  name: 'search',
  description: 'Search the web',
  input: z.object({ query: z.string() }),
  output: z.object({ result: z.string() }),
  execute: async ({ query }) => ({ result: `Results for: ${query}` }),
});

const agent = new ReActAgent({
  name: 'Assistant',
  provider: new FakeProvider({ defaultBehavior: 'cycle' }),
  tools: [searchTool],
  maxIterations: 5,
});

const result = await agent.run('What is TypeScript?');
console.log(result.output);
console.log(result.trace); // Full execution trace
```

## Running the Example

```bash
git clone https://github.com/Thiago5g/ai-agent-framework.git
cd ai-agent-framework
npm install

# Run with FakeProvider (no API key needed)
npx tsx examples/weather-agent.ts

# Run with OpenAI (requires API key)
OPENAI_API_KEY=sk-... npx tsx examples/weather-agent.ts --openai
```

## Implemented

### ReAct Agent
The core agent pattern. Implements a Reason → Act → Observe loop:

1. Sends messages + tool definitions to the LLM
2. If LLM returns tool calls → executes them, records observation
3. Feeds observation back to LLM
4. Repeats until LLM returns a text answer or max iterations reached

### Type-Safe Tools
Tools are defined with Zod schemas for input/output validation:

```typescript
const calculator = Tool.create({
  name: 'calculator',
  description: 'Evaluate math',
  input: z.object({ expression: z.string() }),
  output: z.object({ result: z.number() }),
  execute: async ({ expression }) => ({ result: eval(expression) }),
});
```

- Input validated before execution
- Output validated after execution
- Auto-generates JSON Schema for LLM function calling

### Providers

| Provider | Purpose | API Key Required |
|----------|---------|-----------------|
| `OpenAIProvider` | Production use with GPT models | Yes |
| `FakeProvider` | Deterministic testing, no network calls | No |

**FakeProvider behaviors:**
- `echo` — Returns the user message back
- `tool` — Always calls the first available tool
- `cycle` — First call → tool, second call → answer (simulates full ReAct loop)

### Buffer Memory
Stores the last N messages as conversation context:

```typescript
import { BufferMemory } from 'ai-agent-framework';

const memory = new BufferMemory({ maxMessages: 20 });
const agent = new ReActAgent({ ..., memory });

// Conversation context persists across runs
await agent.run('My name is Thiago');
await agent.run('What is my name?'); // Has context from previous run
```

### Execution Traces
Every agent run produces a detailed trace:

```typescript
const result = await agent.run('...');

result.trace.steps;   // [{ type: 'action', content: '...' }, ...]
result.trace.metrics; // { totalTokens, latencyMs, toolCalls, iterations }
```

### Middleware Hooks
Lifecycle hooks for cross-cutting concerns:

```typescript
const agent = new ReActAgent({
  middleware: [{
    name: 'logger',
    before: async (ctx) => console.log('Starting...'),
    after: async (ctx) => console.log(`Done in ${ctx.trace.metrics.latencyMs}ms`),
    onError: async (ctx, err) => console.error(err),
  }],
});
```

## Project Structure

```
src/
├── core/
│   ├── agent.ts        # BaseAgent abstract class + lifecycle
│   ├── tool.ts         # Tool builder with Zod validation
│   └── provider.ts     # LLMProvider interface + types
├── agents/
│   └── react.agent.ts  # ReAct loop implementation
├── providers/
│   ├── fake.provider.ts    # Deterministic testing provider
│   └── openai.provider.ts  # OpenAI API provider
├── memory/
│   ├── types.ts            # Memory interface
│   └── buffer.memory.ts    # Buffer memory implementation
└── index.ts                # Public API exports
tests/
├── core/tool.test.ts
├── agents/react.test.ts
├── providers/fake.test.ts
└── memory/buffer.test.ts
examples/
└── weather-agent.ts    # Runnable example with FakeProvider
```

## Testing

```bash
npm test          # 29 tests, no API calls, fully offline
npm run typecheck # TypeScript validation
npm run build     # Compile to dist/
```

## Design Decisions

**No LangChain / CrewAI dependency** — The framework is explicit about control flow. You can read every line that executes during an agent run. The trade-off is less ecosystem, more understanding and debuggability.

**FakeProvider as first-class citizen** — Testing agents shouldn't require API keys or network. The FakeProvider simulates realistic LLM behavior (tool calling, cycling) deterministically.

**Zod for tool schemas** — Runtime validation catches bugs at the tool boundary. The same schema generates JSON Schema for the LLM and validates actual I/O.

**Provider interface, not inheritance** — Swap between OpenAI, local models, or test doubles with one line. No class hierarchy to navigate.

## Roadmap

- [ ] Plan-and-Execute Agent (multi-step planning)
- [ ] Multi-Agent Orchestration (Supervisor, Pipeline, Parallel)
- [ ] Vector Memory (semantic search over past interactions)
- [ ] Summary Memory (LLM-compressed conversation history)
- [ ] Anthropic Provider
- [ ] Ollama Provider (local models)
- [ ] Streaming support for real-time UIs
- [ ] OpenTelemetry trace export

## License

MIT
