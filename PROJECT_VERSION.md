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

## Product purpose

`diez-control-center` — это не справочник материалов, а единый головной центр управления экосистемой «Диез Имидж».

Главное назначение программы:

* приём и обработка заказов;
* управление заказами с сайта;
* будущая интеграция с Ozon;
* управление товарами для сайта и Ozon;
* расчёты стоимости и себестоимости;
* управление материалами и закупочными ценами;
* клиенты и контакты;
* оплаты;
* доставка;
* производственные статусы;
* интеграции;
* настройки.

Главный рабочий экран в будущем должен быть "Заказы".

Ozon должен быть отдельным будущим модулем.

Расчёты должны быть отдельным будущим модулем.

Текущий экран "Материалы" — временный технический MVP-экран только для проверки связки Desktop UI -> API -> PostgreSQL.

Материалы в будущем будут внутренним справочником для расчётов, а не главным назначением программы.

Текущий MVP остаётся read-only и безопасным.

## Access and roles

`diez-control-center` должен работать не как локальная программа на одном ПК, а как клиент к общей системе.

Один пользователь сможет установить программу на несколько ПК: дома, на работе, на ноутбуке или на дополнительном рабочем месте.

Все данные должны храниться в общей базе/API, а не локально внутри конкретного ПК.

Будущие роли: admin, manager, designer, production, accountant, viewer.

Роли должны управлять доступом к разделам и действиям.

Будущие основные разделы: Главная панель, Заказы, Ozon, Клиенты, Расчёты, Товары, Материалы и цены, Производство, Оплаты, Доставка, Интеграции, Настройки, Пользователи и роли.

Desktop-приложение не должно хранить пароль PostgreSQL.

Доступ должен идти через API.

В будущем нужны авторизация, пользователи, роли, права доступа, audit log и история действий.

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

## Current desktop dev run

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
