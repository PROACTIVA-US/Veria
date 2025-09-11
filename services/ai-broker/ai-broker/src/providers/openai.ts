import fetch from 'node-fetch'; import { GraphSuggestOutput } from '../utils/schema.js';
export async function suggestWithOpenAI(input:any){ const apiKey = process.env.OPENAI_API_KEY; if(!apiKey) throw new Error('OPENAI_API_KEY missing');
const sys="You produce STRICT JSON: nodes, edges, explanations."; const user=`Prompt: ${input.prompt}\nMode:${input.mode}\nNodes:${input.context.existingNodes.length}\nEdges:${input.context.existingEdges.length}`;
const r = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({ model:process.env.OPENAI_MODEL||'gpt-4o-mini', response_format:{type:'json_object'}, messages:[{role:'system',content:sys},{role:'user',content:user}] }) });
if(!r.ok) throw new Error(`OpenAI failed: ${r.status}`); const data = await r.json(); const raw = data.choices?.[0]?.message?.content || "{}"; return GraphSuggestOutput.parse(JSON.parse(raw)); }
