import type { Message } from '../core/provider.js';

/**
 * Memory interface for persisting conversation context across agent runs.
 */
export interface Memory {
  /** Load stored messages from memory */
  load(): Promise<Message[]>;

  /** Save a message to memory */
  save(message: Message): Promise<void>;

  /** Clear all stored messages */
  clear(): Promise<void>;
}
