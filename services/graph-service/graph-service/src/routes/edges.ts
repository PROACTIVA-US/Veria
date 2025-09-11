import { Router } from 'express'; import { PrismaClient } from '@prisma/client'; import { EdgeSchema } from '../utils/validate.js';
const prisma = new PrismaClient(); const r = Router();
r.get('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const items = await prisma.edge.findMany({ where:{ orgId } }); res.json(items); });
r.post('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const parse = EdgeSchema.safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const edge = await prisma.edge.create({ data:{ ...parse.data, orgId } }); res.status(201).json(edge); });
r.patch('/:id', async (req,res)=>{ const orgId = (req as any).orgId as string; const { id } = req.params; const parse = EdgeSchema.partial().safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const edge = await prisma.edge.update({ where:{ id }, data:{ ...parse.data, orgId } }); res.json(edge); });
r.delete('/:id', async (req,res)=>{ const { id } = req.params; await prisma.edge.delete({ where:{ id } }); res.status(204).send(); });
export default r;
