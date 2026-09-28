# Security scope and verification

## Access controls observed

The private app combines Supabase Auth sessions, PostgreSQL RLS, organization/store membership checks, role-sensitive database functions, and policies on the private purchase-attachment bucket. The RPC functions check the authenticated user and requested store before mutating data.

The public example reproduces only a database membership check for a locally trusted actor. It does not include payment-provider routes, webhook credentials, Supabase configuration, or uploaded files. The actor identifier in the example must be supplied by trusted authentication middleware if adapted elsewhere.

## Verification

~~~sh
npm run typecheck
npm test
~~~

The unit tests cover fixed-point totals, input validation, and stock underflow. The PostgreSQL integration test exercises concurrent sales against one product, tenant access rejection, and all-or-nothing behavior across multiple products.

Run the optional test against only the temporary container in <code>compose.test.yaml</code>. It binds to 127.0.0.1, uses an ephemeral data directory, and starts with a health check. Do not point it at a shared or production database.

The private repository also contains Robot Framework journeys for public, owner, and employee flows. These external UI journeys are not copied into this isolated reference project.
