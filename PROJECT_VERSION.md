# Project Version

## diez-control-center

Current version: 0.0.0

Stage: mvp-1-materials-screen-ready

Date: 2026-05-29

## Documentation rule

В проекте должны остаться 3 основных файла:

* `README.md` — главная информация о проекте, назначение, архитектура, навигация, правила.
* `PROJECT_VERSION.md` — текущий статус, версия, что уже сделано, что дальше.
* `CHANGELOG.md` — история изменений по коммитам/этапам.

Папка `docs/` удаляется, а важные правила перенесены в 3 главных файла.

## Current status

MVP-1 API read-only endpoints готовы.

Tauri 2 desktop shell готов.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Временный экран "Материалы" создан и работает внутри Tauri desktop window.

Экран читает данные через API endpoint `GET /materials`.

Проверено 158 материалов.

Поиск по материалам работает.

Экран read-only.

Экран "Материалы" временный и нужен только для проверки связки:

```text
Desktop UI -> API -> PostgreSQL
```

В будущем материалы должны быть перенесены в:

```text
Настройки -> Материалы и закупочные цены
```

Материалы и закупочные цены нужны для расчётов, себестоимости и контроля цен.

Это служебный раздел, в первую очередь для `admin`.

Обычный менеджер не должен случайно менять закупочные цены.

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

Главный будущий экран — `Заказы`.

Сайт-заказы-чат-Ozon — будущие ключевые модули.

Ozon должен быть отдельным каналом заказов/сообщений.

Расчёты должны быть отдельным рабочим модулем.

Текущий MVP остаётся read-only и безопасным.

## MVP-1 API endpoints

* `GET /health`
* `GET /health/db`
* `GET /units`
* `GET /material-categories`
* `GET /materials`
* `GET /materials/:id/pricing-inputs`
* `GET /materials/specs/roll`
* `GET /materials/specs/sheet`
* `GET /materials/specs/liquid`
* `GET /materials/specs/bulk`
* `GET /light-letter-specs`
* `GET /products`
* `GET /services`

Endpoint-ы MVP-1 работают только в режиме read-only.

## Database connection

PostgreSQL подключается через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Desktop-приложение не должно хранить пароль PostgreSQL.

Доступ должен идти через API.

## Current desktop dev run

Для работы временного экрана "Материалы" сейчас нужны одновременно:

* PostgreSQL Docker из `diez-data-core`;
* API `pnpm.cmd dev:api`;
* Tauri `pnpm.cmd dev:tauri`.

PostgreSQL Docker пока запускать отдельно:

```powershell
cd D:\_ProjectHome\diez-data-core
docker compose up -d postgres
```

После запуска базы приложение можно запускать одной командой:

```powershell
cd D:\_ProjectHome\diez-control-center
pnpm.cmd dev:all
```

Команда `pnpm.cmd dev:all` запускает API и Tauri вместе.

Если порт `3001` занят, значит API уже запущен и его нужно остановить.

Если PostgreSQL не запущен или API не видит `DATABASE_URL`, экран может показать:

```text
Materials request failed: 500
```

Это известная dev-проблема запуска, не ошибка UI.

Позже нужно сделать более удобный запуск и нормальное сообщение об ошибке.

## Future architecture notes

Будущие роли: `admin`, `manager`, `designer`, `production`, `accountant`, `viewer`.

В будущем нужны авторизация, пользователи, роли, права доступа, audit log и история действий.

Будущая навигация: Главная панель, Заказы, Чат / Сообщения, Ozon, Клиенты, Расчёты, Производство, Оплаты, Доставка, Товары, Настройки.

Внутри настроек: Материалы и закупочные цены, Пользователи и роли, Интеграции, Способы оплаты, Способы доставки, Справочники, Системные настройки.

Заказы с сайта должны идти по схеме:

```text
diez-site -> API -> diez-data-core -> diez-control-center
```

Сайт не должен хранить реальные заказы только во frontend/sessionStorage.

Будущий чат сайта должен обслуживаться из ПК-приложения через API и общую базу.

В `diez-data-core` позже могут понадобиться миграции для users/roles, customers, orders, order files, conversations/messages, payments и audit log.

На текущем этапе не создавать эти миграции без отдельного проектирования.

## Versioning rule

Версии программы должны фиксироваться здесь и в `CHANGELOG.md`.
