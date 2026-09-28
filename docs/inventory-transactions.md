# Inventory transactions

## Sale flow

The private sale RPC validates the store and every line, creates a sale record, then locks each product row before checking and subtracting stock. It writes a sale-line snapshot and a stock-movement row for every item. PostgreSQL executes the function inside one transaction, so an exception rolls the document and all prior changes back.

The public reference validates the full line set, locks product rows in stable identifier order, and checks all balances before inserting the sale. Stable lock ordering reduces deadlock risk when two carts contain overlapping products in a different order.

## Purchase flow

The private purchase RPC follows the matching inbound path: validate products for the selected store, insert the purchase and its lines, add quantities to stock, and append purchase stock movements. When the caller requests a cash debit, the function verifies owner-level cash access and records the associated expense in the same operation.

The public reference concentrates executable tests on sale concurrency and tenant boundaries; it does not reproduce the cash or purchase payment policy.

## Fixed-point arithmetic

The private schema stores quantities as PostgreSQL numeric values with three decimal places and prices as numeric currency amounts. The public example uses integer milli-units for quantity and integer cents for money:

~~~text
line_total_cents = round(quantity_milli × unit_price_cents / 1000)
sale_total_cents = sum(line_total_cents)
stock_after_milli = stock_before_milli - quantity_sold_milli
~~~

The pure TypeScript helper uses BigInt for the product before rounding, avoiding binary floating-point drift. The values are synthetic and the example uses a single generic currency scale.
