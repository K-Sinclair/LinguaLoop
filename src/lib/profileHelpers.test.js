import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProfileInitials,
  isValidUsername,
  normalizeUsername,
} from './profileHelpers.js';

test('normalizeUsername trims and lowers the username', () => {
  assert.equal(normalizeUsername('  LinguaLoop_2025 '), 'lingualoop_2025');
});

test('normalizeUsername only normalizes case and surrounding whitespace', () => {
  assert.equal(normalizeUsername(''), '');
  assert.equal(normalizeUsername('A Name'), 'a name');
});

test('isValidUsername enforces the database username format', () => {
  assert.equal(isValidUsername('learner-01'), true);
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('a name'), false);
  assert.equal(isValidUsername('_starts-wrong'), false);
  assert.equal(isValidUsername('a'.repeat(31)), false);
});

test('getProfileInitials uses the display name before the email', () => {
  assert.equal(getProfileInitials('Ava Chen', 'ava@example.com'), 'AC');
  assert.equal(getProfileInitials('', 'ava@example.com'), 'A');
});
