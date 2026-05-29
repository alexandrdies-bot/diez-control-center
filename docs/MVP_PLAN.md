# MVP Plan

## MVP-1

Цель MVP-1 — read-only API-подключение к существующей базе `diez-data-core`.

## Готово

MVP-1 API read-only endpoints готовы:

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

Tauri 2 desktop shell добавлен.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Desktop пока показывает shell и API health.

## Подключение к базе

PostgreSQL подключается через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Endpoint-ы работают только в режиме read-only.

## Не входит в текущий MVP-1

* изменение сайта `diez-site`;
* изменение базы `diez-data-core`;
* создание миграций;
* запись данных через API.
