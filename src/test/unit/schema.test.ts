import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({
  MarkdownString: class MarkdownString {
    value: string;
    constructor(value?: string) {
      this.value = value ?? '';
    }
  },
}));

import { supportedSchemas, Language } from '../../lib/schema.js';
import { calculateCompletions } from '../../lib/completion.js';
import type { ISchema } from '../../lib/schema.js';

describe('supportedSchemas coverage', () => {
  const allSelectors = supportedSchemas.flatMap(
    (s) => s.selector as string[]
  );

  it('includes all isSupportedLanguageId languages', () => {
    const expected = [
      Language.js,
      Language.jsx,
      Language.ts,
      Language.tsx,
      Language.golang,
      Language.ruby,
      Language.java,
      Language.rust,
      Language.python,
      Language.vue,
    ];
    for (const lang of expected) {
      expect(allSelectors).toContain(lang);
    }
  });

  it('slash-style group has // prefixed labels', () => {
    const slashGroup = supportedSchemas.find((s) =>
      (s.selector as string[]).includes(Language.js)
    );
    expect(slashGroup).toBeDefined();
    const labels = slashGroup!.schemas.map((s) => s.label);
    expect(labels).toContain('// @bp');
    expect(labels).toContain('// @bp.log');
    expect(labels).toContain('// @bp.hit');
    expect(labels).toContain('// @bp.expr');
  });

  it('hash-style group has # prefixed labels', () => {
    const hashGroup = supportedSchemas.find((s) =>
      (s.selector as string[]).includes(Language.python)
    );
    expect(hashGroup).toBeDefined();
    const labels = hashGroup!.schemas.map((s) => s.label);
    expect(labels).toContain('# @bp');
    expect(labels).toContain('# @bp.log');
    expect(labels).toContain('# @bp.hit');
    expect(labels).toContain('# @bp.expr');
    // Should NOT contain slash-style
    expect(labels).not.toContain('// @bp');
  });

  it('slash-style group contains go, java, rust', () => {
    const slashGroup = supportedSchemas.find((s) =>
      (s.selector as string[]).includes(Language.js)
    );
    expect(slashGroup).toBeDefined();
    const selector = slashGroup!.selector as string[];
    expect(selector).toContain(Language.golang);
    expect(selector).toContain(Language.java);
    expect(selector).toContain(Language.rust);
  });

  it('hash-style group contains python, ruby', () => {
    const hashGroup = supportedSchemas.find((s) =>
      (s.selector as string[]).includes(Language.python)
    );
    expect(hashGroup).toBeDefined();
    const selector = hashGroup!.selector as string[];
    expect(selector).toContain(Language.python);
    expect(selector).toContain(Language.ruby);
  });
});

describe('Hash-style completion logic', () => {
  const hashGroup = supportedSchemas.find((s) =>
    (s.selector as string[]).includes(Language.python)
  );
  const schemas: ISchema[] = hashGroup!.schemas;

  function getLabels(line: string, pos: number): string[] {
    return calculateCompletions(line, pos, schemas).map(
      (c) => c.schema.label
    );
  }

  describe('Prefix Variation', () => {
    it('`# ` suggests # @bp variants', () => {
      const labels = getLabels('# ', 2);
      expect(labels).toContain('# @bp');
      expect(labels).toContain('# @bp.log');
    });

    it('`# @` suggests bp, bp.hit, bp.log, bp.expr', () => {
      const labels = getLabels('# @', 3);
      expect(labels).toContain('# @bp');
      expect(labels).toContain('# @bp.hit');
      expect(labels).toContain('# @bp.log');
      expect(labels).toContain('# @bp.expr');
    });

    it('`# @b` suggests p, p.hit, p.log, p.expr', () => {
      const labels = getLabels('# @b', 4);
      expect(labels).toContain('# @bp');
      expect(labels).toContain('# @bp.hit');
      expect(labels).toContain('# @bp.log');
      expect(labels).toContain('# @bp.expr');
    });

    it('`# @bp` suggests .hit, .log, .expr and empty', () => {
      const labels = getLabels('# @bp', 5);
      expect(labels).toContain('# @bp');
      expect(labels).toContain('# @bp.hit');
      expect(labels).toContain('# @bp.log');
      expect(labels).toContain('# @bp.expr');
    });

    it('`# @bp.` suggests hit, log, expr, disable', () => {
      const labels = getLabels('# @bp.', 6);
      expect(labels).toContain('# @bp.hit');
      expect(labels).toContain('# @bp.log');
      expect(labels).toContain('# @bp.expr');
      expect(labels).toContain('# @bp.disable');
    });

    it('`# @bp.hit.` suggests disable', () => {
      const labels = getLabels('# @bp.hit.', 10);
      expect(labels).toContain('# @bp.hit.disable');
    });

    it('`# @bp.log.` suggests disable', () => {
      const labels = getLabels('# @bp.log.', 10);
      expect(labels).toContain('# @bp.log.disable');
    });

    it('`# @bp.expr.` suggests disable', () => {
      const labels = getLabels('# @bp.expr.', 11);
      expect(labels).toContain('# @bp.expr.disable');
    });
  });

  describe('Trigger Position Context', () => {
    it('indented line `  # ` has completions', () => {
      const labels = getLabels('  # ', 4);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('after code `x = 1  # @bp.` has completions', () => {
      const labels = getLabels('x = 1  # @bp.', 13);
      expect(labels).toContain('# @bp.hit');
    });

    it('plain text without comment has no completions', () => {
      const labels = getLabels('hello world', 11);
      expect(labels.length).toBe(0);
    });

    it('empty line has no completions', () => {
      const labels = getLabels('', 0);
      expect(labels.length).toBe(0);
    });
  });

  describe('Schema Text Verification', () => {
    it('`# @` bp candidate has correct text', () => {
      const results = calculateCompletions('# @', 3, schemas);
      const candidate = results.find((c) => c.schema.label === '# @bp');
      expect(candidate).toBeDefined();
      expect(candidate!.schema.text).toBe('# @bp');
    });

    it('`# @bp.` hit candidate has correct text', () => {
      const results = calculateCompletions('# @bp.', 6, schemas);
      const candidate = results.find((c) => c.schema.label === '# @bp.hit');
      expect(candidate).toBeDefined();
      expect(candidate!.schema.text).toBe('# @bp.hit ${condition}');
    });
  });
});
