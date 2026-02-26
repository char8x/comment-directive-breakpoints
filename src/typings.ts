import * as valibot from 'valibot';

export const BreakpointTypeSchema = valibot.picklist([
  'enable',
  'disable',
  'hit',
  'log',
  'expr',
]);

export const BreakpointSuffixSchema = valibot.picklist([
  'enable',
  'disable',
  'hit',
  'log',
  'expr',
  'hit.disable',
  'log.disable',
  'expr.disable',
]);

export type BreakpointType = valibot.InferOutput<typeof BreakpointTypeSchema>;
export type BreakpointSuffix = valibot.InferOutput<typeof BreakpointSuffixSchema>;

export interface BreakpointMatchGroups {
  type?: BreakpointSuffix;
  expression?: string;
}
