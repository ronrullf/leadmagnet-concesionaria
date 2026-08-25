import {
  blockSchemas,
  emptyOutreachCopy,
  type BlockKey,
  type OutreachCopy,
} from './outreach-schema';
import { generateJSON } from './openrouter';
import {
  PRODUCT_SYSTEM_PROMPT,
  productSharedContext,
  productUserPrompt,
  type ProductInputPrompt,
} from './product-prompts';
import { resolveProductPack } from './product-packs';
import type { z } from 'zod';

export interface ProductGenerationResult {
  copy: OutreachCopy;
  attempts: Record<string, number>;
}

export async function generateProductBlockOnly(
  block: BlockKey,
  input: ProductInputPrompt,
  previous: Record<string, unknown>
) {
  const pack = resolveProductPack(input.niche_key || input.niche_label || 'generico');
  const context = productSharedContext(input, pack);
  const user = productUserPrompt(block, context, previous, pack);
  const schema = blockSchemas[block] as unknown as z.ZodType<object>;

  return generateJSON(
    {
      system: PRODUCT_SYSTEM_PROMPT,
      user,
      temperature: 0.6,
      maxTokens: 2000,
    },
    schema
  );
}
