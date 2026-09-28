import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  calculateLineTotalCents,
  prepareSaleLines,
} from '../../domain/inventory.ts';

export interface RecordSaleCommand {
  storeId: string;
  actorId: string;
  lines: readonly { productId: string; quantityMilli: number }[];
}

interface LockedProduct {
  product_id: string;
  name: string;
  unit_code: string;
  sell_price_cents: string;
  stock_milli: string;
  is_active: boolean;
}

export class StoreAccessError extends Error {
  constructor() {
    super('Actor cannot access this store');
    this.name = 'StoreAccessError';
  }
}

export class ProductUnavailableError extends Error {
  constructor() {
    super('A product is unavailable in this store');
    this.name = 'ProductUnavailableError';
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super('Insufficient stock for product ' + productId);
    this.name = 'InsufficientStockError';
  }
}

function requireUuid(value: string, label: string): void {
  if (typeof value !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError(label + ' must be a UUID');
  }
}

export async function recordSale(pool: Pool, command: RecordSaleCommand) {
  requireUuid(command.storeId, 'storeId');
  requireUuid(command.actorId, 'actorId');
  const lines = prepareSaleLines(command.lines);
  for (const line of lines) requireUuid(line.productId, 'productId');

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const access = await client.query(
      'SELECT 1 ' +
      'FROM demo_stores s ' +
      'JOIN demo_organization_members om ' +
      '  ON om.organization_id = s.organization_id ' +
      'LEFT JOIN demo_store_members sm ' +
      '  ON sm.store_id = s.store_id AND sm.user_id = om.user_id ' +
      'WHERE s.store_id = $1 AND om.user_id = $2 AND om.status = $3 ' +
      '  AND (om.role = $4 OR (sm.user_id IS NOT NULL AND sm.status = $3)) ' +
      'LIMIT 1',
      [command.storeId, command.actorId, 'active', 'owner'],
    );
    if (access.rowCount !== 1) throw new StoreAccessError();

    const productIds = lines.map((line) => line.productId);
    const productResult = await client.query<LockedProduct>(
      'SELECT product_id, name, unit_code, sell_price_cents, stock_milli, is_active ' +
      'FROM demo_products ' +
      'WHERE store_id = $1 AND product_id = ANY($2::uuid[]) ' +
      'ORDER BY product_id FOR UPDATE',
      [command.storeId, productIds],
    );
    if (productResult.rows.length !== lines.length) {
      throw new ProductUnavailableError();
    }

    const productsById = new Map(
      productResult.rows.map((product) => [product.product_id, product]),
    );
    let totalCents = 0;
    const preparedLines: (LockedProduct & {
      quantityMilli: number;
      stockBeforeMilli: number;
      stockAfterMilli: number;
      lineTotalCents: number;
    })[] = [];

    for (const line of lines) {
      const product = productsById.get(line.productId);
      if (!product || !product.is_active) throw new ProductUnavailableError();

      const stockBeforeMilli = Number(product.stock_milli);
      const unitPriceCents = Number(product.sell_price_cents);
      if (!Number.isSafeInteger(stockBeforeMilli) || !Number.isSafeInteger(unitPriceCents)) {
        throw new RangeError('Stored product values exceed safe integer precision');
      }
      if (line.quantityMilli > stockBeforeMilli) {
        throw new InsufficientStockError(line.productId);
      }

      const lineTotalCents = calculateLineTotalCents(line.quantityMilli, unitPriceCents);
      totalCents += lineTotalCents;
      if (!Number.isSafeInteger(totalCents)) {
        throw new RangeError('Sale total exceeds safe integer precision');
      }
      preparedLines.push({
        ...product,
        quantityMilli: line.quantityMilli,
        stockBeforeMilli,
        stockAfterMilli: stockBeforeMilli - line.quantityMilli,
        lineTotalCents,
      });
    }

    const saleId = randomUUID();
    await client.query(
      'INSERT INTO demo_sales (sale_id, store_id, created_by, total_cents) ' +
      'VALUES ($1, $2, $3, $4)',
      [saleId, command.storeId, command.actorId, totalCents],
    );

    for (const line of preparedLines) {
      await client.query(
        'INSERT INTO demo_sale_items ' +
        '(sale_item_id, sale_id, product_id, product_name_snapshot, unit_code_snapshot, ' +
        'quantity_milli, unit_price_cents, line_total_cents) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          randomUUID(),
          saleId,
          line.product_id,
          line.name,
          line.unit_code,
          line.quantityMilli,
          Number(line.sell_price_cents),
          line.lineTotalCents,
        ],
      );
      const updated = await client.query(
        'UPDATE demo_products SET stock_milli = $3 ' +
        'WHERE store_id = $1 AND product_id = $2 AND stock_milli >= $4',
        [command.storeId, line.product_id, line.stockAfterMilli, line.quantityMilli],
      );
      if (updated.rowCount !== 1) {
        throw new InsufficientStockError(line.product_id);
      }
      await client.query(
        'INSERT INTO demo_stock_movements ' +
        '(movement_id, store_id, product_id, product_name_snapshot, unit_code_snapshot, ' +
        'created_by, movement_type, quantity_delta_milli, quantity_before_milli, ' +
        'quantity_after_milli, reference_type, reference_id) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [
          randomUUID(),
          command.storeId,
          line.product_id,
          line.name,
          line.unit_code,
          command.actorId,
          'sale',
          -line.quantityMilli,
          line.stockBeforeMilli,
          line.stockAfterMilli,
          'sale',
          saleId,
        ],
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;
    return { saleId, totalCents };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original transaction error.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
