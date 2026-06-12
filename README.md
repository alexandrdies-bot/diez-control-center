# Диез Имидж Control Center

Главная ПК-программа / внутренний центр управления экосистемой «Диез Имидж».

## Правило документации

В проекте должны остаться 3 основных файла документации:

* `README.md` — главная информация о проекте, назначение, архитектура, навигация, правила.
* `PROJECT_VERSION.md` — текущий статус, версия, что уже сделано, что дальше.
* `CHANGELOG.md` — история изменений по коммитам/этапам.

Важные решения сначала кратко фиксировать в этих 3 файлах.

Отдельную папку `docs/` не использовать без отдельного решения: подробные документы не должны раздувать проект и теряться отдельно от главных файлов.

## Назначение

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

Главный будущий рабочий экран — `Заказы`.

Ozon, расчёты, сайт-заказы и чат должны стать отдельными ключевыми модулями.

## Production server status

Первый серверный запуск выполнен: сайт доступен на `https://diezimg.ru`, API доступен на `https://api.diezimg.ru`, оба процесса запускаются через `systemd`, PostgreSQL развёрнут локально на VPS. Это рабочая server-база для дальнейшей настройки, но не означает завершённую production-готовность всех бизнес-модулей.

## Temporary private access

Первый server launch выполнен, но сайт и API временно закрыты Basic Auth на уровне nginx. Это сделано, чтобы посторонние посетители не могли пользоваться недоделанным сайтом и API до завершения настройки, отладки и production-hardening.

Без логина/пароля `https://diezimg.ru`, `https://www.diezimg.ru` и `https://api.diezimg.ru` возвращают `401 Unauthorized`. С корректным Basic Auth доступом сайт отвечает `200 OK`, а `https://api.diezimg.ru/health` отвечает `ok:true`.

Секреты Basic Auth хранятся только на сервере в `/etc/nginx/.htpasswd_diez` и не коммитятся. Логин/пароль Basic Auth нельзя фиксировать в `README.md`, `PROJECT_VERSION.md`, `CHANGELOG.md`, `outputs` или других файлах репозитория. Basic Auth — временная защита до готовности production/auth модели.

Текущий экран "Материалы" — временный технический MVP-экран только для проверки связки:

```text
Desktop UI -> API -> PostgreSQL
```

В будущем материалы должны быть перенесены в:

```text
Настройки -> Материалы и закупочные цены
```

Материалы и закупочные цены нужны для расчётов, себестоимости и контроля цен. Это служебный раздел, в первую очередь для `admin`; обычный менеджер не должен случайно менять закупочные цены.

## Приоритет разработки

Главный приоритет разработки — бизнес-система `Диез Имидж`.

В первую очередь программа должна развиваться вокруг:

* заказов `Диез Имидж`;
* заказов с сайта;
* клиентов;
* чата сайта;
* расчётов;
* производства;
* оплат;
* доставки;
* товаров;
* материалов и закупочных цен как служебной части настроек.

Ozon — важный будущий модуль программы, но не первый этап разработки.

Цель Ozon-модуля:

* максимально заменить ежедневную работу в `seller.ozon.ru`;
* получать и обрабатывать Ozon-заказы;
* работать с товарами Ozon;
* контролировать остатки;
* работать с поставками;
* смотреть возвраты;
* смотреть финансы;
* работать с сообщениями/вопросами покупателей, если это будет доступно через API.

Первым этапом остаётся `Диез Имидж`.

Ozon не должен быть отдельной независимой программой или отдельной базой. Ozon должен быть большим модулем/каналом внутри общей системы:

```text
diez-control-center -> API -> diez-data-core
```

Первый этап реализации — `Диез Имидж`, но Ozon нужно учитывать уже при проектировании главной панели, навигации и общей архитектуры.

`Главная` должна быть общей панелью мониторинга по всем каналам. В будущем на ней должны быть данные и по `Диез Имидж`, и по `Ozon`.

Пример будущей логики:

```text
Главная = общий мониторинг: сайт Диез Имидж + заказы + чат + производство + оплаты + доставка + Ozon заказы + Ozon сообщения + Ozon остатки + Ozon поставки + Ozon финансы.
```

Ozon не первый этап реализации, но его нельзя игнорировать при проектировании UI.

## Главное правило данных

Одна бизнес-система — одна общая база данных.

Центральная база данных находится здесь:

```text
D:\_ProjectHome\diez-data-core
```

Сайт находится здесь:

```text
D:\_ProjectHome\diez-site
```

`diez-control-center` не должен создавать отдельную независимую базу данных и не должен дублировать таблицы заказов, клиентов, товаров, цен, доставок или оплат.

Все изменения структуры общей базы должны проектироваться и выполняться в `diez-data-core`.

В `diez-control-center` нельзя создавать собственные миграции, которые расходятся с общей базой экосистемы.

## Правило работы с Data Base 02

По вопросам базы данных работает отдельный чат `Data Base 02`.

В `Data Base 02` нельзя писать Codex-задачу с командами, файлами для правки и прямыми инструкциями вроде “создай миграцию”, “выполни”, “закоммить”.

