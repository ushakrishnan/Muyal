import { z } from 'zod';

export const StaticConfig = z.object({
  text: z.string(),
  suggestions: z.array(z.string()).optional(),
});

export const HttpConfig = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST']).optional().default('GET'),
  secretEnvName: z.string().optional(),
  requestBodyTemplate: z.string().optional(),
  cacheTtlSeconds: z.number().optional(),
});

export const Provider = z.enum(['static', 'http', 'a2a', 'cosmos', 'vector', 'file', 'custom']);

export const KnowledgeDescriptor = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  priority: z.number().optional().default(50),
  enabled: z.boolean().optional().default(true),
  provider: Provider,
  static: StaticConfig.optional(),
  http: HttpConfig.optional(),
  metadata: z.record(z.any()).optional(),
  version: z.string().optional(),
});

export type KnowledgeDescriptorT = z.infer<typeof KnowledgeDescriptor>;
