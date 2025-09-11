import { Router } from 'express'; import { PrismaClient } from '@prisma/client'; import { MilestoneSchema } from '../utils/validate.js';
const prisma = new PrismaClient(); const r = Router();
r.get('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const items = await prisma.milestone.findMany({ where:{ orgId }, orderBy:{ ts:'asc' } }); res.json(items); });
r.post('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const parse = MilestoneSchema.safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const item = await prisma.milestone.create({ data:{ ...parse.data, orgId } }); res.status(201).json(item); });
r.patch('/:id', async (req,res)=>{ const orgId = (req as any).orgId as string; const { id } = req.params; const parse = MilestoneSchema.partial().safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const item = await prisma.milestone.update({ where:{ id }, data:{ ...parse.data, orgId } }); res.json(item); });
r.delete('/:id', async (req,res)=>{ const { id } = req.params; await prisma.milestone.delete({ where:{ id } }); res.status(204).send(); });
export default r;
