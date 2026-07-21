import type {
  LLMProvider,
  Message,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  ToolCall,
} from '../core/provider.js';

export interface FakeResponse {
  /** Match user message content (string exact or regex) */
  match?: string | RegExp;
  /** Response to return */
  content?: string;
  /** Tool calls to simulate */
  toolCalls?: ToolCall[];
}

export interface FakeProviderConfig {
  /**
   * Pre-programmed responses. Checked in order; first match wins.
   * If no match, uses defaultBehavior.
   */
  responses?: FakeResponse[];

  /**
   * Default behavior when no response matches:
   * - 'echo': Returns a summary of the last user message
   * - 'tool': Makes a tool call to the first available tool with sample args
   * - 'cycle': First call uses tool, second call answers (simulates ReAct loop)
   */
  defaultBehavior?: 'echo' | 'tool' | 'cycle';
}

/**
 * Deterministic LLM provider for testing.
 *
 * Simulates LLM responses without making API calls. Supports pre-programmed
 * responses and automatic tool-calling behavior for testing ReAct agents.
 *
 * @example
 * ```ts
 * const provider = new FakeProvider({
 *   defaultBehavior: 'cycle', // first call → tool, second → answer
 * });
 *
 * const agent = new ReActAgent({
 *   provider,
 *   tools: [myTool],
 * });
 * ```
 */
export class FakeProvider implements LLMProvider {
  readonly name = 'fake';
  private responses: FakeResponse[];
  private defaultBehavior: 'echo' | 'tool' | 'cycle';
  private callCount = 0;

  /** Track all messages sent to this provider (useful for assertions) */
  readonly history: Message[][] = [];

  constructor(config: FakeProviderConfig = {}) {
    this.responses = config.responses ?? [];
    this.defaultBehavior = config.defaultBehavior ?? 'cycle';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    this.callCount++;
    this.history.push([...messages]);

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const lastToolMsg = [...messages].reverse().find((m) => m.role === 'tool');

    // Check pre-programmed responses
    for (const resp of this.responses) {
      if (!resp.match) continue;
      const text = lastUserMsg?.content ?? '';
      const matches =
        typeof resp.match === 'string'
          ? text.includes(resp.match)
          : resp.match.test(text);

      if (matches) {
        return this.buildResponse(resp.content ?? '', resp.toolCalls);
      }
    }

    // Default behavior
    const tools = options?.tools ?? [];

    switch (this.defaultBehavior) {
      case 'echo':
        return this.buildResponse(
          `Response to: ${lastUserMsg?.content ?? 'unknown'}`,
        );

      case 'tool':
        if (tools.length > 0) {
          return this.buildResponse('', [this.buildToolCall(tools[0])]);
        }
        return this.buildResponse(`No tools available. Input: ${lastUserMsg?.content}`);

      case 'cycle':
        // If we just received a tool result, generate final answer
        if (lastToolMsg) {
          return this.buildResponse(
            `Based on the tool result: ${lastToolMsg.content}`,
          );
        }
        // Otherwise, call the first tool
        if (tools.length > 0) {
          return this.buildResponse('', [this.buildToolCall(tools[0])]);
        }
        return this.buildResponse(`Answer: ${lastUserMsg?.content}`);
    }
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const response = await this.chat(messages, options);
    if (response.content) {
      for (const char of response.content) {
        yield { content: char, done: false };
      }
    }
    yield { done: true };
  }

  /** Reset call count and history */
  reset(): void {
    this.callCount = 0;
    this.history.length = 0;
  }

  /** Number of times chat() was called */
  get calls(): number {
    return this.callCount;
  }

  private buildToolCall(tool: { name: string; parameters: Record<string, unknown> }): ToolCall {
    // Generate sample arguments from the tool's parameter schema
    const args: Record<string, unknown> = {};
    const props = (tool.parameters as { properties?: Record<string, { type?: string }> }).properties;
    if (props) {
      for (const [key, schema] of Object.entries(props)) {
        if (schema.type === 'string') args[key] = `test_${key}`;
        else if (schema.type === 'number') args[key] = 42;
        else if (schema.type === 'boolean') args[key] = true;
        else args[key] = `test_${key}`;
      }
    }

    return {
      id: `call_fake_${this.callCount}`,
      name: tool.name,
      arguments: args,
    };
  }

  private buildResponse(content: string, toolCalls?: ToolCall[]): ChatResponse {
    return {
      content,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: toolCalls && toolCalls.length > 0 ? 'tool_calls' : 'stop',
    };
  }
}
