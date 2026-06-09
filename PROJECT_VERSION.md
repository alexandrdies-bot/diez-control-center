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

Главная панель мониторинга создана.

Добавлена заготовка переключения контекста `Диез Имидж / Ozon`.

Текущий Ozon UI — только заготовка, без реальной интеграции.

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

## Development priority

Главный приоритет разработки — бизнес-система `Диез Имидж`.

В первую очередь программа должна развиваться вокруг заказов `Диез Имидж`, заказов с сайта, клиентов, чата сайта, расчётов, производства, оплат, доставки, товаров, материалов и закупочных цен как служебной части настроек.

Ozon — важный будущий модуль программы, но не первый этап разработки.

Цель Ozon-модуля — максимально заменить ежедневную работу в `seller.ozon.ru`: получать и обрабатывать Ozon-заказы, работать с товарами Ozon, контролировать остатки, поставки, возвраты, финансы и сообщения/вопросы покупателей, если это будет доступно через API.

Ozon не должен быть отдельной независимой программой или отдельной базой.

Ozon должен быть большим модулем/каналом внутри общей системы:

```text
diez-control-center -> API -> diez-data-core
```

Первый этап реализации — `Диез Имидж`, но Ozon должен учитываться уже при проектировании главной панели, навигации и общей архитектуры.

`Главная` должна быть общей панелью мониторинга по всем каналам. В будущем на главной должны быть данные и по `Диез Имидж`, и по `Ozon`.

Будущая логика главной:

```text
Главная = общий мониторинг: сайт Диез Имидж + заказы + чат + производство + оплаты + доставка + Ozon заказы + Ozon сообщения + Ozon остатки + Ozon поставки + Ozon финансы.
```

Ozon не первый этап реализации, но его нельзя игнорировать при проектировании UI.

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
* `POST /orders`
* `DELETE /orders/:id`

`POST /orders` добавлен как первый write endpoint для создания заказа из локального desktop draft-order в общей PostgreSQL-базе через API. Desktop не пишет в PostgreSQL напрямую.

Создание заказа выполняется в транзакции, а повторная отправка защищена проверкой `source='desktop'` + `source_ref`.

Desktop вызывает `POST /orders` только после явного действия менеджера `Завершить приём заказа`. Автосохранение после первой позиции не используется: пока менеджер добавляет позиции, заказ остаётся локальным черновиком.

После успешного создания заказа серверный номер `ORD-...` из `serverOrderNumber` показывается в карточке ленты и деталях заказа.

Текущие заказы в dev/test базе считаются тестовыми. Перед production launch нужна чистая production-база или отдельная подтверждённая очистка тестовых заказов; рабочий `order_number` должен начинаться с чистой дневной нумерации `ORD-YYYYMMDD-000001`.

Сохранённый заказ можно удалить через корзину: desktop вызывает `DELETE /orders/:id`, а затем убирает локальную карточку. Несохранённый черновик удаляется только из `localStorage`.

В рабочем MVP-режиме временная блокировка редактирования созданного заказа снята: позиции, заказчика и доставку можно менять в UI. Полноценная серверная синхронизация правок через `PATCH` будет отдельным этапом.

Карточка заказа в ленте и экран деталей улучшены для менеджера: показываются номер заказа, заказчик, телефон, краткое содержание позиций, итог и статус. Серверная логика не менялась; загрузка ленты из production-БД пока не реализуется, потому что текущая БД dev/test.

Добавлена MVP production protection для API: в production CORS работает через `CORS_ALLOWED_ORIGINS`, `POST /orders` и `DELETE /orders/:id` защищаются `API_WRITE_KEY`, а `PATCH /materials/:id/pricing-inputs` защищается `ADMIN_API_KEY`. Dev режим остаётся открытым, если ключи не заданы.

Полный CRUD заказов, оплаты и СДЭК пока не реализованы.

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

## Persistent Tauri dev workflow

Во время разработки пользователь может держать Tauri-приложение открытым.

Если окно `Диез Имидж Control Center` уже открыто, Codex не должен запускать `pnpm.cmd dev:tauri` повторно.

Повторный запуск может дать ошибку доступа к `target/debug/diez-control-center.exe`.