В этот чат нужно передавать бизнес-контекст: что нужно сделать, зачем, какие проекты и данные затрагиваются, какие ограничения важны, какие вопросы проверить и какой результат ожидается.

`Data Base 02` сам анализирует `diez-data-core`, правила базы и после этого формирует отдельное правильное задание для Codex.

Все задачи про заказы, клиентов, доставку, оплаты, товары, материалы, цены, миграции, seed-данные и структуру БД сначала обсуждать через `Data Base 02`, чтобы не создавать дубликаты и не нарушать общую базу.

Главный проект базы:

```text
D:\_ProjectHome\diez-data-core
```

Нельзя создавать отдельную независимую базу под desktop, сайт или отдельный модуль без отдельного решения.

## Архитектура

Desktop:

```text
Tauri 2 + React + TypeScript + Vite
```

API:

```text
Node.js + TypeScript + Fastify
```

База данных:

```text
PostgreSQL из D:\_ProjectHome\diez-data-core
```

Правильный доступ к данным:

```text
Desktop UI -> API -> PostgreSQL
```

PostgreSQL подключается только через `DATABASE_URL` из локального `.env`.

`.env` не коммитить.

Desktop-приложение не должно хранить пароль PostgreSQL, DB-секреты, токены доставок, ключи оплат или другие чувствительные данные.

## Текущий статус MVP

MVP-1 API read-only endpoints готовы:

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
* `POST /orders`
* `DELETE /orders/:id`

`POST /orders` — первый write endpoint для создания заказа из локального desktop draft-order в общей базе. Он вызывается только после явного действия менеджера `Завершить приём заказа`, работает через API-транзакцию, защищается от дублей по `source='desktop'` + `source_ref` и сохраняет заказ, позиции, заказчика, доставку и событие создания.

Автосохранение после первой добавленной позиции не используется: пока менеджер добавляет позиции, заказ остаётся локальным черновиком.

Полный CRUD заказов, оплаты, СДЭК и серверная история статусов пока не реализованы.

`DELETE /orders/:id` удаляет уже созданный заказ и связанные строки заказа через каскадные связи. Несохранённый локальный черновик удаляется только из `localStorage`.

`GET /orders` и `GET /orders/:id` добавлены как read-only endpoints для будущей загрузки заказов из общей базы. В desktop API client подготовлены методы `getOrders()` и `getOrder(orderId)`, но текущая лента заказов пока остаётся на `localStorage` и не заменяется серверной загрузкой.

Production API protection MVP:

- `CORS_ALLOWED_ORIGINS` задаёт explicit CORS allowlist в `NODE_ENV=production`;
- в dev режиме широкий CORS остаётся для удобной локальной разработки;
- `POST /orders` и `DELETE /orders/:id` требуют `API_WRITE_KEY` в header `x-api-key` только в production;
- `PATCH /materials/:id/pricing-inputs` требует `ADMIN_API_KEY` в header `x-api-key` только в production;
- это временная защита до полноценной auth-модели с пользователями, ролями и audit log.

### Тестовые заказы и production launch

Во время разработки ПК-программа может создавать тестовые заказы в dev/test базе. Эти записи не являются production-данными и не должны попасть в финальную production-базу.

Перед финальным запуском нужен отдельный подтверждённый этап: поднять чистую production-базу с миграциями без тестовых данных или выполнить проверенную очистку тестовых заказов из текущей базы. Очистку тестовых заказов нельзя делать случайно во время разработки.

Номер заказа формируется базой в формате `ORD-YYYYMMDD-000001`, где `YYYYMMDD` — дата создания заказа, а финальный блок — порядковый номер за день. Первый реальный production-заказ должен начинаться с чистой рабочей нумерации за день, например `ORD-YYYYMMDD-000001`.

Внутренний `id` PostgreSQL может не сбрасываться — это нормально. Менеджеру и клиенту виден рабочий `order_number`, а не внутренний технический id.

Tauri 2 desktop shell добавлен.

Приложение открывается как Windows desktop window.

React/Vite остаётся frontend-слоем внутри Tauri.

Временный экран "Материалы" работает внутри Tauri desktop window, читает данные через `GET /materials`, показывает 158 материалов и поддерживает поиск.

Экран read-only, временный и может быть перенесён/удалён позже.

## Запуск в dev-режиме

1. PostgreSQL:

```powershell
cd D:\_ProjectHome\diez-data-core
docker compose up -d postgres
docker compose ps
```

2. API + Desktop / Tauri:

```powershell
cd D:\_ProjectHome\diez-control-center
pnpm.cmd dev:all
```

Команда `pnpm.cmd dev:all` запускает API и Tauri вместе.

Если порт `3001` занят, значит API уже запущен и его нужно остановить.

Проверка API:

```text
http://127.0.0.1:3001/health/db
http://127.0.0.1:3001/materials
```

При необходимости API и Tauri можно запускать отдельно:

```powershell
cd D:\_ProjectHome\diez-control-center
pnpm.cmd dev:api
pnpm.cmd dev:tauri
```

Если PostgreSQL не запущен или API не видит `DATABASE_URL`, экран "Материалы" может показать:

```text
Materials request failed: 500
```

