/**
 * Boolean query parser with C-like operator precedence:
 * NOT > AND > OR
 *
 * Supports:
 * - AND, OR, NOT operators (unlimited chaining)
 * - Phrase queries: "exact phrase"
 * - Grouping: (...)
 *
 * Applies across fields: forensic_analyst_name, organization_name,
 * malware_name, malware_description, pdf_content
 */

const SEARCH_FIELDS = [
  'forensic_analyst_name',
  'organization_name',
  'malware_name',
  'malware_description',
  'pdf_content',
];

type Token =
  | { type: 'TERM'; value: string }
  | { type: 'PHRASE'; value: string }
  | { type: 'AND' }
  | { type: 'OR' }
  | { type: 'NOT' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }

    if (input[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (input[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

    if (input[i] === '"') {
      let phrase = '';
      i++;
      while (i < input.length && input[i] !== '"') { phrase += input[i++]; }
      i++; // closing "
      tokens.push({ type: 'PHRASE', value: phrase });
      continue;
    }

    // Collect word
    let word = '';
    while (i < input.length && !/[\s()"]/.test(input[i])) { word += input[i++]; }

    const upper = word.toUpperCase();
    if (upper === 'AND') { tokens.push({ type: 'AND' }); continue; }
    if (upper === 'OR') { tokens.push({ type: 'OR' }); continue; }
    if (upper === 'NOT') { tokens.push({ type: 'NOT' }); continue; }

    tokens.push({ type: 'TERM', value: word });
  }

  return tokens;
}

// Recursive descent parser
// Grammar:
//   expr   = or_expr
//   or_expr  = and_expr (OR and_expr)*
//   and_expr = not_expr (AND not_expr)*
//   not_expr = NOT not_expr | atom
//   atom     = LPAREN expr RPAREN | PHRASE | TERM

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parse(): object {
    const node = this.parseOr();
    return node;
  }

  private parseOr(): object {
    let left = this.parseAnd();
    while (this.peek()?.type === 'OR') {
      this.consume();
      const right = this.parseAnd();
      left = { bool: { should: [left, right], minimum_should_match: 1 } };
    }
    return left;
  }

  private parseAnd(): object {
    let left = this.parseNot();
    while (this.peek()?.type === 'AND') {
      this.consume();
      const right = this.parseNot();
      left = { bool: { must: [left, right] } };
    }
    return left;
  }

  private parseNot(): object {
    if (this.peek()?.type === 'NOT') {
      this.consume();
      const operand = this.parseNot();
      return { bool: { must_not: [operand] } };
    }
    return this.parseAtom();
  }

  private parseAtom(): object {
    const token = this.peek();

    if (token?.type === 'LPAREN') {
      this.consume();
      const node = this.parseOr();
      this.consume(); // RPAREN
      return node;
    }

    if (token?.type === 'PHRASE') {
      this.consume();
      return {
        multi_match: {
          query: (token as { type: 'PHRASE'; value: string }).value,
          fields: SEARCH_FIELDS,
          type: 'phrase',
          analyzer: 'serbian_custom',
        },
      };
    }

    if (token?.type === 'TERM') {
      this.consume();
      return {
        multi_match: {
          query: (token as { type: 'TERM'; value: string }).value,
          fields: SEARCH_FIELDS,
          analyzer: 'serbian_custom',
        },
      };
    }

    // Fallback: match nothing
    return { match_none: {} };
  }
}

export function parseBooleanQuery(input: string): object {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}