Для UI-правок Codex должен менять файлы и выполнять:

* `pnpm.cmd check`
* `pnpm.cmd --filter @diez/desktop build`

Пользователь сам смотрит изменения в уже открытом окне.

Если нужен полный перезапуск, пользователь сам закрывает окно приложения и разрешает запуск заново.

## Future architecture notes

Будущие роли: `admin`, `manager`, `designer`, `production`, `accountant`, `viewer`.

В будущем нужны авторизация, пользователи, роли, права доступа, audit log и история действий.

Сейчас UI работает в режиме `admin mock`.

Это полная версия интерфейса без скрытия разделов.

В будущем роли будут скрывать лишние разделы и данные.

Права доступа будут определены позже.

Дизайнер, менеджер, производство, бухгалтерия и viewer не должны видеть всё, что видит `admin`.

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

## Data Base 02 workflow

По вопросам базы данных используется отдельный чат `Data Base 02`.

В него нельзя отправлять прямую Codex-задачу с командами, файлами и инструкциями “создай миграцию / выполни / закоммить”.

Нужно описывать бизнес-цель, причины, затронутые проекты, ожидаемые данные, ограничения, вопросы для проверки и желаемый результат. `Data Base 02` анализирует `diez-data-core` и формирует отдельное корректное задание для Codex.

Все задачи по заказам, клиентам, доставке, оплатам, товарам, материалам, ценам, миграциям, seed-данным и структуре БД сначала проходят через `Data Base 02`. Главный проект базы — `D:\_ProjectHome\diez-data-core`; отдельную независимую базу под desktop, сайт или модуль не создавать без отдельного решения.

## Future orders model summary

Архитектурный вывод: текущая база `diez-data-core` пока не готова к реальным заказам.

В базе уже есть материалы, товары, услуги, цены и specs.

В базе пока нет клиентов, заказов, позиций заказа, статусов, событий, файлов и чата.

Заказы сайта нельзя хранить только во frontend/sessionStorage.

Будущая схема заказов:

```text
diez-site / manual / phone / ozon_later -> API -> diez-data-core -> diez-control-center
```

Первый безопасный набор будущих таблиц:

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

Правила: номер заказа формирует backend/API, суммы хранятся в minor units, позиции заказа сохраняют snapshot названия, цены и расчёта, заказ из конструктора сохраняет `calculation_data` JSONB.

Чат сайта должен быть отдельной будущей моделью `conversations/messages`, а не просто комментариями заказа.

Ozon учитывать как будущий канал, но первый MVP заказов делать для `Диез Имидж`.

Реальные персональные данные нельзя класть в seed или GitHub.

Миграции пока не создавать без отдельного решения.

Самый безопасный MVP заказов: read/write API для создания минимального заказа с сайта или вручную; обязательные поля — источник, клиент/контакт, статус `new`, позиции, сумма, комментарий; `order_items.calculation_data` для snapshot расчёта; read-only отображение заказов в `diez-control-center`; смена статуса только после отдельного проектирования прав и audit/history; без Ozon, оплат, доставок и реального чата на первом шаге.

## Office constructor direction

Новая цель: в ПК-программе нужна офисная версия конструктора объёмных букв для приёма заказов менеджером в офисе.

Конструктор на сайте уже почти настроен для заказчика.

Офисная версия должна быть адаптацией для менеджера, а не копией клиентского UI сайта.

Главный источник данных и логики:

* общая база `diez-data-core`;
* общий API;
* общее расчётное ядро.

Сайт и ПК-программа должны быть разными интерфейсами к одной логике.

Общими должны быть формула расчёта, расчёт площади и периметра, расчёт материалов, LED, борта, лица, себестоимости, specs букв, справочники материалов, правила выбора материалов, правила цены и округления, модель snapshot расчёта.

Сайт не должен показывать себестоимость, закупочные цены и маржу.

ПК-программа должна считать внутри формы заказа, показывать внутренний breakdown для разрешённых ролей, сохранять расчёт как позицию заказа и связывать его с клиентом, заказом, комментариями и файлами.

Нельзя копировать формулу отдельно в desktop, делать отдельный расчёт для сайта и программы, хранить разные материалы в двух местах, показывать закупочные цены заказчику на сайте, переносить UI сайта один в один в офисную программу и сохранять реальные заказы только в `sessionStorage`.

