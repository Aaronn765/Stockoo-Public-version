# Architecture and implementation scope

## Verified in the private Stockoo repository

- A Next.js App Router application written in TypeScript and React.
- Supabase Auth for user sessions, PostgreSQL for relational data, Row Level Security policies for tenant-scoped access, and Supabase Storage for purchase attachments.
- Organization membership plus store membership, with owner and employee roles.
- Purchase and sale forms call PostgreSQL functions through Supabase RPC.
- Purchase and sale database functions write the document header, lines, stock update, and stock movement together. The sale path locks product rows and checks the available quantity again before decrementing stock.
- The UI includes onboarding, store switching, products/categories, purchases, sales, cash, employees, dashboard, and activity history. Robot Framework suites cover public smoke, owner, and employee paths.

Some internal architecture notes describe planned packages and libraries not present in the shipped workspace. This public case study describes only the code paths and dependencies confirmed in the repository.

## Public reference structure

~~~text
src/
  domain/                 Fixed-point calculations and input validation
  infrastructure/postgres/ Tenant check and atomic sale transaction
db/                       Synthetic tables and relational constraints
tests/unit/                Pure inventory calculations
tests/integration/         Real PostgreSQL race and rollback scenarios
docs/                      Architecture, access, and data-model notes
~~~

The private implementation uses Supabase RPC; the public adapter uses node-postgres so the critical stock path can run against a disposable local PostgreSQL instance. No Supabase project, service-role key, or production account is needed.
