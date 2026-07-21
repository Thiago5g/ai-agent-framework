import { describe, it, expect } from 'vitest';
import { BufferMemory } from '../../src/memory/buffer.memory.js';

describe('BufferMemory', () => {
  it('starts empty', async () => {
    const memory = new BufferMemory();
    const messages = await memory.load();
    expect(messages).toHaveLength(0);
    expect(memory.size).toBe(0);
  });

  it('saves and loads messages', async () => {
    const memory = new BufferMemory();
    await memory.save({ role: 'user', content: 'Hello' });
    await memory.save({ role: 'assistant', content: 'Hi!' });

    const messages = await memory.load();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi!' });
  });

  it('respects maxMessages limit', async () => {
    const memory = new BufferMemory({ maxMessages: 3 });

    await memory.save({ role: 'user', content: 'msg1' });
    await memory.save({ role: 'assistant', content: 'msg2' });
    await memory.save({ role: 'user', content: 'msg3' });
    await memory.save({ role: 'assistant', content: 'msg4' });

    const messages = await memory.load();
    expect(messages).toHaveLength(3);
    // Oldest message (msg1) should be dropped
    expect(messages[0].content).toBe('msg2');
    expect(messages[2].content).toBe('msg4');
  });

  it('clears all messages', async () => {
    const memory = new BufferMemory();
    await memory.save({ role: 'user', content: 'Hello' });
    await memory.clear();

    expect(await memory.load()).toHaveLength(0);
    expect(memory.size).toBe(0);
  });

  it('returns a copy of messages (not reference)', async () => {
    const memory = new BufferMemory();
    await memory.save({ role: 'user', content: 'Hello' });

    const messages = await memory.load();
    messages.push({ role: 'user', content: 'injected' });

    // Original should not be affected
    const fresh = await memory.load();
    expect(fresh).toHaveLength(1);
  });

  it('defaults to maxMessages of 50', async () => {
    const memory = new BufferMemory();
    for (let i = 0; i < 60; i++) {
      await memory.save({ role: 'user', content: `msg${i}` });
    }
    expect(memory.size).toBe(50);
  });
});
