type TokenKind = 'num' | 'op' | 'fn' | 'const' | 'lparen' | 'rparen' | 'postfix';

interface Token {
  kind: TokenKind;
  value: string;
}

interface OpDef {
  prec: number;
  rightAssoc: boolean;
  fn: (a: number, b: number) => number;
}

export const BINARY_OPS: Record<string, OpDef> = {
  '+': { prec: 1, rightAssoc: false, fn: (a, b) => a + b },
  '-': { prec: 1, rightAssoc: false, fn: (a, b) => a - b },
  '*': { prec: 2, rightAssoc: false, fn: (a, b) => a * b },
  '/': { prec: 2, rightAssoc: false, fn: (a, b) => {
    if (b === 0) throw new Error('Деление на ноль');
    return a / b;
  }},
  '%': { prec: 2, rightAssoc: false, fn: (a, b) => a % b },
  '^': { prec: 3, rightAssoc: true,  fn: (a, b) => Math.pow(a, b) },
};

type MathFn = (x: number, deg: boolean) => number;

export const MATH_FUNCTIONS: Record<string, MathFn> = {
  sin:  (x, d) => Math.sin(d ? x * Math.PI / 180 : x),
  cos:  (x, d) => Math.cos(d ? x * Math.PI / 180 : x),
  tan:  (x, d) => {
    const r = d ? x * Math.PI / 180 : x;
    if (Math.abs(Math.cos(r)) < 1e-10) throw new Error('tan не определён здесь');
    return Math.tan(r);
  },
  asin: (x, d) => {
    if (x < -1 || x > 1) throw new Error('asin: |x| ≤ 1');
    const r = Math.asin(x);
    return d ? r * 180 / Math.PI : r;
  },
  acos: (x, d) => {
    if (x < -1 || x > 1) throw new Error('acos: |x| ≤ 1');
    const r = Math.acos(x);
    return d ? r * 180 / Math.PI : r;
  },
  atan: (x, d) => { const r = Math.atan(x); return d ? r * 180 / Math.PI : r; },
  log:  (x, _) => { if (x <= 0) throw new Error('log: x > 0'); return Math.log10(x); },
  ln:   (x, _) => { if (x <= 0) throw new Error('ln: x > 0');  return Math.log(x); },
  sqrt: (x, _) => { if (x < 0)  throw new Error('√: x ≥ 0');   return Math.sqrt(x); },
  cbrt: (x, _) => Math.cbrt(x),
  abs:  (x, _) => Math.abs(x),
  exp:  (x, _) => Math.exp(x),
};

export const CONSTANTS: Record<string, number> = {
  π: Math.PI,
  e: Math.E,
};

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('n!: только целые ≥ 0');
  if (n > 170) throw new Error('n! слишком велико');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let s = '';
      let dot = false;
      while (i < expr.length && (/\d/.test(expr[i]) || (expr[i] === '.' && !dot))) {
        if (expr[i] === '.') dot = true;
        s += expr[i++];
      }
      tokens.push({ kind: 'num', value: s });
      continue;
    }

    if (/[a-zπ]/.test(ch)) {
      let s = '';
      while (i < expr.length && /[a-zπ]/.test(expr[i])) s += expr[i++];
      if (s in CONSTANTS)           tokens.push({ kind: 'const', value: s });
      else if (s in MATH_FUNCTIONS) tokens.push({ kind: 'fn',    value: s });
      else throw new Error(`Неизвестно: ${s}`);
      continue;
    }

    if (ch === '(') { tokens.push({ kind: 'lparen',  value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'rparen',  value: ')' }); i++; continue; }
    if (ch === '!') { tokens.push({ kind: 'postfix', value: '!' }); i++; continue; }

    if (ch in BINARY_OPS) {
      const prev = tokens[tokens.length - 1];
      if ((ch === '-' || ch === '+') &&
          (!prev || prev.kind === 'lparen' || prev.kind === 'op')) {
        if (ch === '-') {
          tokens.push({ kind: 'num', value: '0' });
          tokens.push({ kind: 'op',  value: '-' });
        }
        i++;
        continue;
      }
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`Неизвестный символ: '${ch}'`);
  }

  return tokens;
}

function shuntingYard(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack:  Token[] = [];

  for (const tok of tokens) {
    switch (tok.kind) {
      case 'num':
      case 'const':
        output.push(tok);
        break;
      case 'fn':
        stack.push(tok);
        break;
      case 'postfix':
        output.push(tok);
        break;
      case 'op': {
        const op = BINARY_OPS[tok.value];
        while (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.kind === 'lparen') break;
          if (top.kind === 'fn') { output.push(stack.pop()!); continue; }
          if (top.kind !== 'op') break;
          const topOp = BINARY_OPS[top.value];
          if (topOp.prec > op.prec || (topOp.prec === op.prec && !op.rightAssoc)) {
            output.push(stack.pop()!);
          } else break;
        }
        stack.push(tok);
        break;
      }
      case 'lparen':
        stack.push(tok);
        break;
      case 'rparen':
        while (stack.length > 0 && stack[stack.length - 1].kind !== 'lparen') {
          output.push(stack.pop()!);
        }
        if (stack.length === 0) throw new Error('Несовпадающие скобки');
        stack.pop();
        if (stack.length > 0 && stack[stack.length - 1].kind === 'fn') {
          output.push(stack.pop()!);
        }
        break;
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.kind === 'lparen') throw new Error('Несовпадающие скобки');
    output.push(top);
  }

  return output;
}

function evalRPN(rpn: Token[], deg: boolean): number {
  const stack: number[] = [];

  for (const tok of rpn) {
    if (tok.kind === 'num') {
      stack.push(parseFloat(tok.value));
    } else if (tok.kind === 'const') {
      stack.push(CONSTANTS[tok.value]);
    } else if (tok.kind === 'postfix') {
      if (stack.length < 1) throw new Error('Ошибка выражения');
      stack.push(factorial(stack.pop()!));
    } else if (tok.kind === 'fn') {
      if (stack.length < 1) throw new Error('Ошибка выражения');
      stack.push(MATH_FUNCTIONS[tok.value](stack.pop()!, deg));
    } else if (tok.kind === 'op') {
      if (stack.length < 2) throw new Error('Ошибка выражения');
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(BINARY_OPS[tok.value].fn(a, b));
    }
  }

  if (stack.length !== 1) throw new Error('Ошибка выражения');
  return stack[0];
}

export function evaluate(expr: string, deg = true): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error('Пустое выражение');
  return evalRPN(shuntingYard(tokens), deg);
}
