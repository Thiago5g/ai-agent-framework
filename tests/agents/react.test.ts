import { describe, it, expect } from 'vitest';
import { ReActAgent } from '../../src/agents/react.agent.js';
import { FakeProvider } from '../../src/providers/fake.provider.js';
import { BufferMemory } from '../../src/memory/buffer.memory.js';
import { Tool } from '../../src/core/tool.js';
import { z } from 'zod';

const weatherTool = Tool.create({
  name: 'get_weather',
  description: 'Get weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({ temperature: z.number(), condition: z.string() }),
  execute: async ({ city }) => ({
    temperature: 22,
    condition: `Sunny in ${city}`,
  }),
});

describe('ReActAgent', () => {
  it('runs a complete ReAct loop with tool use', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'cycle' });
    const agent = new ReActAgent({
      name: 'TestAgent',
      provider,
      tools: [weatherTool],
      maxIterations: 5,
    });

    const result = await agent.run('What is the weather in London?');

    expect(result.output).toBeTruthy();
    expect(result.trace.agentName).toBe('TestAgent');
    expect(result.trace.metrics.toolCalls).toBeGreaterThanOrEqual(1);
    expect(result.trace.metrics.iterations).toBeGreaterThanOrEqual(1);
  });

  it('records execution trace with steps', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'cycle' });
    const agent = new ReActAgent({
      name: 'TraceAgent',
      provider,
      tools: [weatherTool],
    });

    const result = await agent.run('Test question');

    expect(result.trace.steps.length).toBeGreaterThan(0);
    // Should have action and observation steps from tool use
    const actionSteps = result.trace.steps.filter((s) => s.type === 'action');
    const observationSteps = result.trace.steps.filter((s) => s.type === 'observation');
    expect(actionSteps.length).toBeGreaterThanOrEqual(1);
    expect(observationSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('handles agent with no tools (direct answer)', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    const agent = new ReActAgent({
      name: 'NoToolsAgent',
      provider,
      tools: [],
    });

    const result = await agent.run('Hello');

    expect(result.output).toContain('Hello');
    expect(result.trace.metrics.toolCalls).toBe(0);
  });

  it('respects maxIterations limit', async () => {
    // Provider that always wants to use tools (never answers)
    const provider = new FakeProvider({ defaultBehavior: 'tool' });
    const agent = new ReActAgent({
      name: 'LoopAgent',
      provider,
      tools: [weatherTool],
      maxIterations: 3,
    });

    const result = await agent.run('test');

    expect(result.trace.metrics.iterations).toBe(3);
    expect(result.output).toContain('unable to complete');
  });

  it('handles tool not found gracefully', async () => {
    const provider = new FakeProvider({
      responses: [
        {
          match: /.*/,
          toolCalls: [{ id: 'call_1', name: 'nonexistent_tool', arguments: {} }],
        },
      ],
    });

    const agent = new ReActAgent({
      name: 'ErrorAgent',
      provider,
      tools: [weatherTool],
      maxIterations: 2,
    });

    // Should not throw, but handle gracefully
    const result = await agent.run('test');
    const errorSteps = result.trace.steps.filter((s) => s.type === 'error');
    expect(errorSteps.length).toBeGreaterThanOrEqual(1);
    expect(errorSteps[0].content).toContain('not found');
  });

  it('handles tool execution errors gracefully', async () => {
    const failingTool = Tool.create({
      name: 'failing_tool',
      description: 'Always fails',
      input: z.object({ input: z.string() }),
      output: z.object({ result: z.string() }),
      execute: async () => {
        throw new Error('Tool exploded!');
      },
    });

    const provider = new FakeProvider({ defaultBehavior: 'cycle' });
    const agent = new ReActAgent({
      name: 'ErrorAgent',
      provider,
      tools: [failingTool],
      maxIterations: 3,
    });

    const result = await agent.run('test');
    const errorSteps = result.trace.steps.filter((s) => s.type === 'error');
    expect(errorSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('integrates with BufferMemory', async () => {
    const memory = new BufferMemory({ maxMessages: 10 });
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    const agent = new ReActAgent({
      name: 'MemoryAgent',
      provider,
      tools: [],
      memory,
    });

    await agent.run('First question');
    await agent.run('Second question');

    const stored = await memory.load();
    // Should have: user1, assistant1, user2, assistant2
    expect(stored.length).toBe(4);
    expect(stored[0].content).toBe('First question');
    expect(stored[2].content).toBe('Second question');
  });

  it('tracks token usage across iterations', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'cycle' });
    const agent = new ReActAgent({
      name: 'TokenAgent',
      provider,
      tools: [weatherTool],
    });

    const result = await agent.run('test');
    // FakeProvider returns 20 tokens per call, agent does 2 calls in cycle mode
    expect(result.trace.metrics.totalTokens).toBe(40);
  });

  it('includes latency in metrics', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    const agent = new ReActAgent({
      name: 'LatencyAgent',
      provider,
      tools: [],
    });

    const result = await agent.run('test');
    expect(result.trace.metrics.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
