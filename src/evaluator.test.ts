import { describe, it, expect } from 'vitest';
import { evaluate, factorial } from './evaluator';

const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('Базовая арифметика', () => {
  it('сложение', () => expect(evaluate('2+3')).toBe(5));
  it('вычитание', () => expect(evaluate('10-4')).toBe(6));
  it('умножение', () => expect(evaluate('3*4')).toBe(12));
  it('деление', () => expect(evaluate('10/4')).toBe(2.5));
  it('остаток', () => expect(evaluate('10%3')).toBe(1));
  it('степень', () => expect(evaluate('2^8')).toBe(256));
  it('унарный минус', () => expect(evaluate('-5')).toBe(-5));
  it('деление на ноль', () => expect(() => evaluate('1/0')).toThrow('Деление на ноль'));
});

describe('Скобки и приоритеты', () => {
  it('приоритет * над +', () => expect(evaluate('2+3*4')).toBe(14));
  it('скобки меняют приоритет', () => expect(evaluate('(2+3)*4')).toBe(20));
  it('вложенные скобки', () => expect(evaluate('((2+3)*2)^2')).toBe(100));
  it('несовпадающие скобки', () => expect(() => evaluate('(2+3')).toThrow());
});

describe('Тригонометрия (DEG)', () => {
  it('sin(0) = 0',   () => expect(evaluate('sin(0)')).toBe(0));
  it('sin(90) = 1',  () => expect(approx(evaluate('sin(90)'), 1)).toBe(true));
  it('cos(0) = 1',   () => expect(evaluate('cos(0)')).toBe(1));
  it('cos(90) ≈ 0',  () => expect(approx(evaluate('cos(90)'), 0)).toBe(true));
  it('tan(45) = 1',  () => expect(approx(evaluate('tan(45)'), 1)).toBe(true));
  it('sin(-45) < 0', () => expect(evaluate('sin(-45)')).toBeLessThan(0));
});

describe('Тригонометрия (RAD)', () => {
  it('sin(π/2) = 1', () => expect(approx(evaluate('sin(π/2)', false), 1)).toBe(true));
  it('cos(π) = -1',  () => expect(approx(evaluate('cos(π)', false), -1)).toBe(true));
  it('tan(π/4) = 1', () => expect(approx(evaluate('tan(π/4)', false), 1)).toBe(true));
});

describe('Обратная тригонометрия', () => {
  it('asin(1) = 90 (DEG)', () => expect(approx(evaluate('asin(1)'), 90)).toBe(true));
  it('acos(1) = 0 (DEG)',  () => expect(approx(evaluate('acos(1)'), 0)).toBe(true));
  it('atan(1) = 45 (DEG)', () => expect(approx(evaluate('atan(1)'), 45)).toBe(true));
  it('asin вне [-1,1]',    () => expect(() => evaluate('asin(2)')).toThrow());
});

describe('Логарифмы и корни', () => {
  it('log(100) = 2',    () => expect(evaluate('log(100)')).toBe(2));
  it('log(1) = 0',      () => expect(evaluate('log(1)')).toBe(0));
  it('ln(e) = 1',       () => expect(approx(evaluate('ln(e)'), 1)).toBe(true));
  it('sqrt(9) = 3',     () => expect(evaluate('sqrt(9)')).toBe(3));
  it('sqrt(2)^2 ≈ 2',   () => expect(approx(evaluate('sqrt(2)^2'), 2)).toBe(true));
  it('log от отриц.',   () => expect(() => evaluate('log(-1)')).toThrow());
  it('sqrt от отриц.',  () => expect(() => evaluate('sqrt(-1)')).toThrow());
});

describe('Константы', () => {
  it('π ≈ 3.14159', () => expect(approx(evaluate('π'), Math.PI)).toBe(true));
  it('e ≈ 2.71828', () => expect(approx(evaluate('e'), Math.E)).toBe(true));
  it('π*2 ≈ 6.283',  () => expect(approx(evaluate('π*2'), Math.PI * 2)).toBe(true));
});

describe('Факториал', () => {
  it('0! = 1',   () => expect(factorial(0)).toBe(1));
  it('1! = 1',   () => expect(factorial(1)).toBe(1));
  it('5! = 120', () => expect(factorial(5)).toBe(120));
  it('10! = 3628800', () => expect(factorial(10)).toBe(3628800));
  it('выражение 5!', () => expect(evaluate('5!')).toBe(120));
  it('(3+2)! = 120', () => expect(evaluate('(3+2)!')).toBe(120));
  it('отрицательный факториал', () => expect(() => factorial(-1)).toThrow());
  it('дробный факториал',       () => expect(() => factorial(1.5)).toThrow());
});

describe('Прочие функции', () => {
  it('abs(-5) = 5',    () => expect(evaluate('abs(-5)')).toBe(5));
  it('abs(5) = 5',     () => expect(evaluate('abs(5)')).toBe(5));
  it('cbrt(27) = 3',   () => expect(evaluate('cbrt(27)')).toBe(3));
  it('exp(0) = 1',     () => expect(evaluate('exp(0)')).toBe(1));
  it('exp(1) = e',     () => expect(approx(evaluate('exp(1)'), Math.E)).toBe(true));
});

describe('Сложные выражения', () => {
  it('sin(30)^2 + cos(30)^2 = 1', () => {
    expect(approx(evaluate('sin(30)^2+cos(30)^2'), 1)).toBe(true);
  });
  it('log(10^3) = 3', () => expect(approx(evaluate('log(10^3)'), 3)).toBe(true));
  it('sqrt(2+2) = 2',  () => expect(evaluate('sqrt(2+2)')).toBe(2));
  it('2^3^2 = 512 (правая ассоц.)', () => expect(evaluate('2^3^2')).toBe(512));
  it('3!+2! = 8',      () => expect(evaluate('3!+2!')).toBe(8));
});