Это известная dev-проблема запуска, не ошибка UI. Позже нужен удобный launcher и нормальное сообщение об ошибке.

## Dev режим с открытым приложением

1. Один раз запустить базу.
2. Один раз запустить API.
3. Один раз запустить Tauri.
4. Дальше не перезапускать Tauri при каждой правке.
5. Для правок UI использовать hot reload / обновление Vite.

Во время разработки пользователь может держать Tauri-приложение открытым.

Если окно `Диез Имидж Control Center` уже открыто, Codex не должен запускать `pnpm.cmd dev:tauri` повторно.

Повторный запуск может дать ошибку доступа к `target/debug/diez-control-center.exe`.

Для UI-правок Codex должен менять файлы и выполнять:

```powershell
pnpm.cmd check
pnpm.cmd --filter @diez/desktop build
```

Пользователь сам смотрит изменения в уже открытом окне.

Если нужен полный перезапуск, пользователь сам закрывает окно приложения и разрешает запуск заново.

## Навигация

Навигация должна быть понятной для сотрудников и зависеть от роли пользователя.

Будущие основные разделы:

1. Главная панель
2. Заказы
3. Чат / Сообщения
4. Ozon
5. Клиенты
6. Расчёты
7. Производство
8. Оплаты
9. Доставка
10. Товары
11. Настройки

Внутри настроек:

* Материалы и закупочные цены;
* Пользователи и роли;
* Интеграции;
* Способы оплаты;
* Способы доставки;
* Справочники;
* Системные настройки.

Текущий экран "Материалы" временно находится на первом месте только для MVP-проверки.

В будущем главный рабочий экран должен быть `Заказы`.

## Доступ и роли

`diez-control-center` должен работать не как локальная программа на одном ПК, а как клиент к общей системе.

Один пользователь может установить программу на несколько ПК: дома, на работе, на ноутбуке или на дополнительном рабочем месте.

Все данные должны храниться в общей базе/API, а не локально внутри конкретного ПК.

Будущие роли:

* `admin` — все разделы, настройки, пользователи и роли, интеграции, материалы и закупочные цены.
* `manager` — заказы, клиенты, статусы, Ozon, чат, доставка, товары в рабочем режиме; без случайного изменения закупочных цен.
* `designer` — связанные заказы, макеты, файлы, задачи и сообщения по дизайну.
* `production` — производство, производственные статусы, материалы в режиме просмотра при необходимости.
* `accountant` — оплаты, счета, закрывающие документы, заказы в финансовой части.
* `viewer` — только просмотр разрешённых разделов.

В будущем нужны авторизация, пользователи, роли, права доступа, audit log и история действий.

Редактирование закупочных цен должно идти через историю цен и audit log.

Сейчас UI работает в режиме `admin mock`.

Это полная версия интерфейса без скрытия разделов.

В будущем роли будут скрывать лишние разделы и данные.

Права доступа будут определены позже.

Дизайнер, менеджер, производство, бухгалтерия и viewer не должны видеть всё, что видит `admin`.

## Заказы сайта, чат и Ozon

Заказы с сайта должны попадать в общую систему и отображаться в `diez-control-center`.

Сайт не должен хранить реальные заказы только во frontend/sessionStorage.

Правильная схема:

```text
diez-site -> API -> diez-data-core -> diez-control-center
```

Когда клиент оформляет заказ на сайте:

* заказ должен создаваться через API;
* заказ должен сохраняться в общей базе;
* заказ должен появляться в ПК-приложении;
* менеджер должен видеть источник заказа: сайт;
* заказ должен иметь статус, состав, контакты клиента, комментарии, файлы и макеты, если они есть.

Будущий чат сайта должен обслуживаться из ПК-приложения:

```text
Клиент на сайте -> сообщение -> API -> база -> ПК-приложение
Сотрудник в ПК-приложении -> ответ -> API -> база -> сайт
```

Для чата в будущем нужны conversation, message, customer, assigned_user, channel, message status, attachments, timestamps и audit/history.

Ozon также должен быть отдельным каналом заказов и сообщений.

Перед реальной интеграцией сайта нужны backend API для заказов, таблицы заказов, клиентов, сообщений/диалогов, авторизация сотрудников, права доступа и audit log.

На текущем этапе эти миграции не создавать без отдельного проектирования.

## Будущая модель заказов и чата

Сайт, Ozon и ручные заказы должны идти через API.

Данные должны сохраняться в `diez-data-core`.

ПК-программа должна отображать и обрабатывать эти данные.

Будущие сущности заказов:

* `customers`;
* `customer_contacts`;
* `customer_addresses`;
* `orders`;
* `order_items`;
* `order_statuses`;
* `order_status_history`;
* `order_events`;
* `order_files` / `attachments`;
* `order_sources`: site, ozon, manual, phone, messenger.

Будущие сущности чата:

* `conversations`;
* `conversation_participants`;
* `messages`;
* `message_attachments`;
* `message_statuses`;
* `assigned_user`;
* `channel`: site, ozon, manual.

Чат может быть связан с заказом, заказ может иметь несколько сообщений, сообщение может появиться до заказа как lead/заявка, а после оформления conversation может быть привязан к order.

