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

Временный MVP-экран "Материалы" добавлен.

Экран работает внутри Tauri desktop window.

Данные читаются через API endpoint GET /materials.

Для работы экрана PostgreSQL должен быть запущен через `diez-data-core` Docker.

Проверено 158 материалов.

Поиск по материалам работает.

Экран read-only.

Экран временный и может быть перенесён/удалён позже.

## Подключение к базе

PostgreSQL подключается через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Endpoint-ы работают только в режиме read-only.

## Не входит в текущий MVP-1

* изменение сайта `diez-site`;
* изменение базы `diez-data-core`;
* создание миграций;
* запись данных через API.

## Текущий запуск desktop в dev-режиме

Tauri desktop-приложение запускается.

Временный экран "Материалы" создан.

Экран читает данные через API endpoint `GET /materials`.

Для работы экрана сейчас нужны одновременно:

* PostgreSQL Docker из `diez-data-core`;
* API `pnpm.cmd dev:api`;
* Tauri `pnpm.cmd dev:tauri`.

Если PostgreSQL не запущен или API не видит `DATABASE_URL`, экран может показать:

```text
Materials request failed: 500
```

Это известная dev-проблема запуска, не ошибка UI.

Позже нужно сделать более удобный запуск и нормальное сообщение об ошибке.
