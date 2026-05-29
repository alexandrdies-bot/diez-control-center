# Project Version

## diez-control-center

Current version: 0.0.0

Stage: mvp-1-materials-screen-ready

Date: 2026-05-29

## Status

MVP-1 API read-only endpoints готовы.

Tauri 2 desktop shell добавлен.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Desktop пока показывает shell и API health.

Добавлен временный MVP-экран "Материалы".

Экран работает внутри Tauri desktop window.

Данные читаются через API endpoint GET /materials.

Для работы экрана PostgreSQL должен быть запущен через `diez-data-core` Docker.

Проверено 158 материалов.

Поиск по материалам работает.

Экран read-only.

Экран временный и может быть перенесён/удалён позже.

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

## Desktop shell

Добавлен Tauri 2 desktop shell.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Desktop пока показывает shell и API health.

## Temporary materials screen

Добавлен временный MVP-экран "Материалы".

Экран работает внутри Tauri desktop window.

Данные читаются через API endpoint GET /materials.

Для работы экрана PostgreSQL должен быть запущен через `diez-data-core` Docker.

Проверено 158 материалов.

Поиск по материалам работает.

Экран read-only.

Экран временный и может быть перенесён/удалён позже.

## Versioning rule

Версии программы должны фиксироваться здесь и в `CHANGELOG.md`.