Рекомендованный путь: не трогать рабочий сайт; не переносить `page.tsx` сайта целиком в desktop; сначала выделить общий расчётный контракт; подготовить parity tests/fixtures; потом делать офисную версию конструктора в форме заказа; до появления таблиц заказов не сохранять расчёт в базу; позже сохранять расчёт в `order_items.calculation_data` как snapshot.

Вывод аудита: `src/lib/pricing/light-letter.ts` — главное расчётное ядро с временными frontend-данными; `geometry-analysis.ts` — кандидат для shared/core; `text-layout.ts` полезен для общего layout/geometry, но зависит от browser/Three; `production-svg.ts` полезен для офисной версии и производства; `board-tape-options.ts` и `face-film-options.ts` дублируют данные базы и должны постепенно перейти на API/БД.

## Constructor parity tests

Перед переносом конструктора в офисную ПК-программу нужно подготовить parity tests.

Цель: сайт и офисная ПК-программа должны использовать одно расчётное ядро; одинаковый input должен давать одинаковую geometry, pricing breakdown и итоговую цену; нельзя сравнивать только итоговую цену, нужно сравнивать breakdown.

Сверять нужно итоговую цену, себестоимость, материалы, площадь, периметр, количество LED, стоимость LED, стоимость борта, стоимость лица, стоимость плёнки, отходы, работу, накладные и итоговый breakdown.

Первые fixtures:

* `simple-light-text-diez-300`;
* `simple-non-light-text-diez-300`;
* `face-film-red-text-diez-300`.

Правила: не копировать формулу в desktop, не менять расчёт без parity tests, не использовать реальные заказы как fixtures, не класть персональные данные клиентов в fixtures, не обновлять expected snapshots молча.

Текущий вывод: перед офисной версией конструктора нужно сначала создать baseline fixtures текущего сайта, а уже потом выделять shared pricing/core.

## diez-shared-core

В экосистеме создан отдельный общий проект:

```text
D:\_ProjectHome\diez-shared-core
```

Назначение: общий shared-код экосистемы, будущие общие расчёты, общие контракты, future API contracts и общие типы заказов, клиентов и Ozon.

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

Добавлен диагностический endpoint `GET /health/calculation-core`.

Endpoint проверяет, что API может импортировать `@diez/calculation-core`.

Это не рабочий расчёт и не подключение конструктора.

Добавлен временный debug endpoint `GET /debug/calculation/fixtures/:fixtureId`.

Endpoint проверяет 3 baseline fixtures:

* `simple-light-text-diez-300`;
* `simple-non-light-text-diez-300`;
* `face-film-red-text-diez-300`.

Endpoint читает baseline fixture и сверяет доступный расчёт через shared-core по сохранённой geometry.

Hardcoded Windows path к fixtures удалён из API: локальный путь теперь задаётся через `CONSTRUCTOR_FIXTURES_DIR`, а fallback остаётся внутри `apps/api/fixtures/constructor`.

Это не production API.

Полный расчёт из text input ждёт shared text-layout/serializable shape adapter.

Desktop UI и реальные расчёты пока не используют shared-формулу напрямую.

Следующий этап позже: использовать shared-core в офисном конструкторе на основе общего расчётного ядра и сохранить возможность offline cache.

## Server-first + local cache

Главный источник истины: сервер, API и общая база `diez-data-core`.

ПК-программа не должна быть главным источником данных, но должна уметь работать в офисе при временном обрыве интернета.

В будущем ПК-программа должна хранить локальную рабочую копию материалов, закупочных цен, specs, правил расчёта, версии расчётного ядра и временных черновиков заказов.

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

При запуске ПК-программа должна проверять сервер/API, скачивать новую версию данных/правил, если она есть, работать на последней локальной версии при недоступности сервера, показывать пользователю локальный режим расчёта и синхронизироваться после восстановления связи.

Сайт всегда должен работать через сервер/API.

Локальный кэш ПК-программы не должен становиться отдельной независимой базой.

Нельзя допустить расхождения формул сайта и ПК-программы.

Изменения расчёта должны иметь версию.

