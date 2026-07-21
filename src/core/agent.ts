import type { LLMProvider, Message, ChatResponse } from './provider.js';
import type { Tool } from './tool.js';
import type { Memory } from '../memory/types.js';

export interface AgentConfig {
  name: string;
  provider: LLMProvider;
  tools?: Tool[];
  memory?: Memory;
  systemPrompt?: string;
  maxIterations?: number;
  middleware?: Middleware[];
}

export interface AgentResult {
  output: string;
  trace: ExecutionTrace;
}

export interface ExecutionTrace {
  agentName: string;
  steps: TraceStep[];
  metrics: {
    totalTokens: number;
    latencyMs: number;
    toolCalls: number;
    iterations: number;
  };
}

export interface TraceStep {
  type: 'thought' | 'action' | 'observation' | 'answer' | 'plan' | 'error';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Middleware {
  name: string;
  before?(context: MiddlewareContext): Promise<void>;
  after?(context: MiddlewareContext): Promise<void>;
  onError?(context: MiddlewareContext, error: Error): Promise<void>;
}

export interface MiddlewareContext {
  agent: BaseAgent;
  messages: Message[];
  response?: ChatResponse;
  trace: ExecutionTrace;
}

/**
 * Base class for all agents. Provides the lifecycle management, middleware
 * execution, and trace recording.
 *
 * Subclasses must implement the `execute` method with their specific
 * reasoning pattern (ReAct, Plan-Execute, etc.).
 */
export abstract class BaseAgent {
  readonly name: string;
  protected provider: LLMProvider;
  protected tools: Map<string, Tool>;
  protected memory?: Memory;
  protected systemPrompt: string;
  protected maxIterations: number;
  protected middleware: Middleware[];

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.provider = config.provider;
    this.tools = new Map((config.tools ?? []).map((t) => [t.name, t]));
    this.memory = config.memory;
    this.systemPrompt = config.systemPrompt ?? 'You are a helpful AI assistant.';
    this.maxIterations = config.maxIterations ?? 10;
    this.middleware = config.middleware ?? [];
  }

  /**
   * Run the agent with the given user input.
   */
  async run(input: string): Promise<AgentResult> {
    const startTime = Date.now();
    const trace: ExecutionTrace = {
      agentName: this.name,
      steps: [],
      metrics: { totalTokens: 0, latencyMs: 0, toolCalls: 0, iterations: 0 },
    };

    try {
      // Load memory context
      const memoryMessages = this.memory ? await this.memory.load() : [];

      const messages: Message[] = [
        { role: 'system', content: this.buildSystemPrompt() },
        ...memoryMessages,
        { role: 'user', content: input },
      ];

      // Execute middleware: before
      const ctx: MiddlewareContext = { agent: this, messages, trace };
      for (const mw of this.middleware) {
        await mw.before?.(ctx);
      }

      // Run agent-specific logic
      const output = await this.execute(messages, trace);

      // Save to memory
      if (this.memory) {
        await this.memory.save({ role: 'user', content: input });
        await this.memory.save({ role: 'assistant', content: output });
      }

      trace.metrics.latencyMs = Date.now() - startTime;

      // Execute middleware: after
      for (const mw of this.middleware) {
        await mw.after?.(ctx);
      }

      return { output, trace };
    } catch (error) {
      // Execute middleware: onError
      const ctx: MiddlewareContext = { agent: this, messages: [], trace };
      for (const mw of this.middleware) {
        await mw.onError?.(ctx, error as Error);
      }
      throw error;
    }
  }

  /**
   * Build the system prompt including tool descriptions.
   */
  protected buildSystemPrompt(): string {
    if (this.tools.size === 0) return this.systemPrompt;

    const toolDescriptions = Array.from(this.tools.values())
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `${this.systemPrompt}\n\nAvailable tools:\n${toolDescriptions}`;
  }

  /**
   * Agent-specific execution logic. Must be implemented by subclasses.
   */
  protected abstract execute(messages: Message[], trace: ExecutionTrace): Promise<string>;
}