В `diez-data-core` позже могут понадобиться отдельные миграции для users/roles, customers, orders, order files, conversations/messages, payments и audit log.

Сейчас не создавать таблицы, не менять сайт, не подключать реальный чат, не подключать Ozon, не делать авторизацию вслепую и не добавлять SQL без отдельного проектирования.

## Будущая модель заказов

Архитектурный вывод из draft-отчёта `orders-model-draft.md`: текущая база `diez-data-core` пока не готова к реальным заказам.

В базе уже есть материалы, товары, услуги, цены и specs, но пока нет клиентов, заказов, позиций заказа, статусов, событий, файлов и чата.

Заказы сайта нельзя хранить только во frontend/sessionStorage.

Будущая схема заказов:

```text
diez-site / manual / phone / ozon_later -> API -> diez-data-core -> diez-control-center
```

Первый безопасный набор будущих таблиц для заказов:

* `order_sources`;
* `order_statuses`;
* `customers`;
* `customer_contacts`;
* `orders`;
* `order_items`;
* `order_status_history`;
* `order_events`.

Опционально вторым шагом:

* `customer_addresses`;
* `order_files`.

Важные правила:

* номер заказа должен формироваться backend/API, а не frontend;
* суммы хранить в minor units;
* позиции заказа должны сохранять snapshot названия, цены и расчёта;
* заказ из конструктора должен сохранять `calculation_data` JSONB;
* чат сайта должен быть отдельной будущей моделью `conversations/messages`, а не просто комментариями заказа;
* Ozon учитывать как будущий канал, но первый MVP заказов делать для `Диез Имидж`;
* реальные персональные данные нельзя класть в seed или GitHub;
* миграции пока не создавать без отдельного решения.

Самый безопасный MVP заказов:

* read/write API для создания минимального заказа с сайта или вручную;
* обязательные поля: источник, клиент/контакт, статус `new`, позиции, сумма, комментарий;
* `order_items.calculation_data` для snapshot расчёта из конструктора;
* read-only отображение заказов в `diez-control-center`;
* смену статуса делать только после отдельного проектирования прав и audit/history;
* без Ozon, без оплат, без доставок, без реального чата на первом шаге.

## Офисная версия конструктора

В ПК-программе нужна офисная версия конструктора объёмных букв для приёма заказов менеджером в офисе.

Конструктор на сайте уже почти настроен для заказчика.

Офисная версия должна быть адаптацией для менеджера, а не копией клиентского UI сайта.

Главный источник данных и логики — не сайт и не ПК-программа отдельно, а:

* общая база `diez-data-core`;
* общий API;
* общее расчётное ядро.

Сайт и ПК-программа — разные интерфейсы к одной логике.

Между сайтом и ПК-программой должны быть общими:

* формула расчёта;
* расчёт площади и периметра;
* расчёт материалов;
* расчёт LED;
* расчёт борта;
* расчёт лица;
* расчёт себестоимости;
* specs букв;
* справочники материалов;
* правила выбора материалов;
* правила цены и округления;
* модель snapshot расчёта.

Сайт должен оставаться интерфейсом для заказчика: минимум служебных данных, без себестоимости, закупочных цен и маржи.

ПК-программа должна быть офисным интерфейсом менеджера: расчёт внутри формы заказа, внутренний breakdown для разрешённых ролей, сохранение расчёта как позиции заказа, связь с клиентом, заказом, комментариями и файлами.

Нельзя:

* копировать формулу отдельно в desktop;
* делать отдельный расчёт для сайта и программы;
* хранить разные материалы в двух местах;
* показывать закупочные цены заказчику на сайте;
* переносить UI сайта один в один в офисную программу;
* сохранять реальные заказы только в `sessionStorage`.

Рекомендованный путь:

1. Не трогать рабочий сайт.
2. Не переносить `page.tsx` сайта целиком в desktop.
3. Сначала выделить общий расчётный контракт.
4. Подготовить parity tests/fixtures, чтобы сайт и desktop считали одинаково.
5. Потом делать офисную версию конструктора в форме заказа.
6. До появления таблиц заказов не сохранять расчёт в базу.
7. Позже сохранять расчёт в `order_items.calculation_data` как snapshot.

Вывод аудита конструктора сайта:

* `src/lib/pricing/light-letter.ts` — главное расчётное ядро, но там есть временные frontend-данные;
* `geometry-analysis.ts` — кандидат для shared/core;
* `text-layout.ts` — полезен для общего layout/geometry, но имеет зависимости от browser/Three;
* `production-svg.ts` — потенциально полезен для офисной версии и производства;
* `board-tape-options.ts` и `face-film-options.ts` дублируют данные базы и должны постепенно перейти на API/БД.

## Parity tests конструктора

Перед переносом конструктора в офисную ПК-программу нужно подготовить parity tests.

Цель:

* сайт и офисная ПК-программа должны использовать одно расчётное ядро;
* одинаковый input должен давать одинаковую geometry, pricing breakdown и итоговую цену;
* нельзя сравнивать только итоговую цену;
* нужно сравнивать breakdown.

Что сверять:

