# ai-agent-framework

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)
![LLM](https://img.shields.io/badge/LLM-Agnostic-blueviolet)

**A minimal, type-safe TypeScript framework for building AI agents — no runtime dependencies, no vendor lock-in.**

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Orchestrator                    │
│         (Supervisor / Sequential / Parallel)    │
├────────────────┬────────────────┬───────────────┤
│  ReAct Agent   │ Plan+Execute   │  Custom Agent │
├────────────────┴────────────────┴───────────────┤
│              Middleware Pipeline                 │
│           (Logging · Retry · Cache)             │
├─────────────────────────────────────────────────┤
│   Tools (Zod)  │  Memory (Buffer/Summary/Vec)  │
├─────────────────────────────────────────────────┤
│           Provider Adapters                     │
│        OpenAI · Anthropic · Ollama              │
└─────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { ReActAgent, tool, OpenAIProvider } from 'ai-agent-framework';
import { z } from 'zod';

const search = tool({
  name: 'web_search',
  description: 'Search the web for current information',
  schema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // your search implementation
    return `Results for: ${query}`;
  },
});

const agent = new ReActAgent({
  provider: new OpenAIProvider({ model: 'gpt-4o' }),
  tools: [search],
  maxIterations: 10,
});

const result = await agent.run('What is the current price of Bitcoin?');
console.log(result.output);
console.log(result.trace); // full execution trace
```

## Features

- **ReAct Agent** — Reasoning + Acting loop with automatic tool selection
- **Plan-and-Execute** — Breaks complex tasks into ordered steps, executes each with tool access
- **Multi-Agent Orchestration** — Supervisor, Sequential, and Parallel coordination patterns
- **Type-Safe Tools** — Zod schema validation for inputs/outputs at compile time
- **Pluggable Memory** — Buffer, Summary, and Vector memory backends
- **Provider Adapters** — OpenAI, Anthropic, Ollama — swap with one line
- **Execution Traces** — Full observability into reasoning steps, tool calls, and timing
- **Middleware System** — Composable logging, retry, and caching layers
- **Streaming** — Token-level streaming for real-time UIs
- **Zero Dependencies** — Core framework has no runtime dependencies

## Why This Exists

Most agent frameworks (LangChain, CrewAI) trade simplicity for abstraction layers that obscure control flow and make debugging painful. This framework takes the opposite approach: explicit execution, full type safety, and zero magic. You understand every line that runs because the framework stays out of your way.

## Project Structure

```
src/
├── agents/          # ReAct, PlanAndExecute, base classes
├── orchestration/   # Supervisor, Sequential, Parallel
├── memory/          # Buffer, Summary, Vector backends
├── middleware/      # Logging, Retry, Cache
├── providers/       # OpenAI, Anthropic, Ollama adapters
├── tools/           # Tool definition, registry, validation
└── index.ts         # Public API
examples/
├── react-agent.ts
├── multi-agent.ts
└── streaming.ts
```

## Roadmap

- [ ] Persistent conversation threads
- [ ] Built-in RAG pipeline
- [ ] Agent-to-agent messaging protocol
- [ ] OpenTelemetry trace export
- [ ] CLI for scaffolding agents

## License

MIT
