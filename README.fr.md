# Stockoo — SaaS de gestion de stock et de caisse multi-boutiques

[![CI](https://github.com/Aaronn765/Stockoo-Public-version/actions/workflows/ci.yml/badge.svg)](https://github.com/Aaronn765/Stockoo-Public-version/actions/workflows/ci.yml)

Stockoo est un **SaaS de gestion de stock et de caisse multi-boutiques** conçu pour les commerces et grossistes.

La plateforme centralise les produits, achats, ventes, niveaux de stock, mouvements de caisse, justificatifs, employés et activités des boutiques. Une organisation peut gérer plusieurs points de vente tout en limitant les accès des propriétaires et employés aux données qui les concernent.

**Auteur :** TOUVOLI BALLO STEVE AARON · Génie logiciel, JUNIA ISEN Lille

[English version](README.md)

## Vue produit

Stockoo répond à un problème opérationnel simple : un commerce doit savoir ce qu’il possède, ce qu’il a vendu, ce qu’il a acheté, qui a effectué chaque opération et comment son stock et sa caisse ont évolué.

L’application de production comprend notamment :

- gestion de plusieurs boutiques ;
- produits et catégories ;
- achats et ventes ;
- suivi du stock et historique des mouvements ;
- gestion de caisse ;
- employés et affectation aux boutiques ;
- historique d’activité ;
- justificatifs et fichiers ;
- authentification et onboarding ;
- flux liés aux paiements.

## Ma contribution

J’ai travaillé sur l’application de bout en bout : pages et composants Next.js, logique métier TypeScript, modèle Supabase/PostgreSQL, règles d’accès, transactions d’achat et de vente, gestion de fichiers et scénarios de test par rôle.

La stack de production comprend **Next.js App Router, TypeScript, React, Tailwind CSS, Supabase Auth, PostgreSQL, Row Level Security, Supabase Storage et SWR**.

## Architecture

~~~mermaid
flowchart LR
  U[Propriétaire ou employé] --> W[Application Next.js]
  W --> A[Supabase Auth]
  W --> R[RPC & accès aux données]
  R --> P[(PostgreSQL)]
  P --> L[Row Level Security]
  P --> T[Fonctions atomiques achat & vente]
  T --> M[Historique stock & caisse]
  W --> F[Stockage privé]
~~~

## Points techniques importants

### Ventes atomiques

Une vente doit mettre à jour plusieurs éléments ensemble : vente, lignes de vente, quantités produits et historique des mouvements.

Ces écritures sont regroupées dans une seule transaction PostgreSQL. Si un produit n’est plus disponible, toute l’opération est annulée.

### Concurrence et prévention de la survente

Deux employés peuvent vendre le même produit presque au même moment.

L’implémentation publique verrouille les lignes produits avec `FOR UPDATE` avant de vérifier et diminuer le stock. Le test d’intégration lance volontairement deux ventes concurrentes et vérifie que PostgreSQL n’accepte que ce que le stock disponible permet réellement.

### Isolation multi-tenant

Une organisation peut contenir plusieurs boutiques et utilisateurs.

La transaction vérifie que l’utilisateur a réellement accès à la boutique avant toute modification. L’application de production utilise également Row Level Security dans PostgreSQL via Supabase.

### Historique fiable

Une ancienne vente doit rester compréhensible même si un produit est ensuite renommé ou supprimé.

Les lignes de vente et mouvements de stock conservent donc des instantanés du nom et de l’unité du produit au moment de l’opération.

## Ce que contient ce dépôt public

L’application complète de production reste privée.

Ce dépôt présente une implémentation ciblée et exécutable de plusieurs mécanismes backend :

- logique de stock en TypeScript ;
- ventes atomiques PostgreSQL ;
- verrouillage de lignes et prévention de la survente ;
- contrôle des accès organisation/boutique ;
- instantanés historiques des produits ;
- historique des mouvements de stock ;
- exemple de politique Supabase RLS ;
- tests unitaires, typage et tests d’intégration PostgreSQL.

Les données clients, justificatifs téléversés, détails des fournisseurs de paiement, secrets et configurations privées de production sont exclus.

## Lancer le projet

Node.js 22 ou plus récent est requis.

~~~bash
npm install
npm run typecheck
npm test
~~~

Pour les tests PostgreSQL :

~~~bash
docker compose -f compose.test.yaml up -d --wait
~~~

Configurer ensuite :

~~~text
STOCKOO_TEST_DATABASE_URL=postgres://demo@127.0.0.1:55433/stockoo_demo
~~~

puis lancer :

~~~bash
npm run test:postgres
~~~

La CI exécute automatiquement le contrôle TypeScript, les tests unitaires et les tests d’intégration PostgreSQL.

## Documentation technique

- [Architecture et frontières du code](docs/architecture.md)
- [Modèle d’accès multi-tenant](docs/multi-tenancy.md)
- [Transactions de stock et calculs](docs/inventory-transactions.md)
- [Instantanés historiques et modèle de données](docs/data-model.md)
- [Sécurité et stratégie de vérification](docs/security-and-testing.md)

## Technologies

**Frontend :** Next.js, React, TypeScript, Tailwind CSS  
**Backend & données :** Supabase, PostgreSQL, RPC, Row Level Security  
**Stockage & authentification :** Supabase Storage, Supabase Auth  
**Tests :** compilateur TypeScript, Node.js Test Runner, tests d’intégration PostgreSQL

## Périmètre public

Ce dépôt est une édition technique publique de Stockoo et non une copie déployable du service de production. Il utilise des données fictives et des implémentations isolées pour montrer les principaux choix de génie logiciel du produit.