* итоговую цену;
* себестоимость;
* материалы;
* площадь;
* периметр;
* количество LED;
* стоимость LED;
* стоимость борта;
* стоимость лица;
* стоимость плёнки;
* отходы;
* работу;
* накладные;
* итоговый breakdown.

Первые fixtures:

* `simple-light-text-diez-300`;
* `simple-non-light-text-diez-300`;
* `face-film-red-text-diez-300`.

Правила:

* не копировать формулу в desktop;
* не менять расчёт без parity tests;
* не использовать реальные заказы как fixtures;
* не класть персональные данные клиентов в fixtures;
* не обновлять expected snapshots молча.

Текущий вывод: перед офисной версией конструктора нужно сначала создать baseline fixtures текущего сайта, а уже потом выделять shared pricing/core.

## diez-shared-core

В экосистеме создан отдельный общий проект:

```text
D:\_ProjectHome\diez-shared-core
```

Назначение проекта:

* общий shared-код экосистемы;
* будущие общие расчёты;
* общие контракты;
* future API contracts;
* общие типы заказов, клиентов и Ozon.

В `diez-shared-core` создан пакет:

```text
packages/calculation-core
```

Текущий состав `calculation-core`:

* `light-letter.ts` — перенесённая формула расчёта объёмных букв;
* `geometry-analysis.ts` — перенесённый анализ геометрии;
* `serializable-shape.ts` — типы сериализуемой геометрии;
* `shape-adapters.ts` — контракты будущих адаптеров.

API технически подключён к `@diez/calculation-core` через локальную file dependency.

Сейчас используется только import-check файл `apps/api/src/calculation-core-import-check.ts`.

Добавлен диагностический endpoint:

```text
GET /health/calculation-core
```

Endpoint проверяет, что API может импортировать `@diez/calculation-core`.

Это не рабочий расчёт и не подключение конструктора.

Добавлен временный debug endpoint:

```text
GET /debug/calculation/fixtures/:fixtureId
```

Endpoint проверяет 3 baseline fixtures:

* `simple-light-text-diez-300`;
* `simple-non-light-text-diez-300`;
* `face-film-red-text-diez-300`.

Endpoint читает baseline fixture и сверяет доступный расчёт через shared-core по сохранённой geometry.

Путь к fixtures больше не захардкожен в API. Для локальной отладки его можно задать через `CONSTRUCTOR_FIXTURES_DIR`. Если переменная не задана, API использует fallback `apps/api/fixtures/constructor`; эта папка не является production-зависимостью и может отсутствовать.

Это не production API. Полный расчёт из text input ждёт shared text-layout/serializable shape adapter.

Desktop UI и реальные расчёты пока не используют shared-формулу напрямую.

Следующий этап позже:

* использовать `@diez/calculation-core` в рабочей логике;
* сделать офисный конструктор на основе общего расчётного ядра;
* сохранить возможность offline cache.

## Server-first + local cache

Главный источник истины:

* сервер;
* API;
* общая база `diez-data-core`.

ПК-программа не должна быть главным источником данных.

Но ПК-программа должна уметь работать в офисе даже при временном обрыве интернета.

В будущем ПК-программа должна хранить локальную рабочую копию:

* материалов;
* закупочных цен;
* specs;
* правил расчёта;
* версии расчётного ядра;
* временных черновиков заказов.

Если интернет/сервер недоступен, программа должна продолжить расчёт на последней успешно синхронизированной версии данных.

В будущем нужно версионировать:

* `calculator-core version`;
* `materials dataset version`;
* `pricing rules version`;
* `last sync date`.

Пример:

```text
calculator-core version: 1.0.3
materials dataset version: 2026-05-31-001
pricing rules version: 1.0.0
last sync: 2026-05-31 18:40
```

Поведение программы при запуске:

1. ПК-программа проверяет сервер/API.
2. Если есть новая версия данных/правил — скачивает.
3. Если сервер недоступен — работает на последней локальной версии.
4. Пользователь должен видеть, что расчёт идёт по локальной версии.
5. После восстановления связи программа синхронизируется.

Важно:

* сайт всегда должен работать через сервер/API;
* ПК-программа может иметь локальный кэш;
* локальный кэш не должен становиться отдельной независимой базой;
* нельзя допустить расхождения формул сайта и ПК-программы;
* изменения расчёта должны иметь версию;
* заказы, созданные офлайн, должны стать локальными черновиками и синхронизироваться позже.

## Versioning

Проект использует версии вида:

```text
MAJOR.MINOR.PATCH
```

Пример:

```text
0.1.0
```

Правила:

* `MAJOR` — большие несовместимые изменения.
* `MINOR` — новые возможности.
* `PATCH` — исправления ошибок.

Версия должна обновляться в:

* `PROJECT_VERSION.md`;
* `CHANGELOG.md`;
* будущем `package.json`;
* будущем desktop/app config.

## Update Policy

В будущем программа должна поддерживать понятные обновления версий без потери данных и без поломки общей базы.

Обновление программы не должно автоматически менять структуру `diez-data-core` без отдельного решения и миграции.

Перед выпуском версии нужно проверить:

