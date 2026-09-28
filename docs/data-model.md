# Historical data model

~~~mermaid
erDiagram
  ORGANIZATION ||--o{ ORGANIZATION_MEMBER : includes
  ORGANIZATION ||--o{ STORE : owns
  STORE ||--o{ STORE_MEMBER : grants
  STORE ||--o{ PRODUCT : catalogs
  STORE ||--o{ SALE : records
  SALE ||--|{ SALE_ITEM : contains
  PRODUCT ||--o{ STOCK_MOVEMENT : changes
~~~

The private product keeps purchases, sales, and inventory movements as separate records rather than treating a product's current quantity as the complete history.

Sale-line snapshots preserve the product label, unit, quantity, and price used at the time of sale. Stock movements keep before/after quantities, the signed delta, actor, movement type, and a document reference. Product lifecycle changes can null the live product reference while retaining the movement's stored label.

This makes later edits to a product name or price less likely to rewrite what an old receipt or stock event meant. The public schema uses sample IDs and names only.
