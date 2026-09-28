# Stockoo — Multi-store Inventory & Cash Management SaaS

[![CI](https://github.com/Aaronn765/Stockoo-Public-version/actions/workflows/ci.yml/badge.svg)](https://github.com/Aaronn765/Stockoo-Public-version/actions/workflows/ci.yml)

Stockoo is a full-stack **multi-store inventory and cash-management SaaS** designed for small retail and wholesale businesses.

The platform centralizes products, purchases, sales, stock levels, cash movements, receipts, employees and store activity. One organization can operate several stores while keeping owner and employee permissions scoped to the right business data.

**Author:** TOUVOLI BALLO STEVE AARON · Software Engineering, JUNIA ISEN Lille

[Version française](README.fr.md)

## Product overview

Stockoo is built around a simple operational problem: a business needs to know what it owns, what it sold, what it purchased, who performed each operation and what happened to its stock and cash.

The production application includes:

- multi-store organization management;
- product and category management;
- purchase and sale workflows;
- stock tracking and movement history;
- cash management;
- employee access and store assignment;
- activity history;
- receipt/file handling;
- authentication and onboarding;
- payment-related flows.

## My contribution

I worked on the application end to end: Next.js pages and components, TypeScript business flows, Supabase/PostgreSQL data modeling, access rules, transactional purchase and sale operations, file handling and role-based scenarios.

The production stack includes **Next.js App Router, TypeScript, React, Tailwind CSS, Supabase Auth, PostgreSQL, Row Level Security, Supabase Storage and SWR**.

## Architecture

~~~mermaid
flowchart LR
  U[Owner or employee] --> W[Next.js Web App]
  W --> A[Supabase Auth]
  W --> R[RPC & data access]
  R --> P[(PostgreSQL)]
  P --> L[Row Level Security]
  P --> T[Atomic purchase & sale functions]
  T --> M[Stock & cash movement history]
  W --> F[Private file storage]
~~~

## Engineering highlights

### Atomic sales

A sale must update several pieces of state together: sale record, sale lines, product quantities and stock-movement history.

These writes therefore happen inside a single PostgreSQL transaction. If one product is unavailable, the entire operation is rolled back.

### Concurrency and overselling protection

Two employees may sell the same product at nearly the same time.

The public implementation locks product rows with `FOR UPDATE` before checking and decrementing stock. The integration test deliberately starts competing sales and verifies that PostgreSQL accepts only the operation that available inventory can support.

### Multi-tenant access

An organization may contain several stores and users.

The transaction verifies that the authenticated actor actually belongs to the organization or store before allowing a mutation. The production application also uses PostgreSQL Row Level Security through Supabase.

### Historical snapshots

Historical records should stay understandable even if a product is later renamed or deleted.

Sale lines and stock movements therefore keep snapshots of important product information such as the name and unit at the time of the operation.

## What this public repository contains

The complete production application remains private.

This repository provides a focused, runnable implementation of representative backend mechanisms:

- TypeScript inventory-domain logic;
- atomic PostgreSQL sales;
- row locking and overselling prevention;
- tenant/store authorization checks;
- historical product snapshots;
- stock-movement history;
- a Supabase RLS policy reference;
- unit, type and PostgreSQL integration tests.

Production customer records, uploaded receipts, payment-provider implementation details, secrets and private deployment configuration are excluded.

## Run the project

Requires Node.js 22 or later.

~~~bash
npm install
npm run typecheck
npm test
~~~

For the PostgreSQL integration tests:

~~~bash
docker compose -f compose.test.yaml up -d --wait
~~~

Then set:

~~~text
STOCKOO_TEST_DATABASE_URL=postgres://demo@127.0.0.1:55433/stockoo_demo
~~~

and run:

~~~bash
npm run test:postgres
~~~

The CI workflow automatically runs the TypeScript check, unit tests and PostgreSQL integration tests.

## Technical documentation

- [Architecture and source boundaries](docs/architecture.md)
- [Multi-tenant access model](docs/multi-tenancy.md)
- [Inventory transactions and calculations](docs/inventory-transactions.md)
- [Historical snapshots and data model](docs/data-model.md)
- [Security scope and verification](docs/security-and-testing.md)

## Technology

**Frontend:** Next.js, React, TypeScript, Tailwind CSS  
**Backend & data:** Supabase, PostgreSQL, RPC, Row Level Security  
**Storage & auth:** Supabase Storage, Supabase Auth  
**Testing:** TypeScript compiler, Node.js Test Runner, PostgreSQL integration tests

## Public scope

This repository is a technical public edition of Stockoo rather than a deployable copy of the production service. It contains synthetic data and isolated implementations intended to demonstrate the core software-engineering decisions behind the product.
