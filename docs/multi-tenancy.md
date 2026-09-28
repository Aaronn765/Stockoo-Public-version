# Multi-tenant access

## Private data model

The private schema models organizations, organization members, stores, and store members separately. Products, purchases, sales, cash movements, and stock movements belong to a store. Database Row Level Security is enabled on the business tables.

Helper functions use the current Supabase Auth identity to distinguish active organization owners from employees with access to a particular store. Critical purchase and sale functions also check the caller before writing. Cash-management access has a separate owner check.

## Public transaction guard

The local reference accepts an actor ID only as an internal service argument. It then verifies active organization membership and store membership in PostgreSQL before locking or changing products. In a real web request, the actor ID must come from the verified Supabase session; never trust a user ID supplied in a request body.

The optional `db/supabase-rls-reference.sql` file shows a small SELECT policy bound to `auth.uid()`. It is Supabase-specific and is not applied by the local test schema. The local adapter and the policy snippet are separate examples, not a complete authorization stack.
This is a transaction-level demonstration, not a replacement for the private app's RLS policies. The demo database is local and disposable. It does not include Supabase's auth schema or pretend to emulate a JWT.
