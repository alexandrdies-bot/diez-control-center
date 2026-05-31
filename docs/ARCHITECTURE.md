# Architecture

## Роль проекта

`diez-control-center` — будущая главная ПК-программа / центр управления экосистемой «Диез Имидж».

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

## Текущая архитектура MVP-1

На текущем этапе создан API-слой для read-only доступа к существующей базе `diez-data-core`.

Добавлен Tauri 2 desktop shell.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Desktop пока показывает shell и API health.

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

## Desktop

Добавлен Tauri 2 desktop shell.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Desktop пока показывает shell и API health.

## Границы

В рамках MVP-1:

* сайт `diez-site` не менялся;
* база `diez-data-core` не менялась;
* миграции не создавались;
* desktop пока показывает shell и API health.