* что сайт не сломан;
* что база не изменена случайно;
* что миграции, если они есть, находятся только в `diez-data-core`;
* что `CHANGELOG.md` обновлён;
* что `PROJECT_VERSION.md` обновлён.

Механизм автообновлений будет выбран позже после создания desktop-приложения. Пока автообновления не настраивать.

## Работа с Codex

Codex не должен придумывать архитектуру, бизнес-логику, модель базы или большие куски кода самостоятельно.

ChatGPT формулирует точное задание, Codex выполняет только указанное.

ChatGPT должен указывать рекомендуемый уровень интеллекта Codex для каждой задачи:

* Низкий — простая проверка, git status, чтение файла, короткий отчёт.
* Средний — создание документации, небольшие правки, простые конфиги.
* Высокий — код, архитектурные изменения, API, работа с несколькими файлами.
* Очень высокий — сложный аудит, миграции БД, расчёты, интеграции, критичные изменения.

Рекомендуемый интеллект Codex пишется перед блоком задания, отдельно от копируемого текста.

В чат нужно писать короткий итог: что сделано, какие файлы изменены, результат проверки, git status и commit hash, если был commit.

Если нужен длинный аудит, анализ, список файлов, отчёт или исследование проекта, Codex должен создать временный файл в `outputs` и в чат написать только путь к файлу.

Папка `outputs` предназначена для временных отчётов и рабочих файлов. `outputs/` не коммитить, кроме `outputs/.gitkeep`.

Codex не должен:

* самостоятельно менять архитектуру;
* создавать миграции без отдельного задания;
* менять `diez-site`;
* менять `diez-data-core`;
* писать длинные отчёты в чат;
* писать большие куски кода в чат;
* коммитить временные файлы из `outputs`.

## Структура проекта

```text
D:\_ProjectHome\diez-control-center
  apps
    desktop
    api
  packages
    shared
  outputs
```

## Границы текущего MVP

В рамках текущего MVP нельзя:

* менять сайт `diez-site`;
* менять базу `diez-data-core`;
* создавать миграции;
* писать данные через API;
* хранить реальные секреты в коде или desktop-клиенте.

## Office Order Workflow Decisions

### New order service selection

`+ Новый заказ` must start with service selection.

The currently active service is `ОБЪЁМНЫЕ БУКВЫ`.

Future services are added only when needed, for example:

- `DTF-ПЕЧАТЬ`;
- `ШИРОКОФОРМАТНАЯ ПЕЧАТЬ`;
- other services.

The app must not open the customer form or a constructor directly before a service is selected.

### ОБЪЁМНЫЕ БУКВЫ

`ОБЪЁМНЫЕ БУКВЫ` is a separate office calculation screen for one service.

The office UI does not have to copy the customer site one-to-one, but calculation behavior must use existing site/shared-core logic instead of handmade duplicate formulas.

The screen contains:

- text;
- height;
- lighting mode;
- board tape color;
- board tape width;
- board tape thickness;
- face color / film;
- 2D preview;
- price;
- `Добавить позицию`.

### Service navigation

Inside a service screen the header format is:

```text
< | ОБЪЁМНЫЕ БУКВЫ
```

The `<` arrow returns to service selection.

The `Закрыть` button is not needed inside the service screen.

The order оформлениe step is not implemented at this stage.

### Left feed

The left `Лента` panel is not a menu.

It is reserved for future:

- new orders;
- draft orders;
- messages;
- tasks;
- events.

The feed should show a common order/draft block, not a list of positions. Order details, positions, delivery, customer data, and checkout should open later from the order block.

### Positions and checkout

Current work is focused on calculation and adding a position.

Later flow:

1. Manager calculates a service.
2. Manager clicks `Добавить позицию`.
3. A common draft order card appears or updates in the left feed.
4. Clicking the card opens draft order details.
5. Details contain positions, editing, customer, delivery, and explicit order creation through `Завершить приём заказа`.

Full checkout, payments, and order CRUD are not implemented yet.

### Board tape in office UI

For office calculations board tape parameters are:

- color;
- width;
- thickness.

Unlike the customer site, the office app should show managers real available options from the material directory. Customer-site restrictions must not become hidden office restrictions.

The source of truth for materials is `diez-data-core`.

If an option does not exist in the data, it must not be manually drawn into the UI.

### DTF

The DTF formula from the site has been moved to the shared package:

```text
D:\_ProjectHome\diez-shared-core\packages\calculation-core
```

The site already uses the shared DTF formula through `@diez/calculation-core/print`.

The desktop app must use the same shared formula and must not keep a separate DTF formula copy.

The DTF screen in the desktop app will be added later as a separate service in service selection. Do not copy the customer `/dtf` site page one-to-one into the office app.

Office DTF needs a working calculation flow:

- size;
- quantity;
- price;
- total;
- add position.

### Shared formula rule

Calculation formulas must not be duplicated between the site and the desktop app.

Shared calculation code must live in `diez-shared-core`.

The site and desktop app must use the shared calculation layer. If a formula changes, it changes in one place.

## Office DTF Service

`DTF-ПЕЧАТЬ` is now active in the `+ Новый заказ` service selection.

