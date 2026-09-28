# Stockoo Public version

Étude de cas technique assainie d’un SaaS de gestion de stock et de caisse multi-boutiques, développé dans le cadre d’ODX Technologies.

**Auteur :** TOUVOLI BALLO STEVE AARON · Génie logiciel, JUNIA ISEN Lille

[English version](README.md)

## Produit et contribution

Stockoo aide les commerces et grossistes à gérer leurs produits, achats, ventes, niveaux de stock, mouvements de caisse, justificatifs, employés et historique d’activité. Une organisation peut regrouper plusieurs boutiques avec des accès propriétaire et employé limités aux données métier autorisées.

Mon travail a couvert le produit et son implémentation de bout en bout : application Next.js, parcours métier TypeScript, modèle Supabase/PostgreSQL, règles d’accès, transactions d’achat et de vente, gestion de fichiers et scénarios de test par rôle.

L’application privée utilise Next.js App Router, TypeScript, React, Tailwind CSS, Supabase Auth, PostgreSQL avec Row Level Security, Supabase Storage et SWR. Les formulaires d’achat et de vente appellent des fonctions PostgreSQL via Supabase RPC. Ce dépôt réimplémente une partie ciblée et exécutable avec TypeScript et PostgreSQL afin de tester les transactions localement, sans compte de production ni projet Supabase hébergé.

## Le problème technique

Une vente ne doit pas dépasser le stock disponible lorsque deux employés agissent en même temps. La transaction de référence :

1. Vérifie l’accès de l’utilisateur à la boutique.
2. Verrouille les lignes produits dans un ordre d’identifiants stable.
3. Vérifie chaque article par rapport au stock courant avant d’insérer la vente.
4. Écrit la vente, ses lignes, les nouveaux stocks et les mouvements dans une transaction unique.
5. Annule toute l’opération si un seul produit n’est plus disponible.

Les tests vérifient aussi qu’un membre d’un autre tenant ne peut pas modifier la boutique et que les instantanés de nom restent consultables après la suppression d’un produit.

## Architecture

~~~mermaid
flowchart LR
  U[Propriétaire ou employé] --> W[Application Next.js]
  W --> S[Session Supabase Auth]
  W --> R[RPC Supabase et requêtes]
  R --> P[(PostgreSQL)]
  P --> L[Row Level Security]
  P --> T[Fonctions transactionnelles achat et vente]
  T --> M[Historique des mouvements]
  W --> F[Stockage privé des justificatifs]
~~~

Ce diagramme décrit les frontières de l’application privée. La référence exécutable de ce dépôt est plus petite et utilise un adaptateur PostgreSQL local pour que les tests soient reproductibles.

## Lancer l’implémentation de référence

Node.js 22 ou plus récent est requis.

~~~sh
npm install
npm run typecheck
npm test
~~~

PowerShell, pour le test réel de concurrence PostgreSQL :

~~~powershell
docker compose -f compose.test.yaml up -d --wait
$env:STOCKOO_TEST_DATABASE_URL = 'postgres://demo@127.0.0.1:55433/stockoo_demo'
npm run test:postgres
Remove-Item Env:STOCKOO_TEST_DATABASE_URL
docker compose -f compose.test.yaml down
~~~

Sans URL de test, la suite d’intégration est ignorée. Lis les [notes de test](docs/security-and-testing.md) avant de choisir une base.

## Notes de conception

- [Architecture et frontières du code](docs/architecture.md)
- [Modèle d’accès multi-tenant](docs/multi-tenancy.md)
- [Transactions de stock et calculs](docs/inventory-transactions.md)
- [Instantanés historiques et modèle de données](docs/data-model.md)
- [Périmètre sécurité et vérification](docs/security-and-testing.md)

## Périmètre public

Un exemple de règle RLS propre à Supabase se trouve dans <code>db/supabase-rls-reference.sql</code> ; les tests locaux ne l’exécutent pas.
Ce dépôt part d’un historique Git neuf et utilise des organisations, produits et quantités fictifs. Il ne contient ni données de clients ou de boutiques, ni justificatifs téléversés, ni code de fournisseur de paiement, ni valeurs d’environnement de production, ni configuration privée de déploiement, ni document de planification interne copié. C’est une étude de cas technique, pas une version déployable de Stockoo ni une certification de sécurité.
