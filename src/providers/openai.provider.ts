import OpenAI from 'openai';
import type {
  LLMProvider,
  Message,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  ToolCall,
} from '../core/provider.js';

export interface OpenAIProviderConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string;
  /** Model to use. Defaults to 'gpt-4o-mini'. */
  model?: string;
  /** Base URL for API (useful for proxies/compatible APIs). */
  baseUrl?: string;
}

/**
 * OpenAI LLM provider.
 *
 * Supports chat completions with function calling (tool use).
 * Works with any OpenAI-compatible API (e.g., Azure OpenAI, local proxies).
 *
 * @example
 * ```ts
 * const provider = new OpenAIProvider({
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 * ```
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl,
    });
    this.model = config.model ?? 'gpt-4o-mini';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const openaiMessages = messages.map((m) => this.toOpenAIMessage(m));

    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stop: options?.stop,
    };

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      params.tools = options.tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }));

      if (options.toolChoice) {
        if (options.toolChoice === 'auto' || options.toolChoice === 'none') {
          params.tool_choice = options.toolChoice;
        } else {
          params.tool_choice = {
            type: 'function',
            function: { name: options.toolChoice.name },
          };
        }
      }
    }

    const completion = await this.client.chat.completions.create(params);
    const choice = completion.choices[0];

    // Extract tool calls
    const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.message.content ?? '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const openaiMessages = messages.map((m) => this.toOpenAIMessage(m));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield { content: delta.content, done: false };
      }
    }

    yield { done: true };
  }

  private toOpenAIMessage(msg: Message): OpenAI.Chat.ChatCompletionMessageParam {
    switch (msg.role) {
      case 'system':
        return { role: 'system', content: msg.content };
      case 'user':
        return { role: 'user', content: msg.content };
      case 'assistant':
        return { role: 'assistant', content: msg.content };
      case 'tool':
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.tool_call_id ?? '',
        };
      default:
        return { role: 'user', content: msg.content };
    }
  }
}
