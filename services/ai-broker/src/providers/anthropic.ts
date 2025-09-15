import fetch from 'node-fetch';
import { GraphSuggestInputType, GraphSuggestOutput, GraphSuggestOutputType } from '../utils/schema.js';

export async function suggestWithAnthropic(input: GraphSuggestInputType): Promise<GraphSuggestOutputType> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = `Return ONLY valid JSON with the following structure:
{
  "nodes": [{"type": "string", "label": "string", "id": "string"}],
  "edges": [{"srcId": "string", "dstId": "string", "kind": "string"}],
  "explanations": ["string"]
}

Generate graph data for: ${input.prompt}
Mode: ${input.mode}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API request failed with status ${response.status}`);
  }

  const data = await response.json() as any;
  const rawContent = data.content?.[0]?.text || "{}";
  const parsedContent = JSON.parse(rawContent);

  return GraphSuggestOutput.parse(parsedContent);
}