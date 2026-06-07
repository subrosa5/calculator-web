import './styles.css';
import { evaluate } from './evaluator';
import { initGrapher } from './grapher';

// ---- State ----

interface State {
  expr:   string;
  result: string;
  history: string[];
  memory: number;
  deg:    boolean;
  error:  boolean;
  fresh:  boolean;
}

const state: State = {
  expr: '',
  result: '0',
  history: [],
  memory: 0,
  deg: true,
  error: false,
  fresh: false,
};

// ---- Format ----

function fmt(n: number): string {
  if (!isFinite(n)) return n > 0 ? '+∞' : '−∞';
  if (isNaN(n)) return 'NaN';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-7 && n !== 0)) {
    return n.toExponential(8);
  }
  return parseFloat(n.toPrecision(12)).toString();
}

function isComplete(expr: string): boolean {
  return /[0-9πe)!]$/.test(expr.trim());
}

// ---- DOM refs ----

const elExpr    = document.getElementById('expression')    as HTMLElement;
const elResult  = document.getElementById('result')        as HTMLElement;
const elMode    = document.getElementById('mode')          as HTMLElement;
const elMem     = document.getElementById('mem-ind')       as HTMLElement;
const elHistory = document.getElementById('history-list')  as HTMLElement;

// ---- Render ----

function render(): void {
  elExpr.textContent  = state.expr || '';
  elResult.textContent = state.result;
  elResult.classList.toggle('error', state.error);
  elMode.textContent  = state.deg ? 'DEG' : 'RAD';
  elMem.classList.toggle('visible', state.memory !== 0);

  elHistory.innerHTML = '';
  if (state.history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'Нет записей';
    elHistory.appendChild(empty);
    return;
  }
  [...state.history].reverse().slice(0, 50).forEach(entry => {
    const eq = entry.lastIndexOf(' = ');
    const div = document.createElement('div');
    div.className = 'h-item';

    const exprLine   = document.createElement('div');
    exprLine.className  = 'h-expr';
    exprLine.textContent = eq !== -1 ? entry.slice(0, eq) : entry;

    const resultLine  = document.createElement('div');
    resultLine.className  = 'h-result';
    resultLine.textContent = eq !== -1 ? '= ' + entry.slice(eq + 3) : '';

    div.appendChild(exprLine);
    div.appendChild(resultLine);
    div.addEventListener('click', () => {
      if (eq !== -1) {
        state.expr   = entry.slice(0, eq);
        state.result = entry.slice(eq + 3);
        state.error  = false;
        state.fresh  = true;
      }
      render();
    });
    elHistory.appendChild(div);
  });
}

// ---- Actions ----

function livePreview(): void {
  if (!state.expr || !isComplete(state.expr)) return;
  try {
    const r = evaluate(state.expr, state.deg);
    state.result = fmt(r);
    state.error  = false;
  } catch { /* keep previous result while typing */ }
}

function append(s: string): void {
  if (state.error) {
    state.expr   = '';
    state.result = '0';
    state.error  = false;
  }
  if (state.fresh) {
    if (/^[+\-*/%^]$/.test(s)) {
      state.expr = state.result;
    } else {
      state.expr   = '';
      state.result = '0';
    }
    state.fresh = false;
  }
  state.expr += s;
  livePreview();
  render();
}

function calc(): void {
  if (!state.expr) return;
  try {
    const r  = evaluate(state.expr, state.deg);
    const rf = fmt(r);
    state.history.push(`${state.expr} = ${rf}`);
    if (state.history.length > 100) state.history.shift();
    state.result = rf;
    state.expr   = '';
    state.error  = false;
    state.fresh  = true;
  } catch (err) {
    state.result = err instanceof Error ? err.message : 'Ошибка';
    state.error  = true;
    state.fresh  = false;
  }
  render();
}

function clearAll(): void {
  state.expr   = '';
  state.result = '0';
  state.error  = false;
  state.fresh  = false;
  render();
}

function clearExpr(): void {
  if (state.error) { clearAll(); return; }
  state.expr  = '';
  state.error = false;
  state.fresh = false;
  render();
}

