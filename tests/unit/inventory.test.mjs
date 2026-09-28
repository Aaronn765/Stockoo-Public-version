import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineTotalCents,
  prepareSaleLines,
  subtractStock,
} from '../../src/domain/inventory.ts';

test('fixed-point line totals round to the nearest cent', () => {
  assert.equal(calculateLineTotalCents(1_500, 2_499), 3_749);
  assert.equal(calculateLineTotalCents(1_000, 2_499), 2_499);
  assert.equal(calculateLineTotalCents(500, 1), 1);
});

test('sale lines reject empty, duplicate, and non-positive quantities', () => {
  assert.throws(() => prepareSaleLines([]), /At least one sale line/);
  assert.throws(
    () => prepareSaleLines([
      { productId: 'one', quantityMilli: 1 },
      { productId: 'one', quantityMilli: 1 },
    ]),
    /only once/,
  );
  assert.throws(
    () => prepareSaleLines([{ productId: 'one', quantityMilli: 0 }]),
    /positive integer/,
  );
});

test('stock arithmetic blocks an underflow', () => {
  assert.equal(subtractStock(9_000, 2_500), 6_500);
  assert.throws(() => subtractStock(2_000, 2_001), /Insufficient stock/);
});
