# Project Version

## diez-control-center

Current version: 0.0.0

Stage: mvp-1-read-api-ready

Date: 2026-05-29

## Status

MVP-1 API read-only endpoints готовы.

Desktop UI ещё не создан.

Проект создан как будущая главная ПК-программа / центр управления экосистемой «Диез Имидж».

## MVP-1 target

Read-only подключение через API к существующей базе `diez-data-core`.

## MVP-1 API endpoints

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

## Database connection

PostgreSQL подключается через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Endpoint-ы MVP-1 работают только в режиме read-only.

## Versioning rule

Версии программы должны фиксироваться здесь и в `CHANGELOG.md`.
