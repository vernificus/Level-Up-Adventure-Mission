import assert from 'node:assert';
import { normalizeStep, normalizeSteps, renderFormattedText } from '../src/utils/textUtils.js';

console.log('Testing textUtils...');

// 1. normalizeStep tests
{
  const empty = normalizeStep(null);
  assert.deepStrictEqual(empty, { text: '', link: '', linkText: '', completed: false });

  const fromStr = normalizeStep('Step 1: Build a circuit');
  assert.deepStrictEqual(fromStr, { text: 'Step 1: Build a circuit', link: '', linkText: '', completed: false });

  const fromObj = normalizeStep({ text: 'Step 2', link: 'https://example.com', linkText: 'Link', completed: true });
  assert.strictEqual(fromObj.text, 'Step 2');
  assert.strictEqual(fromObj.link, 'https://example.com');
  assert.strictEqual(fromObj.linkText, 'Link');
  assert.strictEqual(fromObj.completed, true);
}

// 2. normalizeSteps tests
{
  const emptyArr = normalizeSteps(null);
  assert.deepStrictEqual(emptyArr, []);

  const mixed = normalizeSteps([
    'Step A',
    { text: 'Step B', link: 'https://test.org' },
    '',
    { text: '', link: '' },
    null
  ]);
  assert.strictEqual(mixed.length, 2);
  assert.strictEqual(mixed[0].text, 'Step A');
  assert.strictEqual(mixed[1].text, 'Step B');
}

// 3. renderFormattedText tests
{
  assert.strictEqual(renderFormattedText(''), null);
  assert.strictEqual(renderFormattedText(null), null);

  const plain = renderFormattedText('Simple plain text without formatting');
  assert.strictEqual(plain[0].props.children, 'Simple plain text without formatting');

  const withBold = renderFormattedText('Hello **world**!');
  assert(Array.isArray(withBold), 'Formatted text with bold should return an array of elements');
  assert.strictEqual(withBold.length, 3);
  assert.strictEqual(withBold[1].type, 'strong');
  assert.strictEqual(withBold[1].props.children, 'world');

  const withItalic = renderFormattedText('This is *italic* text');
  assert(Array.isArray(withItalic));
  assert.strictEqual(withItalic[1].type, 'em');
  assert.strictEqual(withItalic[1].props.children, 'italic');
}

console.log('✔ textUtils tests passed successfully!');
