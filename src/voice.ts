type OnResult = (expr: string, raw: string) => void;
type OnError  = (msg: string) => void;

function parseVoice(raw: string): string {
  let t = raw.toLowerCase().trim();

  const phrases: [RegExp, string][] = [
    // Русские многословные фразы (порядок важен — длинные первыми)
    [/умножить на/g,        '*'],
    [/разделить на/g,       '/'],
    [/в степени/g,          '^'],
    [/в квадрате/g,         '^2'],
    [/квадратный корень/g,  'sqrt('],
    [/корень из/g,          'sqrt('],
    [/корень/g,             'sqrt('],
    [/натуральный логарифм/g, 'ln('],
    [/логарифм/g,           'log('],
    [/арксинус/g,           'asin('],
    [/арккосинус/g,         'acos('],
    [/арктангенс/g,         'atan('],
    [/синус/g,              'sin('],
    [/косинус/g,            'cos('],
    [/тангенс/g,            'tan('],
    [/факториал/g,          '!'],
    [/модуль/g,             'abs('],
    [/открыть скобку/g,     '('],
    [/открытая скобка/g,    '('],
    [/закрыть скобку/g,     ')'],
    [/закрытая скобка/g,    ')'],
    [/скобка открыть/g,     '('],
    [/скобка закрыть/g,     ')'],
    [/число пи/g,           'π'],
    [/пи/g,                 'π'],
    [/число е/g,            'e'],
    [/плюс/g,               '+'],
    [/минус/g,              '-'],
    [/умножить/g,           '*'],
    [/разделить/g,          '/'],
    [/запятая/g,            '.'],
    [/точка/g,              '.'],
    [/равно/g,              '='],
    // English
    [/square root of/g,     'sqrt('],
    [/square root/g,        'sqrt('],
    [/divided by/g,         '/'],
    [/times/g,              '*'],
    [/plus/g,               '+'],
    [/minus/g,              '-'],
    [/to the power of/g,    '^'],
    [/squared/g,            '^2'],
    [/factorial/g,          '!'],
    [/sine?\s/g,            'sin('],
    [/cosine?\s/g,          'cos('],
    [/tangent\s/g,          'tan('],
    [/logarithm/g,          'log('],
  ];

  for (const [from, to] of phrases) t = t.replace(from, to);

  const nums: Record<string, string> = {
    'ноль': '0', 'нуль': '0',
    'один': '1', 'одна': '1', 'одно': '1',
    'два': '2', 'две': '2',
    'три': '3', 'четыре': '4', 'пять': '5',
    'шесть': '6', 'семь': '7', 'восемь': '8', 'девять': '9',
    'десять': '10', 'одиннадцать': '11', 'двенадцать': '12',
    'тринадцать': '13', 'четырнадцать': '14', 'пятнадцать': '15',
    'шестнадцать': '16', 'семнадцать': '17', 'восемнадцать': '18', 'девятнадцать': '19',
    'двадцать': '20', 'тридцать': '30', 'сорок': '40', 'пятьдесят': '50',
    'шестьдесят': '60', 'семьдесят': '70', 'восемьдесят': '80', 'девяносто': '90',
    'сто': '100', 'двести': '200', 'триста': '300', 'четыреста': '400',
    'пятьсот': '500', 'тысяча': '1000',
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'twenty': '20',
    'thirty': '30', 'forty': '40', 'fifty': '50', 'hundred': '100',
  };

  for (const [word, digit] of Object.entries(nums)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  }

  t = t.replace(/\s*([+\-*/^()!=])\s*/g, '$1');
  t = t.replace(/\s+/g, '');

  return t;
}

export function initVoice(onResult: OnResult, onError: OnError): (() => void) | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = 'ru-RU';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e: any) => {
    const raw = e.results[0][0].transcript.trim();
    const expr = parseVoice(raw);
    onResult(expr, raw);
  };

  recognition.onerror = (e: any) => {
    if (e.error === 'no-speech') onError('Не слышу — попробуй ещё раз');
    else if (e.error === 'not-allowed') onError('Нет доступа к микрофону');
    else onError('Ошибка распознавания');
  };

  return () => {
    try { recognition.start(); } catch { /* already running */ }
  };
}