The desktop screen is an office workflow, not a copy of the customer `/dtf` page. It currently supports:

- width;
- height;
- quantity;
- A3 `300×400 мм` preset;
- unit price;
- total price;
- adding a local draft order position.

The DTF calculation uses the shared package `@diez/calculation-core/print`.

The desktop app must not keep a separate DTF formula copy. DTF positions can be added to a local draft, and the final order is created through `POST /orders` only after `Завершить приём заказа`.

## Local Draft Order Receiving

The desktop app now has a temporary frontend/MVP order receiving mode.

Local draft orders are stored in `localStorage` under:

```text
diez-control-center:draft-orders
```

Draft statuses:

- `receiving` — the manager is receiving an order and adding positions;
- `awaiting-details` — positions are added and the draft is waiting for customer, delivery, and final order details.

In the left feed, draft order cards are shown as readable order cards rather than a generic `Черновик заказа` title:

- the card title is `customer.name`, then `customer.phone`, then `Заказчик не заполнен`;
- the short order summary is based on the first position title;
- the status is shown as `заказ в приёме` or `ждёт оформления`.

The visible order status is derived from the workflow status plus customer and delivery completeness:

- no positions -> `без позиций`;
- positions exist but customer is empty -> `нужен заказчик`;
- customer exists but manual delivery is empty -> `нужна доставка`;
- positions, customer, and manual delivery with address or not-required delivery -> `оформлен`;
- server order number exists -> `заказ создан`.

The draft details screen shows compact customer and delivery summaries above the positions list. The draft stays in `localStorage` until the manager explicitly finishes receiving the order.

When a manager adds a position from `ОБЪЁМНЫЕ БУКВЫ` or `DTF-ПЕЧАТЬ`, the app creates or updates the active local draft order and shows it in the left feed. The feed card remains available after switching sections or reopening the frontend.

The draft card has quick local actions:

- trash icon: deletes the local draft after confirmation.

The draft card also shows customer and delivery indicators from the local draft model:

- customer uses `user.svg` and is green when `customer.name` or `customer.phone` is filled;
- delivery uses red `truck.svg` when manual delivery is selected but empty;
- delivery uses green `truck.svg` when `delivery.mode` is `manual` and `delivery.address` is filled;
- delivery uses green `truck-off.svg` when `delivery.mode` is `not-required`.

The customer and delivery indicators are clickable. They open local draft panels for filling customer and delivery data:

- customer: name/company, phone, email, comment;
- delivery: not required, manual delivery, future CDEK, address, contact name, phone, comment.

The customer phone field automatically normalizes input to `+7 XXX XXX XX XX`; pasted text, extra spaces, `8...`, and `7...` numbers are converted to the same display format.

Current delivery is a temporary local MVP. Delivery modes are:

- `not-required` — delivery is not needed;
- `manual` — manual delivery with address/contact/phone/comment fields;
- `cdek` — future CDEK mode, visible as disabled UI only for now.

CDEK tariff calculation, pickup-point selection, shipment creation, and tracking must be implemented later through backend/API, not directly from the desktop app. No CDEK API, tokens, database persistence, or migrations are connected now.

The detail screen action `Завершить приём заказа` creates the order through `POST /orders` only when positions, customer, and delivery are complete. After success the draft stores `serverOrderId` and `serverOrderNumber`, shows `Заказ создан: ORD-...`, and keeps the local draft available. The server order number from `serverOrderNumber` is visible in the feed card and order details.

During the development MVP, a created order can still be edited in the desktop UI. Full server-side update synchronization through `PATCH` will be implemented as a separate stage, so current local edits are a temporary development workflow.

Order feed cards and order details are optimized for manager readability: they show the order number when available, customer, phone, positions summary, total, and status. This is a UI-only improvement; server logic and order persistence were not changed. Loading the feed directly from the production database is not implemented while the current database is dev/test.

The feed trash action has two modes: unsaved local drafts are removed from `localStorage`; saved orders call `DELETE /orders/:id` first and then remove the local draft card after successful API deletion.

If `+ Новый заказ` is pressed while the active draft is still `receiving`, the current draft is moved to `awaiting-details` and a new service selection flow starts.

Adding more positions to the current draft should happen through the draft detail screen before pressing `Завершить приём заказа`. Desktop still does not write to PostgreSQL directly; order creation goes through the API.

Read-only order loading is prepared at the API/client layer through `GET /orders`, `GET /orders/:id`, `getOrders()`, and `getOrder(orderId)`. The desktop feed is not switched from `localStorage` yet; server-loaded feed integration remains a separate next step.

## Future MAX + AI Assistant Integration

В будущем MAX должен быть не обычным скриптовым ботом с заранее записанными вопросами и ответами, а каналом общения с ИИ-помощником.

Правильная схема:

```text
Клиент пишет в MAX
-> MAX-бот принимает сообщение / фото / файл
-> backend/API сохраняет обращение и вложения
-> AI-модуль анализирует сообщение
-> ПК-программа показывает менеджеру диалог, вложения и черновик заявки/заказа
```

MAX — это канал связи. ИИ — мозг для разбора заявки и подготовки ответа. База/API — место хранения сообщений, файлов, клиентов и черновиков заказов. ПК-программа — рабочее место менеджера.

