export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  tools?: FunctionSchema[];
  toolChoice?: 'auto' | 'none' | { name: string };
}

export interface FunctionSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length';
}

export interface StreamChunk {
  content?: string;
  toolCall?: Partial<ToolCall>;
  done: boolean;
}

/**
 * Interface for LLM providers. Implement this to add support for any model.
 *
 * @example
 * ```ts
 * class MyProvider implements LLMProvider {
 *   async chat(messages, options) { ... }
 *   async *chatStream(messages, options) { ... }
 * }
 * ```
 */
export interface LLMProvider {
  readonly name: string;

  /** Send messages and get a complete response */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /** Send messages and stream the response token by token */
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk>;
}
