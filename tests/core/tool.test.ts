import { describe, it, expect } from 'vitest';
import { Tool } from '../../src/core/tool.js';
import { z } from 'zod';

describe('Tool', () => {
  const calculatorTool = Tool.create({
    name: 'calculator',
    description: 'Evaluate a math expression',
    input: z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
    output: z.object({ result: z.number() }),
    execute: async ({ a, b, op }) => {
      const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
      return { result: ops[op] };
    },
  });

  it('creates a tool with correct properties', () => {
    expect(calculatorTool.name).toBe('calculator');
    expect(calculatorTool.description).toBe('Evaluate a math expression');
  });

  it('executes with valid input', async () => {
    const result = await calculatorTool.execute({ a: 10, b: 5, op: '+' });
    expect(result).toEqual({ result: 15 });
  });

  it('validates input and rejects invalid', async () => {
    await expect(
      calculatorTool.execute({ a: 'not a number', b: 5, op: '+' } as never),
    ).rejects.toThrow();
  });

  it('validates output schema', async () => {
    const badTool = Tool.create({
      name: 'bad',
      description: 'returns wrong type',
      input: z.object({}),
      output: z.object({ value: z.number() }),
      execute: async () => ({ value: 'not a number' }) as never,
    });

    await expect(badTool.execute({})).rejects.toThrow();
  });

  it('generates function schema for LLM', () => {
    const schema = calculatorTool.toFunctionSchema();
    expect(schema.name).toBe('calculator');
    expect(schema.description).toBe('Evaluate a math expression');
    expect(schema.parameters).toHaveProperty('type', 'object');
    expect(schema.parameters).toHaveProperty('properties');
  });

  it('handles optional fields in schema', () => {
    const tool = Tool.create({
      name: 'search',
      description: 'Search',
      input: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      output: z.object({ results: z.array(z.string()) }),
      execute: async () => ({ results: [] }),
    });

    const schema = tool.toFunctionSchema();
    const params = schema.parameters as { required?: string[] };
    expect(params.required).toContain('query');
    expect(params.required).not.toContain('limit');
  });
});
