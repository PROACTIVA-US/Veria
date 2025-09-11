import { Router } from 'express'; import { PrismaClient } from '@prisma/client'; import { NodeSchema } from '../utils/validate.js';
const prisma = new PrismaClient(); const r = Router();
r.get('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const items = await prisma.node.findMany({ where:{ orgId } }); res.json(items); });
r.post('/', async (req,res)=>{ const orgId = (req as any).orgId as string; const parse = NodeSchema.safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const node = await prisma.node.create({ data:{ ...parse.data, orgId } }); res.status(201).json(node); });
r.patch('/:id', async (req,res)=>{ const orgId = (req as any).orgId as string; const { id } = req.params; const parse = NodeSchema.partial().safeParse(req.body); if (!parse.success) return res.status(400).json(parse.error.format()); const node = await prisma.node.update({ where:{ id }, data:{ ...parse.data, orgId } }); res.json(node); });
r.delete('/:id', async (req,res)=>{ const { id } = req.params; await prisma.edge.deleteMany({ where:{ OR:[{ srcId:id }, { dstId:id }] } }); await prisma.node.delete({ where:{ id } }); res.status(204).send(); });
export default r;
