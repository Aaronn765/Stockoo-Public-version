# Stockoo Public version

A sanitized engineering case study for a multi-store inventory and cash-management SaaS built within ODX Technologies.

**Author:** TOUVOLI BALLO STEVE AARON · Software engineering, JUNIA ISEN Lille

[Version française](README.fr.md)

## Product and contribution

Stockoo helps small retail and wholesale teams manage products, purchases, sales, stock levels, cash movements, receipts, employees, and store activity. One organization can contain multiple stores, with owner and employee access scoped to the relevant business data.

My work covered the product and its end-to-end implementation: the Next.js application, TypeScript business flows, Supabase/PostgreSQL data model, access policies, purchase and sale transactions, file handling, and role-based test scenarios.

The private application uses Next.js App Router, TypeScript, React, Tailwind CSS, Supabase Auth, PostgreSQL with Row Level Security, Supabase Storage, and SWR. Its purchase and sale forms call PostgreSQL functions through Supabase RPC. This repository reimplements a narrow, runnable slice using TypeScript and PostgreSQL so the stock transaction can be tested locally without production accounts or a hosted Supabase project.

## The engineering problem

A sale must not oversell stock when two employees act at the same time. The public reference transaction:

1. Resolves the authenticated actor's store access.
2. Locks the store's product rows in stable ID order.
3. Checks every line against current stock before inserting a sale.
4. Writes the sale, line snapshots, product balances, and stock movements in one transaction.
5. Rolls the whole operation back if any product is unavailable.

The demo also tests that one tenant cannot mutate another tenant's store and that product-name snapshots remain readable after a product is removed.

## Architecture

~~~mermaid
flowchart LR
  U[Owner or employee] --> W[Next.js web app]
  W --> S[Supabase Auth session]
  W --> R[Supabase RPC and table queries]
  R --> P[(PostgreSQL)]
  P --> L[Row Level Security]
  P --> T[Atomic purchase and sale functions]
  T --> M[Stock and cash movement history]
  W --> F[Private receipt storage]
~~~

The diagram describes the private application's boundaries. The executable reference in this repository is smaller and uses a local PostgreSQL adapter for reproducible tests.

## Run the reference implementation

Requires Node.js 22 or later.

~~~sh
npm install
npm run typecheck
npm test
~~~

PowerShell, for the real PostgreSQL concurrency test:

~~~powershell
docker compose -f compose.test.yaml up -d --wait
$env:STOCKOO_TEST_DATABASE_URL = 'postgres://demo@127.0.0.1:55433/stockoo_demo'
npm run test:postgres
Remove-Item Env:STOCKOO_TEST_DATABASE_URL
docker compose -f compose.test.yaml down
~~~

The integration suite is skipped when the test URL is absent. Read [testing notes](docs/security-and-testing.md) before choosing a database.

## Design notes

- [Architecture and source boundaries](docs/architecture.md)
- [Multi-tenant access model](docs/multi-tenancy.md)
- [Inventory transactions and calculations](docs/inventory-transactions.md)
- [Historical snapshots and data model](docs/data-model.md)
- [Security scope and verification](docs/security-and-testing.md)

## Public scope

An optional Supabase-only RLS policy example is in <code>db/supabase-rls-reference.sql</code>; local tests do not apply it.
This repository starts from a clean Git history and uses synthetic organizations, products, and quantities. It does not include customer or store records, uploaded receipts, payment-provider code, production environment values, private deployment configuration, or copied internal planning documents. It is a technical case study, not a deployable edition of Stockoo and not a security certification.
