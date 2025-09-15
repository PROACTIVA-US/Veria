import { GraphSuggestInputType, GraphSuggestOutputType } from '../utils/schema.js';

export async function suggestWithLocal(input: GraphSuggestInputType): Promise<GraphSuggestOutputType> {
  // Simple local fallback that generates a basic graph
  console.log('Using local provider for prompt:', input.prompt);

  return {
    nodes: [
      { type: 'Issuer', label: 'Demo Issuer', id: '1' },
      { type: 'Investor', label: 'Demo Investor', id: '2' },
      { type: 'Policy', label: 'KYC/AML', id: '3' }
    ],
    edges: [
      { srcId: '1', dstId: '2', kind: 'subscribes' },
      { srcId: '2', dstId: '3', kind: 'complies_with' }
    ],
    explanations: ['Local fallback produced a minimal valid graph based on the prompt.']
  };
}