# Architecture

## Роль проекта

`diez-control-center` — будущая главная ПК-программа / центр управления экосистемой «Диез Имидж».

## Текущая архитектура MVP-1

На текущем этапе создан API-слой для read-only доступа к существующей базе `diez-data-core`.

Desktop UI ещё не создан.

Правильный доступ к данным:

```text
Desktop UI -> API -> PostgreSQL
```

## PostgreSQL

PostgreSQL подключается только через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Реальные пароли и секреты нельзя хранить в коде.

## Read-only API

MVP-1 API endpoints готовы:

* GET /health
* GET /health/db
* GET /units
* GET /material-categories
* GET /materials
* GET /materials/:id/pricing-inputs
* GET /materials/specs/roll
* GET /materials/specs/sheet
* GET /materials/specs/liquid
* GET /materials/specs/bulk
* GET /light-letter-specs
* GET /products
* GET /services

Endpoint-ы MVP-1 только читают данные.

## Границы

В рамках MVP-1:

* сайт `diez-site` не менялся;
* база `diez-data-core` не менялась;
* миграции не создавались;
* desktop UI ещё не создан.
