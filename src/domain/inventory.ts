export interface SaleLineInput {
  productId: string;
  quantityMilli: number;
}

export interface PreparedSaleLine extends SaleLineInput {
  unitPriceCents: number;
  lineTotalCents: number;
}

export function prepareSaleLines(lines: readonly SaleLineInput[]): SaleLineInput[] {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new TypeError('At least one sale line is required');
  }

  const seen = new Set<string>();
  return lines.map((line) => {
    if (!line || typeof line.productId !== 'string' || line.productId.trim() === '') {
      throw new TypeError('Every line needs a product identifier');
    }
    if (!Number.isSafeInteger(line.quantityMilli) || line.quantityMilli <= 0) {
      throw new RangeError('Quantity must be a positive integer number of milli-units');
    }
    if (seen.has(line.productId)) {
      throw new RangeError('A product can appear only once in a sale');
    }
    seen.add(line.productId);
    return { productId: line.productId, quantityMilli: line.quantityMilli };
  });
}

export function calculateLineTotalCents(quantityMilli: number, unitPriceCents: number): number {
  if (!Number.isSafeInteger(quantityMilli) || quantityMilli <= 0) {
    throw new RangeError('Quantity must be positive milli-units');
  }
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError('Unit price must be non-negative integer cents');
  }

  const numerator = BigInt(quantityMilli) * BigInt(unitPriceCents);
  const roundedCents = (numerator + 500n) / 1000n;
  if (roundedCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Line total exceeds the safe integer range');
  }
  return Number(roundedCents);
}

export function subtractStock(stockMilli: number, soldMilli: number): number {
  if (!Number.isSafeInteger(stockMilli) || stockMilli < 0
    || !Number.isSafeInteger(soldMilli) || soldMilli <= 0) {
    throw new RangeError('Stock and sold quantity must be non-negative integer milli-units');
  }
  if (soldMilli > stockMilli) {
    throw new RangeError('Insufficient stock');
  }
  return stockMilli - soldMilli;
}