Заказы, созданные офлайн, должны стать локальными черновиками и синхронизироваться позже.

## Versioning rule

Версии программы должны фиксироваться здесь и в `CHANGELOG.md`.

## Current office order workflow direction

Current decision: `+ Новый заказ` starts with service selection, not with a customer form and not with a constructor.

Active service now: `ОБЪЁМНЫЕ БУКВЫ`.

Future services may include `DTF-ПЕЧАТЬ`, `ШИРОКОФОРМАТНАЯ ПЕЧАТЬ`, and other services.

`ОБЪЁМНЫЕ БУКВЫ` is an office calculation screen with text, height, lighting mode, board color, board width, board thickness, face color/film, 2D preview, price, and `Добавить позицию`.

Navigation inside the service uses `< | ОБЪЁМНЫЕ БУКВЫ`; the arrow returns to service selection. The `Закрыть` button is not needed inside the service screen. Checkout/customer details are not implemented at this stage.

The left `Лента` is not a menu. It is reserved for common order/draft cards, messages, tasks, and events. It should show the order draft as a whole, not separate positions.

Office board tape selection must use real available material data: color, width, and thickness. The office app must not inherit customer-site hidden restrictions. `diez-data-core` remains the material source of truth.

DTF pricing has moved to `diez-shared-core/packages/calculation-core`; the site uses it through `@diez/calculation-core/print`. Desktop DTF now uses the same shared formula as a separate service, without copying the customer `/dtf` page.

## Current DTF desktop status

`DTF-ПЕЧАТЬ` is active in `+ Новый заказ`.

The first office DTF screen includes width, height, quantity, the A3 `300×400 мм` preset, unit price, total price, and local draft position creation.

The calculation imports from `@diez/calculation-core/print`. Database saving and order checkout are not connected yet.

Formula rule: calculation formulas must live in one shared place, `diez-shared-core`, and must not be duplicated separately in site and desktop.

## Local draft order receiving status

The desktop app now keeps temporary frontend/MVP draft orders in `localStorage`.

Storage key:

```text
diez-control-center:draft-orders
```

Draft statuses:

- `receiving` — a manager is receiving an order and adding positions.
- `awaiting-details` — position receiving is finished and the draft waits for customer, delivery, and final order details.

The feed card is no longer headed by a generic `Черновик заказа` label. It uses:

- `customer.name`, then `customer.phone`, then `Заказчик не заполнен` as the main title;
- the first position title as a short order summary;
- `заказ в приёме` or `ждёт оформления` as the readable status line.

The readable status now also reflects missing order details:

- `без позиций` when no positions have been added;
- `нужен заказчик` when positions exist but customer data is missing;
- `нужна доставка` when customer exists but manual delivery has no address;
- `оформлен` when positions, customer, and delivery state are complete locally.

The draft detail screen includes compact customer and delivery summaries above the positions list.

The manual `Завершить приём заказа` action is no longer required for local MVP flow. Database/API persistence remains a separate future step.

The left-feed draft card includes quick bundled-icon actions:

- check icon: finish receiving and switch the draft to `awaiting-details`;
- trash icon: delete the local draft after confirmation.

The draft card also includes local customer and delivery indicators:

- `user.svg` is red until `customer.name` or `customer.phone` is filled;
- `truck.svg` is red while manual delivery is selected and address is empty;
- `truck.svg` is green when manual delivery is selected and address is filled;
- `truck-off.svg` is green when delivery is not required.

These indicators are now clickable. They open local draft panels for customer and delivery data, save back into `diez-control-center:draft-orders`, and do not call API or save to the database.

The customer phone field normalizes input to `+7 XXX XXX XX XX` and strips non-digit characters during typing or paste.

Delivery is still a temporary local MVP. The draft delivery mode now supports `not-required`, `manual`, and future `cdek`.

`manual` replaces the old `required` localStorage value; old saved drafts are normalized from `required` to `manual` when loaded.

CDEK is documented and visible as a disabled future option only. Real CDEK tariff calculation, pickup-point selection, shipment creation, and tracking must be connected later through backend/API, not directly from desktop. No CDEK API, tokens, migrations, or database writes are added now.

