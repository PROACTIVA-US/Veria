import { z } from 'zod';

export const GraphSuggestInput = z.object({
  prompt: z.string().min(1),
  context: z.object({
    existingNodes: z.array(z.any()).default([]),
    existingEdges: z.array(z.any()).default([])
  }).default({
    existingNodes: [],
    existingEdges: []
  }),
  provider: z.enum(['auto', 'openai', 'anthropic', 'gemini', 'local']).default('auto'),
  mode: z.enum(['structure', 'insight']).default('structure')
});

export const GraphSuggestOutput = z.object({
  nodes: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    label: z.string(),
    status: z.string().optional(),
    priority: z.number().optional(),
    tags: z.array(z.string()).optional(),
    props: z.any().optional()
  })).default([]),
  edges: z.array(z.object({
    id: z.string().optional(),
    srcId: z.string(),
    dstId: z.string(),
    kind: z.string(),
    props: z.any().optional()
  })).default([]),
  explanations: z.array(z.string()).default([])
});

export type GraphSuggestInputType = z.infer<typeof GraphSuggestInput>;
export type GraphSuggestOutputType = z.infer<typeof GraphSuggestOutput>;