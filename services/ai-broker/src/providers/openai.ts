import fetch from 'node-fetch';
import { GraphSuggestInputType, GraphSuggestOutput, GraphSuggestOutputType } from '../utils/schema.js';

export async function suggestWithOpenAI(input: GraphSuggestInputType): Promise<GraphSuggestOutputType> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const systemPrompt = "You produce STRICT JSON with the following structure: {nodes: [], edges: [], explanations: []}";
  const userPrompt = `Prompt: ${input.prompt}\nMode: ${input.mode}\nExisting Nodes: ${input.context.existingNodes.length}\nExisting Edges: ${input.context.existingEdges.length}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed with status ${response.status}`);
  }

  const data = await response.json() as any;
  const rawContent = data.choices?.[0]?.message?.content || "{}";
  const parsedContent = JSON.parse(rawContent);

  return GraphSuggestOutput.parse(parsedContent);
}