Customer and delivery edits operate on the temporary `localStorage` MVP state. Final order creation happens only through `POST /orders` after `Завершить приём заказа`.

`+ Новый заказ` starts with service selection. If the active draft is still `receiving`, the app automatically moves it to `awaiting-details` before starting a new service selection flow.

New positions for the current order should be added from the draft detail screen before pressing `Завершить приём заказа`. The order API is connected for creation only; full CRUD, payments, and CDEK are still not implemented.

## Future MAX + AI assistant integration

Future module: MAX must be a communication channel for an AI assistant, not a script-only bot with fixed questions and answers.

Planned flow:

```text
Клиент пишет в MAX
-> MAX-бот принимает сообщение / фото / файл
-> backend/API сохраняет обращение и вложения
-> AI-модуль анализирует сообщение
-> ПК-программа показывает менеджеру диалог, вложения и черновик заявки/заказа
```

Architecture decisions:

* MAX is the communication channel.
* AI is responsible for request analysis, draft replies, clarification questions, and draft order preparation.
* Backend/API and the shared database store messages, files, customers, and future draft orders.
* The desktop app is the manager workspace and must not listen to MAX directly.
* MAX integration must go through backend/API webhooks so messages are not lost when the manager PC is off.
* AI provider must be replaceable: OpenAI API, DeepSeek API, local Ollama/local model later.
* Do not hard-bind the system to one AI provider.

Planned AI modes:

```text
1 этап: ИИ готовит черновик ответа, менеджер проверяет и отправляет.
2 этап: ИИ сам отвечает на простые вопросы, сложные заявки передаёт менеджеру.
3 этап: ИИ помогает автоматически собирать черновик заказа.
```

Implementation is not started now; this is documented as a future module.

## API production readiness

`apps/api` now has production scripts:

```text
pnpm --filter @diez/api build
pnpm --filter @diez/api start
```

The build script uses `tsconfig.build.json` and emits compiled API files to `apps/api/dist`.

Debug calculation endpoints are disabled in production by default. They are available only when `DEBUG_ENDPOINTS_ENABLED=true` is set explicitly, or when `NODE_ENV` is not `production`.

Constructor debug fixtures are configured through optional `CONSTRUCTOR_FIXTURES_DIR`; fixtures are not a production dependency of the API.

This does not deploy the API. A full production env strategy is still required before real server deployment, including `DATABASE_URL`, `API_HOST`, and `API_PORT`.




## Desktop bundled SVG asset rule

Required desktop SVG icons are copied from `diez-shared-core/assets/svg` into `apps/desktop/src/assets/svg` and imported through Vite.

This keeps shared-core as the source of common icons while ensuring the final installed Tauri program works offline and does not depend on runtime access to a sibling repository.

## Office constructor layout actions

The `ОБЪЁМНЫЕ БУКВЫ` office screen now has manager-facing actions for layout files:

- `Загрузить макет`;
- `Скачать макет`.

These actions use local bundled SVG icons copied from `diez-shared-core/assets/svg`. Real import/export behavior is still a future office workflow. The public site must not expose the old debug SVG export button to customers.

## Settings screen status

The settings gear now opens the main `Настройки` screen instead of opening the materials table directly.

`Материалы и цены` is a settings subsection and keeps the existing read-only materials table, search, and selected material details. Future settings subsections are visible as disabled structure only: `Расчёты`, `Заказы`, `Интеграции`, and `Пользователи и доступ`.

Database, material source, API, and calculation logic were not changed.

## Materials directory UI status

`Материалы и цены` now uses a calmer directory layout:

- category chips filter the loaded materials;
- search remains available;
- the table hides raw ID as a main column;
- material rows show readable parameters and formatted purchase prices;
- the selected-material card shows category, unit, status, ID, purchase data, and parameters.

The screen is still read-only. API, database, seeds, migrations, and calculation logic were not changed.

## Materials inline price editing status

`Материалы и цены` now supports inline editing of existing purchase prices.

The edited database field is `app.material_pricing_inputs.purchase_price_minor`. The desktop app saves changes through the API and updates the current table without requiring an app reload.

Only existing active pricing input records are edited. New pricing records, material fields, categories, specs, seeds, migrations, and calculation formulas were not changed.
