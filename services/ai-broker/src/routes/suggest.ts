import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GraphSuggestInput, GraphSuggestOutput } from '../utils/schema.js';
import { suggestWithOpenAI } from '../providers/openai.js';
import { suggestWithAnthropic } from '../providers/anthropic.js';
import { suggestWithGemini } from '../providers/gemini.js';
import { suggestWithLocal } from '../providers/local.js';

const router: Router = Router();

router.post('/suggest', async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = GraphSuggestInput.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        issues: parsed.error.issues
      });
    }

    const input = parsed.data;

    // Determine provider order
    const providerOrder = input.provider === 'auto'
      ? ['openai', 'anthropic', 'gemini', 'local']
      : [input.provider];

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of providerOrder) {
      try {
        let output;

        switch (provider) {
          case 'openai':
            output = await suggestWithOpenAI(input);
            break;
          case 'anthropic':
            output = await suggestWithAnthropic(input);
            break;
          case 'gemini':
            output = await suggestWithGemini(input);
            break;
          case 'local':
          default:
            output = await suggestWithLocal(input);
            break;
        }

        // Validate output
        const validated = GraphSuggestOutput.parse(output);
        return res.json(validated);

      } catch (providerError) {
        lastError = providerError as Error;
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    return res.status(502).json({
      error: 'All providers failed',
      detail: lastError ? lastError.message : 'Unknown error'
    });

  } catch (error) {
    // Unexpected error
    console.error('Unexpected error in /suggest:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;