import { describe, it, expect } from 'vitest';
import { FakeProvider } from '../../src/providers/fake.provider.js';

describe('FakeProvider', () => {
  it('has name "fake"', () => {
    const provider = new FakeProvider();
    expect(provider.name).toBe('fake');
  });

  it('echoes user message in echo mode', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    const result = await provider.chat([
      { role: 'user', content: 'Hello world' },
    ]);
    expect(result.content).toContain('Hello world');
    expect(result.finishReason).toBe('stop');
  });

  it('makes a tool call in tool mode', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'tool' });
    const result = await provider.chat(
      [{ role: 'user', content: 'test' }],
      {
        tools: [{
          name: 'get_weather',
          description: 'Get weather',
          parameters: { type: 'object', properties: { city: { type: 'string' } } },
        }],
      },
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].name).toBe('get_weather');
    expect(result.finishReason).toBe('tool_calls');
  });

  it('cycles between tool call and answer in cycle mode', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'cycle' });
    const tools = [{
      name: 'search',
      description: 'Search',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    }];

    // First call → tool call
    const first = await provider.chat(
      [{ role: 'user', content: 'test' }],
      { tools },
    );
    expect(first.toolCalls).toHaveLength(1);

    // Second call (with tool result) → text answer
    const second = await provider.chat(
      [
        { role: 'user', content: 'test' },
        { role: 'assistant', content: '' },
        { role: 'tool', content: '{"result": 42}', tool_call_id: 'call_1' },
      ],
      { tools },
    );
    expect(second.toolCalls).toBeUndefined();
    expect(second.content).toContain('tool result');
  });

  it('matches pre-programmed responses', async () => {
    const provider = new FakeProvider({
      responses: [
        { match: 'weather', content: 'It is sunny today!' },
        { match: /hello/i, content: 'Hi there!' },
      ],
    });

    const r1 = await provider.chat([{ role: 'user', content: 'What is the weather?' }]);
    expect(r1.content).toBe('It is sunny today!');

    const r2 = await provider.chat([{ role: 'user', content: 'Hello!' }]);
    expect(r2.content).toBe('Hi there!');
  });

  it('tracks call history', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    await provider.chat([{ role: 'user', content: 'first' }]);
    await provider.chat([{ role: 'user', content: 'second' }]);

    expect(provider.calls).toBe(2);
    expect(provider.history).toHaveLength(2);
  });

  it('resets state', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    await provider.chat([{ role: 'user', content: 'test' }]);
    provider.reset();

    expect(provider.calls).toBe(0);
    expect(provider.history).toHaveLength(0);
  });

  it('returns usage metrics', async () => {
    const provider = new FakeProvider({ defaultBehavior: 'echo' });
    const result = await provider.chat([{ role: 'user', content: 'test' }]);

    expect(result.usage.totalTokens).toBeGreaterThan(0);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
  });
});