function backspace(): void {
  if (state.error) { clearAll(); return; }
  const m = state.expr.match(
    /^(.*)(sin\(|cos\(|tan\(|asin\(|acos\(|atan\(|log\(|ln\(|sqrt\(|cbrt\(|abs\(|exp\()$/
  );
  state.expr = m ? m[1] : state.expr.slice(0, -1);
  livePreview();
  render();
}

function toggleMode(): void {
  state.deg = !state.deg;
  livePreview();
  render();
  renderButtons();
}

function toggleSign(): void {
  if (!state.expr && state.fresh) {
    const n = parseFloat(state.result);
    if (!isNaN(n)) {
      state.expr   = fmt(-n);
      state.result = '0';
      state.fresh  = false;
      render();
    }
    return;
  }
  if (!state.expr) return;
  state.expr = state.expr.startsWith('-(') && state.expr.endsWith(')')
    ? state.expr.slice(2, -1)
    : `-(${state.expr})`;
  livePreview();
  render();
}

function squareIt(): void {
  if (!state.expr) return;
  state.expr = `(${state.expr})^2`;
  livePreview();
  render();
}

function reciprocal(): void {
  if (!state.expr) return;
  state.expr = `1/(${state.expr})`;
  livePreview();
  render();
}

function absWrap(): void {
  if (!state.expr) return;
  state.expr = `abs(${state.expr})`;
  livePreview();
  render();
}

function memAdd(): void {
  try { state.memory += evaluate(state.expr || state.result, state.deg); } catch { /* ignore */ }
  render();
}

function memSub(): void {
  try { state.memory -= evaluate(state.expr || state.result, state.deg); } catch { /* ignore */ }
  render();
}

function memRecall(): void { append(fmt(state.memory)); }
function memClear():  void { state.memory = 0; render(); }
function memStore():  void {
  try { state.memory = evaluate(state.expr || state.result, state.deg); } catch { /* ignore */ }
  render();
}

// ---- Button definitions ----

interface BtnDef {
  label: string;
  tip?:  string;
  cls:   string;
  act:   () => void;
  span?: number;
}

function makeBtnDefs(): BtnDef[] {
  return [
    // Row 1 — controls
    { label: state.deg ? 'DEG' : 'RAD', cls: 'btn-toggle', act: toggleMode,         tip: 'DEG / RAD' },
    { label: '(',   cls: 'btn-paren',   act: () => append('(') },
    { label: ')',   cls: 'btn-paren',   act: () => append(')') },
    { label: '%',   cls: 'btn-fn',      act: () => append('%'),                       tip: 'Остаток' },
    { label: 'C',   cls: 'btn-clear',   act: clearAll,                                tip: 'Очистить всё' },
    { label: 'CE',  cls: 'btn-ce',      act: clearExpr,                               tip: 'Очистить выражение' },
    { label: '⌫',   cls: 'btn-back',    act: backspace,                               tip: 'Backspace' },
    { label: '÷',   cls: 'btn-op',      act: () => append('/') },

    // Row 2 — trig + numpad top
    { label: 'sin',  cls: 'btn-fn',    act: () => append('sin(') },
    { label: 'cos',  cls: 'btn-fn',    act: () => append('cos(') },
    { label: 'tan',  cls: 'btn-fn',    act: () => append('tan(') },
    { label: 'π',    cls: 'btn-const', act: () => append('π') },
    { label: '7',    cls: 'btn-num',   act: () => append('7') },
    { label: '8',    cls: 'btn-num',   act: () => append('8') },
    { label: '9',    cls: 'btn-num',   act: () => append('9') },
    { label: '×',    cls: 'btn-op',    act: () => append('*') },

    // Row 3 — arc trig + numpad mid
    { label: 'asin', cls: 'btn-fn',    act: () => append('asin(') },
    { label: 'acos', cls: 'btn-fn',    act: () => append('acos(') },
    { label: 'atan', cls: 'btn-fn',    act: () => append('atan(') },
    { label: 'e',    cls: 'btn-const', act: () => append('e') },
    { label: '4',    cls: 'btn-num',   act: () => append('4') },
    { label: '5',    cls: 'btn-num',   act: () => append('5') },
    { label: '6',    cls: 'btn-num',   act: () => append('6') },
    { label: '−',    cls: 'btn-op',    act: () => append('-') },

    // Row 4 — log + numpad
    { label: 'log',  cls: 'btn-fn',    act: () => append('log('),  tip: 'log₁₀' },
    { label: 'ln',   cls: 'btn-fn',    act: () => append('ln('),   tip: 'log натуральный' },
    { label: '√x',   cls: 'btn-fn',    act: () => append('sqrt('), tip: 'Квадратный корень' },
    { label: 'xʸ',   cls: 'btn-fn',    act: () => append('^'),     tip: 'Степень' },
    { label: '1',    cls: 'btn-num',   act: () => append('1') },
    { label: '2',    cls: 'btn-num',   act: () => append('2') },
    { label: '3',    cls: 'btn-num',   act: () => append('3') },
    { label: '+',    cls: 'btn-op',    act: () => append('+') },

    // Row 5 — advanced + numpad bottom
    { label: 'x²',   cls: 'btn-fn',    act: squareIt,              tip: 'Возвести в квадрат' },
    { label: 'n!',   cls: 'btn-fn',    act: () => append('!'),     tip: 'Факториал' },
    { label: '1/x',  cls: 'btn-fn',    act: reciprocal,            tip: 'Обратное значение' },
    { label: '|x|',  cls: 'btn-fn',    act: absWrap,               tip: 'Модуль числа' },
    { label: '±',    cls: 'btn-fn',    act: toggleSign,            tip: 'Сменить знак' },
    { label: '0',    cls: 'btn-num',   act: () => append('0') },
    { label: '.',    cls: 'btn-num',   act: () => append('.') },
    { label: '=',    cls: 'btn-eq',    act: calc },

    // Row 6 — memory (each spans 2 cols)
    { label: 'MC',   cls: 'btn-mem',   act: memClear,   tip: 'Очистить память',         span: 2 },
    { label: 'MR',   cls: 'btn-mem',   act: memRecall,  tip: 'Вспомнить из памяти',     span: 2 },
    { label: 'M+',   cls: 'btn-mem',   act: memAdd,     tip: 'Добавить в память',       span: 2 },
    { label: 'M−',   cls: 'btn-mem',   act: memSub,     tip: 'Вычесть из памяти',       span: 2 },
  ];
}

const elButtons = document.getElementById('buttons') as HTMLElement;

function renderButtons(): void {
  elButtons.innerHTML = '';
  makeBtnDefs().forEach(def => {
    const btn = document.createElement('button');
    btn.className   = `btn ${def.cls}`;
    btn.textContent = def.label;
    if (def.tip)  btn.title = def.tip;
    if (def.span) btn.style.gridColumn = `span ${def.span}`;
    btn.addEventListener('click', def.act);
    btn.addEventListener('mousedown', e => e.preventDefault());
    elButtons.appendChild(btn);
  });
}

// ---- Keyboard ----

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const key = e.key;

  const simple: Record<string, string> = {
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    '.':'.', '+':'+', '-':'-', '*':'*',
    '^':'^', '%':'%', '(':  '(', ')':')', '!':'!',
  };

  if (key in simple)              { append(simple[key]); e.preventDefault(); return; }
  if (key === '/')                { append('/');          e.preventDefault(); return; }
  if (key === 'Enter' || key === '=') { calc();           e.preventDefault(); return; }
  if (key === 'Backspace')        { backspace();          e.preventDefault(); return; }
  if (key === 'Escape')           { clearAll();           e.preventDefault(); return; }
  if (key === 'Delete')           { clearExpr();          e.preventDefault(); return; }
  if (key === 'p' || key === 'P') { append('π');          e.preventDefault(); return; }
});

// ---- History clear ----

document.getElementById('clear-history')!.addEventListener('click', () => {
  state.history = [];
  render();
});

// ---- Themes ----

const root = document.documentElement;

const settingsBtn   = document.getElementById('btn-settings')!;
const settingsPanel = document.getElementById('settings-panel')!;
const themeCheckbox = document.getElementById('theme-checkbox') as HTMLInputElement;
const themeText     = document.getElementById('theme-text')!;

function applyTheme(theme: string): void {
  root.dataset.theme = theme;
  const isLight = theme === 'light';
  themeCheckbox.checked = isLight;
  themeText.textContent = isLight ? 'Светлая' : 'Тёмная';
  localStorage.setItem('theme', theme);
}

function applyColor(color: string): void {
  root.dataset.color = color;
  localStorage.setItem('color', color);
  document.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.color === color);
  });
}

function loadThemePrefs(): void {
  applyTheme(localStorage.getItem('theme') || 'dark');
  applyColor(localStorage.getItem('color') || 'space');
}

settingsBtn.addEventListener('click', e => {
  e.stopPropagation();
  const isOpen = settingsPanel.classList.toggle('open');
  settingsBtn.classList.toggle('open', isOpen);
});

document.addEventListener('click', () => {
  settingsPanel.classList.remove('open');
  settingsBtn.classList.remove('open');
});

settingsPanel.addEventListener('click', e => e.stopPropagation());

themeCheckbox.addEventListener('change', () => {
  applyTheme(themeCheckbox.checked ? 'light' : 'dark');
});

document.querySelectorAll('.color-opt').forEach(el => {
  el.addEventListener('click', () => {
    applyColor((el as HTMLElement).dataset.color!);
  });
});

// ---- Tabs ----

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const name = (tab as HTMLElement).dataset.tab!;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${name}`)!.classList.remove('hidden');
  });
});

// ---- Init ----

loadThemePrefs();
renderButtons();
render();
initGrapher();
