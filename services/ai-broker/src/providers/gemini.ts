import fetch from 'node-fetch';
import { GraphSuggestInputType, GraphSuggestOutput, GraphSuggestOutputType } from '../utils/schema.js';

export async function suggestWithGemini(input: GraphSuggestInputType): Promise<GraphSuggestOutputType> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

  const prompt = `Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "nodes": [{"type": "string", "label": "string", "id": "string"}],
  "edges": [{"srcId": "string", "dstId": "string", "kind": "string"}],
  "explanations": ["string"]
}

Generate graph data for: ${input.prompt}
Mode: ${input.mode}`;

  const body = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed with status ${response.status}`);
  }

  const data = await response.json() as any;
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  // Remove potential markdown code blocks
  const trimmedContent = rawContent.trim().replace(/^```json\n?|\n?```$/g, '');
  const parsedContent = JSON.parse(trimmedContent || "{}");

  return GraphSuggestOutput.parse(parsedContent);
}