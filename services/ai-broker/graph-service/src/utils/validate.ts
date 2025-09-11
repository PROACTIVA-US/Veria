import { z } from 'zod';
export const NodeSchema = z.object({ id:z.string().optional(), type:z.string().min(1), label:z.string().min(1), status:z.string().optional(), priority:z.number().int().min(1).max(4).optional(), tags:z.array(z.string()).optional().default([]), props:z.any().optional() });
export const EdgeSchema = z.object({ id:z.string().optional(), srcId:z.string().min(1), dstId:z.string().min(1), kind:z.string().min(1), props:z.any().optional() });
export const MilestoneSchema = z.object({ id:z.string().optional(), title:z.string().min(1), ts:z.coerce.date(), status:z.string().min(1), props:z.any().optional() });
