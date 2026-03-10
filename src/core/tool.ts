import { z, type ZodType } from 'zod';

export interface ToolConfig<TInput extends ZodType, TOutput extends ZodType> {
  name: string;
  description: string;
  input: TInput;
  output: TOutput;
  execute: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  execute(input: TInput): Promise<TOutput>;

  /** JSON Schema representation for LLM function calling */
  toFunctionSchema(): {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Type-safe tool builder.
 *
 * @example
 * ```ts
 * const calculator = Tool.create({
 *   name: 'calculator',
 *   description: 'Evaluate a math expression',
 *   input: z.object({ expression: z.string() }),
 *   output: z.object({ result: z.number() }),
 *   execute: async ({ expression }) => {
 *     return { result: eval(expression) };
 *   },
 * });
 * ```
 */
export const Tool = {
  create<TInput extends ZodType, TOutput extends ZodType>(
    config: ToolConfig<TInput, TOutput>,
  ): Tool<z.infer<TInput>, z.infer<TOutput>> {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.input,
      outputSchema: config.output,

      async execute(input: z.infer<TInput>): Promise<z.infer<TOutput>> {
        // Validate input
        const validatedInput = config.input.parse(input);

        // Execute the tool
        const rawOutput = await config.execute(validatedInput);

        // Validate output
        return config.output.parse(rawOutput);
      },

      toFunctionSchema() {
        return {
          name: config.name,
          description: config.description,
          parameters: zodToJsonSchema(config.input),
        };
      },
    };
  },
};

/**
 * Convert a Zod schema to a JSON Schema (simplified).
 * For production, use the `zod-to-json-schema` package.
 */
function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  // Simplified — in production, use `zod-to-json-schema`
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as ZodType;
      properties[key] = zodToJsonSchema(zodValue);

      if (!(zodValue instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema((schema as z.ZodArray<ZodType>)._def.type) };
  }

  return { type: 'string' }; // Fallback
}
