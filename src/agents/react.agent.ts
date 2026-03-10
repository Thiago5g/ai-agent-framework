import { BaseAgent, type AgentConfig, type ExecutionTrace, type TraceStep } from '../core/agent.js';
import type { Message, ChatOptions } from '../core/provider.js';

/**
 * ReAct (Reasoning + Acting) agent.
 *
 * Implements the ReAct loop:
 *   1. Think — Reason about the current state
 *   2. Act — Select and execute a tool
 *   3. Observe — Process the tool output
 *   4. Repeat until the agent has an answer or hits max iterations
 *
 * Uses native LLM function calling when available, falling back to
 * text-based tool parsing for providers that don't support it.
 *
 * @see https://arxiv.org/abs/2210.03629
 */
export class ReActAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  protected async execute(messages: Message[], trace: ExecutionTrace): Promise<string> {
    const toolSchemas = Array.from(this.tools.values()).map((t) => t.toFunctionSchema());

    const chatOptions: ChatOptions = {
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      toolChoice: toolSchemas.length > 0 ? 'auto' : undefined,
    };

    let currentMessages = [...messages];

    for (let i = 0; i < this.maxIterations; i++) {
      trace.metrics.iterations = i + 1;

      // Call the LLM
      const response = await this.provider.chat(currentMessages, chatOptions);
      trace.metrics.totalTokens += response.usage.totalTokens;

      // If the model wants to use a tool
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Record thought
        if (response.content) {
          trace.steps.push(this.step('thought', response.content));
        }

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          trace.steps.push(
            this.step('action', `${toolCall.name}(${JSON.stringify(toolCall.arguments)})`, {
              toolCallId: toolCall.id,
            }),
          );

          const tool = this.tools.get(toolCall.name);

          if (!tool) {
            const errorMsg = `Tool "${toolCall.name}" not found. Available: ${Array.from(this.tools.keys()).join(', ')}`;
            trace.steps.push(this.step('error', errorMsg));
            currentMessages.push(
              { role: 'assistant', content: response.content || '' },
              { role: 'tool', content: errorMsg, tool_call_id: toolCall.id },
            );
            continue;
          }

          try {
            const result = await tool.execute(toolCall.arguments);
            const resultStr = JSON.stringify(result);

            trace.steps.push(this.step('observation', resultStr));
            trace.metrics.toolCalls++;

            currentMessages.push(
              { role: 'assistant', content: response.content || '' },
              { role: 'tool', content: resultStr, tool_call_id: toolCall.id },
            );
          } catch (error) {
            const errorMsg = `Tool error: ${(error as Error).message}`;
            trace.steps.push(this.step('error', errorMsg));
            currentMessages.push(
              { role: 'assistant', content: response.content || '' },
              { role: 'tool', content: errorMsg, tool_call_id: toolCall.id },
            );
          }
        }

        continue; // Next iteration with tool results
      }

      // No tool calls — the model is done
      trace.steps.push(this.step('answer', response.content));
      return response.content;
    }

    // Max iterations reached
    const fallback = 'I was unable to complete the task within the allowed iterations. Here is my best answer so far based on the information gathered.';
    trace.steps.push(this.step('error', 'Max iterations reached'));
    return fallback;
  }

  private step(type: TraceStep['type'], content: string, metadata?: Record<string, unknown>): TraceStep {
    return { type, content, timestamp: Date.now(), metadata };
  }
}
