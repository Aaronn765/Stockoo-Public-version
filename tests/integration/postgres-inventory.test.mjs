import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  InsufficientStockError,
  StoreAccessError,
  recordSale,
} from '../../src/infrastructure/postgres/record-sale.ts';

const connectionString = process.env.STOCKOO_TEST_DATABASE_URL;

test('PostgreSQL prevents overselling and preserves tenant and history boundaries', {
  skip: !connectionString,
}, async () => {
  const pool = new Pool({ connectionString, max: 8 });
  const ids = {
    owner: randomUUID(),
    employee: randomUUID(),
    outsider: randomUUID(),
    organization: randomUUID(),
    otherOrganization: randomUUID(),
    store: randomUUID(),
    otherStore: randomUUID(),
    product: randomUUID(),
    secondProduct: randomUUID(),
    otherProduct: randomUUID(),
  };

  try {
    const schema = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
    await pool.query(schema);
    await pool.query(
      'INSERT INTO demo_users (user_id, display_name) VALUES ' +
      '($1, $2), ($3, $4), ($5, $6)',
      [
        ids.owner, 'Sample owner',
        ids.outsider, 'Sample outsider',
        ids.employee, 'Sample employee',
      ],
    );
    await pool.query(
      'INSERT INTO demo_organizations (organization_id, name) VALUES ' +
      '($1, $2), ($3, $4)',
      [ids.organization, 'Sample organization', ids.otherOrganization, 'Other sample organization'],
    );
    await pool.query(
      'INSERT INTO demo_organization_members ' +
      '(organization_id, user_id, role, status) VALUES ' +
      '($1, $2, $3, $4), ($1, $5, $6, $4), ($7, $8, $3, $4)',
      [
        ids.organization, ids.owner, 'owner', 'active',
        ids.employee, 'employee',
        ids.otherOrganization, ids.outsider,
      ],
    );
    await pool.query(
      'INSERT INTO demo_stores (store_id, organization_id, name) VALUES ' +
      '($1, $2, $3), ($4, $5, $6)',
      [ids.store, ids.organization, 'Sample shop', ids.otherStore, ids.otherOrganization, 'Other shop'],
    );
    await pool.query(
      'INSERT INTO demo_store_members (store_id, user_id, status) VALUES ($1, $2, $3)',
      [ids.store, ids.employee, 'active'],
    );
    await pool.query(
      'INSERT INTO demo_products ' +
      '(product_id, store_id, name, unit_code, sell_price_cents, stock_milli) ' +
      'VALUES ($1, $2, $3, $4, $5, $6), ($7, $2, $8, $4, $9, $10), ' +
      '($11, $12, $13, $4, $5, $6)',
      [
        ids.product, ids.store, 'Sample item', 'unit', 250, 12_000,
        ids.secondProduct, 'Second item', 175, 4_000,
        ids.otherProduct, ids.otherStore, 'Other tenant item',
      ],
    );

    const results = await Promise.allSettled([
      recordSale(pool, {
        storeId: ids.store,
        actorId: ids.owner,
        lines: [{ productId: ids.product, quantityMilli: 7_000 }],
      }),
      recordSale(pool, {
        storeId: ids.store,
        actorId: ids.owner,
        lines: [{ productId: ids.product, quantityMilli: 7_000 }],
      }),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.ok(rejected?.reason instanceof InsufficientStockError);

    const acceptedSale = results.find((result) => result.status === 'fulfilled');
    assert.ok(acceptedSale);
    const firstSaleId = acceptedSale.value.saleId;

    const productAfterRace = await pool.query(
      'SELECT stock_milli FROM demo_products WHERE product_id = $1',
      [ids.product],
    );
    assert.equal(Number(productAfterRace.rows[0].stock_milli), 5_000);

    const snapshotBeforeRename = await pool.query(
      'SELECT product_name_snapshot FROM demo_sale_items WHERE product_id = $1',
      [ids.product],
    );
    assert.equal(snapshotBeforeRename.rows.length, 1);
    assert.equal(snapshotBeforeRename.rows[0].product_name_snapshot, 'Sample item');
    await pool.query('UPDATE demo_products SET name = $2 WHERE product_id = $1', [ids.product, 'Renamed item']);
    const snapshotAfterRename = await pool.query(
      'SELECT product_name_snapshot FROM demo_sale_items WHERE product_id = $1',
      [ids.product],
    );
    assert.equal(snapshotAfterRename.rows[0].product_name_snapshot, 'Sample item');

    await assert.rejects(
      recordSale(pool, {
        storeId: ids.otherStore,
        actorId: ids.owner,
        lines: [{ productId: ids.otherProduct, quantityMilli: 1_000 }],
      }),
      StoreAccessError,
    );

    await assert.rejects(
      recordSale(pool, {
        storeId: ids.store,
        actorId: ids.owner,
        lines: [
          { productId: ids.product, quantityMilli: 1_000 },
          { productId: ids.secondProduct, quantityMilli: 5_000 },
        ],
      }),
      InsufficientStockError,
    );
    const afterRollback = await pool.query(
      'SELECT ' +
      '(SELECT count(*) FROM demo_sales WHERE store_id = $1)::int AS sales, ' +
      '(SELECT stock_milli FROM demo_products WHERE product_id = $2) AS first_stock, ' +
      '(SELECT stock_milli FROM demo_products WHERE product_id = $3) AS second_stock',
      [ids.store, ids.product, ids.secondProduct],
    );
    assert.equal(afterRollback.rows[0].sales, 1);
    assert.equal(Number(afterRollback.rows[0].first_stock), 5_000);
    assert.equal(Number(afterRollback.rows[0].second_stock), 4_000);

    const employeeSale = await recordSale(pool, {
      storeId: ids.store,
      actorId: ids.employee,
      lines: [{ productId: ids.secondProduct, quantityMilli: 500 }],
    });
    const employeeSaleRow = await pool.query(
      'SELECT created_by FROM demo_sales WHERE sale_id = $1',
      [employeeSale.saleId],
    );
    assert.equal(employeeSaleRow.rows[0].created_by, ids.employee);

    await pool.query('DELETE FROM demo_products WHERE product_id = $1', [ids.product]);
    const retainedLine = await pool.query(
      'SELECT product_id, product_name_snapshot FROM demo_sale_items WHERE sale_id = $1',
      [firstSaleId],
    );
    const retainedMovement = await pool.query(
      'SELECT product_id, product_name_snapshot FROM demo_stock_movements WHERE reference_id = $1',
      [firstSaleId],
    );
    assert.equal(retainedLine.rows[0].product_id, null);
    assert.equal(retainedLine.rows[0].product_name_snapshot, 'Sample item');
    assert.equal(retainedMovement.rows[0].product_id, null);
    assert.equal(retainedMovement.rows[0].product_name_snapshot, 'Sample item');
  } finally {
    await pool.query(
      'DELETE FROM demo_organizations WHERE organization_id = ANY($1::uuid[])',
      [[ids.organization, ids.otherOrganization]],
    ).catch(() => {});
    await pool.query(
      'DELETE FROM demo_users WHERE user_id = ANY($1::uuid[])',
      [[ids.owner, ids.employee, ids.outsider]],
    ).catch(() => {});
    await pool.end();
  }
});
