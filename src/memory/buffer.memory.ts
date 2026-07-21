import type { Message } from '../core/provider.js';
import type { Memory } from './types.js';

export interface BufferMemoryConfig {
  /** Maximum number of messages to retain. Oldest are dropped first. */
  maxMessages?: number;
}

/**
 * Simple buffer memory that stores the last N messages.
 *
 * When the buffer exceeds maxMessages, the oldest messages are removed.
 * This provides a sliding window of conversation context.
 *
 * @example
 * ```ts
 * const memory = new BufferMemory({ maxMessages: 20 });
 * await memory.save({ role: 'user', content: 'Hello' });
 * const messages = await memory.load(); // [{ role: 'user', content: 'Hello' }]
 * ```
 */
export class BufferMemory implements Memory {
  private messages: Message[] = [];
  private maxMessages: number;

  constructor(config: BufferMemoryConfig = {}) {
    this.maxMessages = config.maxMessages ?? 50;
  }

  async load(): Promise<Message[]> {
    return [...this.messages];
  }

  async save(message: Message): Promise<void> {
    this.messages.push(message);

    // Trim from the front if over limit
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  async clear(): Promise<void> {
    this.messages = [];
  }

  /** Current message count (useful for testing) */
  get size(): number {
    return this.messages.length;
  }
}

// Re-export Memory interface
export type { Memory } from './types.js';
