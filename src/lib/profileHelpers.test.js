import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, getProfileInitials } from './profileHelpers.js';

test('normalizeUsername trims and lowers the username', () => {
  assert.equal(normalizeUsername('  LinguaLoop_2025 '), 'lingualoop_2025');
});

test('normalizeUsername returns empty for invalid values', () => {
  assert.equal(normalizeUsername(''), '');
  assert.equal(normalizeUsername('!!!'), '');
});

test('getProfileInitials uses the display name before the email', () => {
  assert.equal(getProfileInitials('Ava Chen', 'ava@example.com'), 'AC');
  assert.equal(getProfileInitials('', 'ava@example.com'), 'A');
});
