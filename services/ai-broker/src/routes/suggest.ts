import { Router } from 'express';
import { GraphSuggestInput, GraphSuggestOutput } from '../utils/schema.js';
import { suggestWithOpenAI } from '../providers/openai.js';
import { suggestWithAnthropic } from '../providers/anthropic.js';
import { suggestWithGemini } from '../providers/gemini.js';
import { suggestWithLocal } from '../providers/local.js';
const r = Router();
r.post('/suggest', async (req,res) => {
  const parsed = GraphSuggestInput.safeParse(req.body); if (!parsed.success) return res.status(400).json(parsed.error.format());
  const input = parsed.data;
  const order = input.provider === 'auto' ? ['openai','anthropic','gemini','local'] : [input.provider];
  let lastError = null;
  for (const p of order) {
    try {
      let out; if (p==='openai') out = await suggestWithOpenAI(input);
      else if (p==='anthropic') out = await suggestWithAnthropic(input);
      else if (p==='gemini') out = await suggestWithGemini(input);
      else out = await suggestWithLocal(input);
      const validated = GraphSuggestOutput.parse(out);
      return res.json(validated);
    } catch (e){ 
      lastError = e; continue;
  }
  return res.status(502).json({ error:'All providers failed', detail:String(lastError) });
});
export default r;