Будущие возможности:

* принимать сообщения клиентов из MAX;
* принимать фото, макеты и файлы;
* показывать обращения в ленте ПК-программы;
* автоматически определять тип заявки: объёмные буквы, DTF, широкоформатная печать, другой заказ, вопрос по оплате или доставке;
* выделять параметры заказа: текст, размер, количество, материал, цвет, сроки, комментарии;
* готовить черновик ответа клиенту;
* готовить черновик заявки/заказа для менеджера;
* задавать клиенту уточняющие вопросы.

Режимы работы ИИ:

```text
1 этап: ИИ готовит черновик ответа, менеджер проверяет и отправляет.
2 этап: ИИ может сам отвечать на простые вопросы, сложные заявки передаёт менеджеру.
3 этап: ИИ помогает автоматически собирать черновик заказа.
```

AI-провайдер должен быть заменяемым: OpenAI API, DeepSeek API, локальный Ollama / локальная модель позже. Систему нельзя жёстко привязывать только к одному ИИ-сервису.

Архитектурное правило: ПК-программа не должна напрямую слушать MAX. MAX должен приходить на backend/API через webhook/интеграцию. Если ПК менеджера выключен, сообщения не должны теряться. Все сообщения и вложения должны сохраняться через будущую общую систему заказов/клиентов.

Это future module. Реализация сейчас не выполняется.

## API Production Build

`apps/api` has production scripts:

```text
pnpm --filter @diez/api build
pnpm --filter @diez/api start
```

`build` compiles TypeScript from `apps/api/src` to `apps/api/dist`.

`start` runs:

```text
node dist/server.js
```

Debug calculation endpoints are disabled in production by default:

```text
/debug/calculation/simple-light-text-diez-300
/debug/calculation/fixtures/:fixtureId
```

They are registered only when:

```text
DEBUG_ENDPOINTS_ENABLED=true
```

or when `NODE_ENV` is not `production`.

Constructor debug fixtures are optional and configured through `CONSTRUCTOR_FIXTURES_DIR`. The API fallback is `apps/api/fixtures/constructor`, so production does not depend on `diez-site/outputs/constructor-fixtures` or any hardcoded local Windows path.

For real server deployment, production env strategy is still required. At minimum the API needs production values for `DATABASE_URL`, `API_HOST`, and `API_PORT`.

Deployment was not performed in this step.




## Desktop Bundled SVG Assets

Shared SVG icons are sourced from `diez-shared-core/assets/svg`.

For the installed Tauri desktop app, required icons must also have local bundled copies in:

```text
apps/desktop/src/assets/svg
```

Desktop UI imports SVG files from the local `src/assets/svg` folder through Vite, so icons are bundled into the final app and continue working offline.

Do not depend on internet URLs, public site paths, absolute Windows paths, or runtime filesystem access to `diez-shared-core` for icons inside the installed desktop program.

## Office Constructor Layout File Actions

The office `ОБЪЁМНЫЕ БУКВЫ` screen owns layout upload/download actions for managers.

Current state:

- `Загрузить макет` opens an SVG file picker placeholder;
- `Скачать макет` is reserved for the future production layout export;
- both actions use local bundled SVG icons copied from `diez-shared-core/assets/svg`;
- public site debug SVG export must not be shown to customers.

Real layout import/export will be connected as an office workflow later. Calculation logic is not changed by these actions.

## Desktop Settings Structure

The settings gear opens the main `Настройки` screen first.

Current settings structure:

- `Материалы и цены` opens the existing materials table and purchase pricing details;
- `Расчёты` is reserved for formula, coefficient, and calculation rule settings;
- `Заказы` is reserved for order statuses, sources, and workflow settings;
- `Интеграции` is reserved for site, API, MAX, payments, and external services;
- `Пользователи и доступ` is reserved for roles, permissions, and cost visibility.

The materials table still uses the current API/data-core source. Materials, pricing data, database schema, and calculation logic are not changed by the settings navigation.

## Materials And Prices Directory

`Материалы и цены` is displayed as an office materials directory, not as a raw database dump.

The directory UI shows:

- category chips built from loaded material categories;
- search across material names, categories, units, descriptions, and visible parameters;
- simplified table columns: material, category, parameters, unit, purchase price, and status;
- formatted purchase prices such as `5 100 ₽`;
- a readable selected-material card with category, unit, status, ID, purchase data, and parameters.

The screen remains read-only. Material data and purchase pricing still come from the current API/data-core source. Editing, seeds, migrations, API changes, and calculation changes are not part of this screen update.

## Materials Price Inline Editing

`Материалы и цены` supports inline editing of existing purchase prices in the table.

Rules:

- clicking an existing price opens an inline ruble input;
- `Enter` or blur saves the changed price;
- `Esc` cancels editing;
- invalid values are not saved;
- only existing `app.material_pricing_inputs.purchase_price_minor` records are updated;
- materials without pricing input records are not auto-created from the UI.

The update is saved through the API into the shared data-core database. Other material fields, categories, units, specs, seeds, migrations, and calculation formulas are not changed.
