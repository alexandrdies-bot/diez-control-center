# Changelog

## 0.0.0 — 2026-05-29

### Added

* Зафиксирован первый успешный server launch: VPS, PostgreSQL, миграции, минимальные seeds, nginx, SSL, systemd, сайт и API.
* Зафиксирован временный private-access режим: сайт и API закрыты Basic Auth на nginx до завершения настройки и production-hardening.
* Зафиксирована процедура временного SSH deploy-доступа через отдельный development key без сохранения секретов в репозитории.
* Добавлен первый endpoint `POST /orders` для сохранения локального desktop draft-order в общую базу.
* Добавлен API transaction helper для атомарного создания заказа, позиций, доставки и события.
* Добавлена защита от дублей заказов по `source='desktop'` и `source_ref`.
* В desktop добавлена кнопка `Завершить приём заказа`: заказ создаётся через `POST /orders` только после явного действия менеджера, без автосохранения после первой позиции; localStorage draft при этом не удаляется.
* После завершения приёма заказа серверный номер `ORD-...` из `serverOrderNumber` показывается в карточке ленты и деталях заказа.
* Зафиксировано правило: dev/test заказы не должны попасть в production, а первый реальный production-заказ должен начинаться с чистой дневной нумерации `ORD-YYYYMMDD-000001`.
* Добавлен `DELETE /orders/:id` для удаления уже созданного заказа через корзину; несохранённые черновики по-прежнему удаляются только из localStorage.
* Добавлены read-only endpoints `GET /orders` и `GET /orders/:id`, а также desktop API client methods `getOrders()` и `getOrder(orderId)` для будущей загрузки заказов из общей базы.
* Добавлен первый API auth/session layer: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; Basic Auth и текущие order guards пока остаются без изменений.
* Добавлен production-safe CLI bootstrap `pnpm --filter @diez/api bootstrap:admin` для ручного создания первого auth-пользователя без хранения пароля в репозитории, `.env` или seed.
* `GET /orders` и `GET /orders/:id` защищены bearer auth session guard для ролей `manager`/`admin`; write/delete guards пока не менялись.
* В desktop API client добавлены `login`, `logout`, `getCurrentUser` и bearer helpers без изменения UI, localStorage-ленты и текущих `x-api-key` flows.
* Добавлен desktop online-mode MVP: default API URL `https://api.diezimg.ru`, login/logout UI, раздел `Заказы` из общей базы через Bearer token и раздел `Черновики` только для незавершённых локальных черновиков.
* Desktop online login переведён на рабочую схему телефон + 4-значный код; backend `/auth/login` сохраняет совместимость с прежним `login/password` payload.
* Добавлен MVP-режим `Запомнить это устройство`: сохранённая desktop session проверяется через `GET /auth/me`, код и production secrets не сохраняются.
* Для production API CORS зафиксирован dev origin `http://127.0.0.1:5173`, чтобы локальный desktop мог проверять online-mode через `api.diezimg.ru`.
* Startup проверки `/health` и `/materials` в desktop сделаны не блокирующими для login/online orders.
* Добавлен публичный site checkout endpoint `POST /checkout/orders`: checkout-заказы сайта сохраняются в общую базу с `source='checkout'` и событием `actor_type='site'`, без использования desktop `POST /orders`.
* Добавлен MVP order attachments: API endpoints для upload/list/download/preview вложений заказа через Bearer manager/admin auth и desktop UI с карточками 3:5, authenticated preview и download.
* Ручной блок `Работа менеджера` убран из desktop UI, чтобы не усложнять работу менеджеров; текущий экран заказа оставляет заявку, контакты, позиции, сумму, файлы и кнопку добавления позиции. API статусов и комментариев (`PATCH /orders/:id/status`, `POST /orders/:id/comments`) остаётся техническим заделом, а статусы позже должны частично автоматизироваться по реальным действиям. DB schema/migrations не менялись.
* Добавлен desktop-помощник `Подготовить оплату`: он формирует текст для клиента по сумме заказа и вариантам `счёт`, `QR-код`, `ссылка на оплату`, `оплата при получении`. Помощник ничего автоматически не отправляет, не сохраняет данные в DB, не использует SMS; основной ручной канал отправки остаётся MAX, резервный — email.
* Добавлен backend API-слой Ozon Pay Checkout без UI: `POST /orders/:id/payments/ozon`, `GET /orders/:id/payments`, `POST /orders/:id/payments/:paymentId/sync` и `POST /payments/ozon/webhook`. Ozon secrets остаются только в server env, при ненастроенном env endpoints отвечают `OZON_ACQUIRING_NOT_CONFIGURED`, webhook нужно открыть через nginx отдельным шагом; SMS, личный кабинет и автоматическая смена статусов заказа не добавлялись.
* Добавлена защита удаления заказа с Ozon-оплатой: `DELETE /orders/:id` возвращает `ORDER_HAS_OZON_PAYMENT`, чтобы не потерять связь заказа и финансового следа. Ozon cancel/refund пока не реализованы и не вызываются.
* Добавлена защита редактирования заказа с Ozon-оплатой: при изменении состава/суммы заказа активные неоплаченные оплаты `created`/`pending` автоматически отменяются через Ozon `cancelOrder`, новая оплата автоматически не создаётся, а `authorized`/оплаченные/финансово значимые оплаты блокируют изменение заказа до будущего workflow доплат/возвратов.
* Выполнены Phase 0 pre-fixes перед CDEK: desktop mapping больше не превращает сохранённый `delivery_mode='cdek'` в `manual`, а обычный `PATCH /orders/:id` сохраняет существующую delivery-сумму и provider-summary поля доставки вместо обнуления будущих CDEK-данных. CDEK API, credentials, env и миграции не добавлялись.
* Добавлен backend skeleton `GET /cdek/status` для manager/admin: endpoint показывает безопасный статус CDEK-конфига, missing env names, test/prod base URL и `tokenStatus='not_requested'` без раскрытия секретов. Реальные CDEK HTTP-запросы, OAuth token, расчёт, отправления, shipment-таблицы и env-файлы не подключались.
* Добавлены manager/admin backend proxy endpoints `GET /cdek/cities` и `GET /cdek/delivery-points` для справочников СДЭК. OAuth token запрашивается только при вызове этих endpoints, кешируется в памяти и не возвращается клиентам; ответы нормализуются для Desktop. Расчёт, отправления, shipment-таблицы, миграции и Desktop UI не менялись.
* Добавлен manager/admin backend endpoint `POST /orders/:id/delivery/cdek/calculate` для расчёта одного тарифа СДЭК через `/v2/calculator/tariff`. Endpoint только проверяет существование заказа, запрашивает расчёт у CDEK при включённом/настроенном config и возвращает нормализованный результат; заказ, суммы доставки, shipment-таблицы, миграции, Desktop UI и Ozon-flow не менялись.
* Уточнён response CDEK calculation endpoint: нормализованный результат теперь явно содержит `notSaved: true` и alias `priceMinor = totalSumMinor ?? deliverySumMinor`, при этом исходные `deliverySumMinor` и `totalSumMinor` сохранены.
* В desktop API client добавлены wrappers для backend CDEK endpoints: status, city search, delivery points и calculation. UI не менялся, wrappers пока не вызываются из `main.tsx`, Desktop не ходит напрямую в СДЭК и не хранит CDEK secrets.
* В desktop delivery panel добавлен компактный CDEK UI-блок для manager calculation: backend status, поиск города, список ПВЗ, tariffCode, габариты/вес, кнопка расчёта и результат с пометкой `Расчёт не сохранён в заказ`. UI использует только backend wrappers, не сохраняет CDEK calculation в заказ, не меняет суммы заказа, shipment tables и Ozon-flow.
* Добавлен backend endpoint `PATCH /orders/:id/delivery/cdek` для сохранения выбранной СДЭК-доставки в `app.order_delivery` и суммы доставки в `app.orders.delivery_total_minor` с пересчётом `total_price_minor`. Endpoint не вызывает CDEK API, не создаёт отправления, не использует shipment tables, отменяет active Ozon payments через существующий cancellation flow при финансовом изменении и блокирует final/financial Ozon payments.
* Desktop CDEK delivery panel подключён к save endpoint: добавлена отдельная кнопка `Сохранить доставку`, success/result block со стоимостью доставки и итогом заказа, а также сообщения про отменённую active Ozon payment или блокировку final payment. Desktop по-прежнему ходит только в backend API, не создаёт CDEK shipment и не создаёт новую Ozon payment.
* Зафиксирована граница CDEK flow: текущий Desktop сохраняет только предварительную доставку для пересчёта суммы заказа и подготовки оплаты. Реальное отправление СДЭК, трек, накладная, документы и этикетки не создаются; отдельный workflow `Создать отправление в СДЭК` остаётся будущим этапом.
* Desktop CDEK delivery panel получил выбор города отправителя и пункта отправки через существующие backend справочники. Расчёт теперь требует выбранный sender city и sender PVZ/office, передаёт `fromLocation.code` из выбранного города и `shipmentPointCode` из выбранного пункта отправки. Shipment creation, DB migrations, shipment tables, Ozon-flow и прямые CDEK calls из Desktop не добавлялись.
* Исправлен provider payload CDEK calculator: публичный Desktop/API payload по-прежнему использует `currencyCode='RUB'`, но в запрос `/v2/calculator/tariff` backend теперь отправляет numeric `currency=1`, как ожидает СДЭК. DB, Ozon-flow, shipment tables и Desktop UI не менялись.
* Добавлен CDEK tariff selection перед расчётом: backend endpoint `POST /cdek/tariffs` запрашивает `/v2/calculator/tarifflist` и возвращает нормализованный список тарифов, а Desktop panel позволяет подобрать и выбрать тариф перед `Рассчитать СДЭК`. Hardcoded `136` больше не является обязательным вариантом; расчёт использует выбранный `tariffCode`. Shipment creation, save delivery, DB migrations и Ozon-flow не менялись.
* Исправлено соответствие CDEK OpenAPI для calculator payload: `/v2/calculator/tarifflist` больше не использует поле `type` как delivery mode `1/2/3/4`; режим ПВЗ/склад задаётся через `shipment_point` и `delivery_point`. Calculation response shape, Desktop UI, DB, shipment lifecycle и Ozon-flow не менялись.
* Исправлен prefill формы редактирования сохранённой CDEK-доставки: Desktop сохраняет `delivery.providerPayload` в draft state и при повторном открытии формы восстанавливает город/ПВЗ получателя, тариф, стоимость, срок, габариты, sender point code и saved-state без автопересчёта, повторного save или CDEK API calls. Для будущих сохранений в provider payload дополнительно кладутся sender city и shipment point summary, если UI эти данные знает.
* CDEK delivery UI приведён к рабочему summary-first виду: сохранённая доставка сначала показывается компактной карточкой с маршрутом, тарифом, стоимостью, сроком и грузом, а полная форма открывается только по изменению/пересчёту. Статус СДЭК стал маленькой технической строкой, списки городов/ПВЗ/тарифов ограничены по высоте и сворачиваются после выбора. Backend business logic, DB, Ozon, shipment и CDEK provider calls не менялись.
* CDEK edit/new flow больше не строится вокруг скрытых городов и отдельных кнопок выбора. Форма оформлена как рабочий блок доставки: `Маршрут`, `Груз`, `Тарифы`, `Расчёт и сохранение`; город отправителя и город получателя видны как поля ввода сразу, а результаты появляются dropdown-списком под активным полем. Backend/API contracts, Ozon, DB, shipment и provider calls не менялись.
* Исправлен CDEK edit mode для уже сохранённой доставки: кнопка `Изменить СДЭК-доставку` теперь заново гидратирует форму из сохранённого provider payload, открывает её в заполненном свёрнутом состоянии и держит только один активный picker. Input/list городов, пунктов и тарифов не раскрываются автоматически, а сохранённая доставка остаётся отмеченной как сохранённая до реального изменения данных.
* CDEK delivery UI переработан в форму оформления доставки по логике личного кабинета: сохранённая доставка остаётся отдельной summary-карточкой, edit/new mode начинается с блока `Маршрут` с видимыми полями городов, затем идут `Груз`, `Тарифы`, `Расчёт и сохранение`. ПВЗ/пункты открываются только в активном выборе, а тарифы показываются карточками после заполнения маршрута и груза. Backend/API contracts, CDEK provider calls, DB, Ozon и shipment не менялись.
* CDEK city/PVZ UI доработан до autocomplete/select поведения: город отправителя и получателя ищутся автоматически с debounce и dropdown под input, point/PVZ открываются как select-like поля с loading/empty states внутри dropdown, тариф выбирается из select-like карточек. Большие кнопки `Найти`, `Показать ПВЗ`, `Сменить пункт` не используются как основной интерфейс; backend/API contracts, CDEK provider calls, DB, Ozon и shipment не менялись.
* CDEK dropdown UI доведён до overlay-поведения: city/point/PVZ/tariff списки больше не растягивают форму, ПВЗ/пункты получили локальный поиск по адресу и счётчик показанных пунктов, а тарифы отображаются вертикальным списком с ценой справа и кодом тарифа как вторичным текстом. Desktop больше не ограничивает видимые ПВЗ/тарифы первыми несколькими строками; backend/API contracts, CDEK provider calls, DB, Ozon и shipment не менялись.
* Блок `Тарифы` в CDEK delivery UI больше не открывается dropdown-карточками: режимы `Откуда`/`Куда доставить` показаны как chips, текущий сценарий `из ПВЗ -> в ПВЗ` активен, неподдержанные варианты disabled, а тарифы выводятся постоянным вертикальным списком с названием, сроком, ценой справа и muted `#code`. Backend/API contracts, CDEK provider calls, DB, Ozon и shipment не менялись.
* CDEK tariff list теперь подгружается автоматически, когда маршрут и груз заполнены, с защитой fingerprint от повторных запросов на тот же route/cargo. Основной список показывает PVZ→PVZ/`склад-склад` тарифы и сортирует `Посылка`, `Экспресс`, `Магистральный экспресс`, `Супер-экспресс` выше прочих; остальные provider варианты доступны в свернутом блоке `Другие варианты`. Выбор тарифа использует цену/срок из tariff list response для расчётного состояния без отдельного обязательного клика `Рассчитать СДЭК`.
* В карточке заказа СДЭК-доставка показывается отдельной визуальной строкой под товарными позициями и отдельной строкой в итогах `Позиции / Доставка / Итого`, но не добавляется в `order_items` и не получает товарные кнопки удаления/редактирования. Backend business logic, API contracts, DB, CDEK/Ozon calls и shipment lifecycle не менялись.
* Изменена бизнес-логика Ozon payment после финансового изменения заказа: active Ozon payment при изменении суммы может отменяться, но новая Ozon Pay ссылка автоматически не создаётся. Если изменились товарные позиции при сохранённой доставке, delivery помечается как `needsReview`, создание новой ссылки блокируется до перепроверки/сохранения доставки, а менеджер запускает оплату вручную. Final/financial payments по-прежнему блокируют изменение. DB/migrations, Ozon API contracts, shipment и CDEK provider calls не менялись.
* Для диагностики отсутствующего тарифа `Посылка склад-склад` backend `POST /cdek/tariffs` теперь пишет безопасный structured log нормализованного ответа: counts, tariff code/name/mode/error flags, presence `#136`/`Посылка` и склад-склад counts. Секреты, Authorization, OAuth token, raw env, raw provider request/response и персональные данные не логируются.
* Добавлен customer auth v1: регистрация заказчика по телефону и 4-значному коду, хранение кода только как hash, отдельные customer sessions и отделение от manager/admin auth.
* Зафиксирована модель личного кабинета заказчика как временного рабочего пространства для выполнения, обсуждения и доработки заказов, а не вечного файлового архива.
* Зафиксирована временная заморозка публичного личного кабинета заказчика: заявки остаются без обязательной регистрации, основной канал ответа клиенту — MAX, резервный канал — email, телефон используется для звонка при необходимости, а `app.customer_accounts`, `app.customer_sessions`, customer auth/profile/orders API и retention-поля остаются заделом на будущее.
* Экран `Настройки -> Клиенты -> Личные кабинеты заказчиков` убран из ПК-программы на время заморозки публичного кабинета; `Пользователи и доступ` остаётся только для пользователей ПК-программы.
* Добавлены retention-поля для будущей политики хранения; `retention_locked` означает запрет будущей автоочистки для постоянных клиентов, рекламных агентств и важных заказчиков.
* Зафиксировано, что автоочистка файлов/кабинетов пока не включена, файлы и заказы не удаляются автоматически, а будущая очистка должна быть отдельной задачей с dry-run/report.
* Временная блокировка редактирования созданного заказа снята для рабочего MVP-режима: позиции, заказчика и доставку снова можно менять в UI; серверная синхронизация правок через `PATCH` будет отдельным этапом.
* Улучшено отображение карточки заказа и деталей заказа для менеджера; серверная логика не менялась, загрузка ленты из production-БД пока не реализуется для dev/test базы.
* Desktop-лента теперь разделяет `Заказы` из общей базы и локальные незавершённые `Черновики`, чтобы созданный заказ не дублировался в ленте.
* Добавлена MVP production protection для API: CORS allowlist через env, write key для `POST /orders` и `DELETE /orders/:id`, admin key для `PATCH /materials/:id/pricing-inputs`; dev режим остаётся открытым даже при наличии локальных ключей.
* Зафиксировано, что полный CRUD заказов, оплаты и СДЭК пока не реализованы.
* Создан начальный каркас проекта `diez-control-center`.
* Зафиксирована роль проекта как главной ПК-программы экосистемы «Диез Имидж».
* Зафиксирован принцип единой базы данных через `diez-data-core`.
* Добавлены правила работы с Codex.
* Добавлено правило рекомендуемого уровня интеллекта Codex.
* Документированы готовые MVP-1 API read-only endpoints.
* Зафиксировано подключение PostgreSQL через `DATABASE_URL` из локального `.env`.
* Добавлен Tauri 2 desktop shell.
* Зафиксировано, что приложение открывается как Windows desktop window.
* Зафиксировано, что React/Vite остаётся frontend-слоем внутри Tauri.
* Зафиксировано, что desktop пока показывает shell и API health.
* Добавлен временный MVP-экран "Материалы".
* Зафиксировано, что экран "Материалы" работает внутри Tauri desktop window.
* Зафиксировано чтение данных через API endpoint GET /materials.
* Зафиксировано, что PostgreSQL должен быть запущен через `diez-data-core` Docker.
* Проверено 158 материалов.
* Проверено, что поиск по материалам работает.
* Зафиксировано, что экран "Материалы" read-only и временный.
* Зафиксирован текущий dev workflow запуска desktop-программы.
* Добавлена инструкция `docs/DEV_RUN.md`.
* Зафиксирована известная dev-проблема `Materials request failed: 500`, если PostgreSQL не запущен или API не видит `DATABASE_URL`.
* Уточнено, что `diez-control-center` — единый головной центр управления экосистемой «Диез Имидж», а не справочник материалов.
* Зафиксированы будущие направления: заказы, сайт, Ozon, товары, расчёты, материалы, клиенты, оплаты, доставка, производственные статусы, интеграции и настройки.
* Зафиксировано, что главный рабочий экран в будущем должен быть "Заказы".
* Зафиксировано, что Ozon и расчёты должны быть отдельными будущими модулями.
* Зафиксировано, что текущий экран "Материалы" — временный технический MVP-экран для проверки связки Desktop UI -> API -> PostgreSQL.
* Зафиксировано, что материалы в будущем будут внутренним справочником для расчётов, а текущий MVP остаётся read-only и безопасным.
* Добавлена документация `docs/ACCESS_AND_ROLES.md`.
* Зафиксировано, что desktop-программа должна работать как клиент к общей системе, а не как локальная программа одного ПК.
* Зафиксировано, что один пользователь сможет работать с нескольких ПК.
* Зафиксированы будущие роли: admin, manager, designer, production, accountant, viewer.
* Зафиксирована будущая навигационная модель с разделами: Главная панель, Заказы, Ozon, Клиенты, Расчёты, Товары, Материалы и цены, Производство, Оплаты, Доставка, Интеграции, Настройки, Пользователи и роли.
* Зафиксировано, что доступ должен идти через API, а desktop-приложение не должно хранить пароль PostgreSQL.
* Зафиксированы будущие требования безопасности: авторизация, пользователи, роли, права доступа, audit log и история действий.
* Уточнено, что текущий экран "Материалы" — временный MVP-экран, а в будущей навигации он должен быть перенесён в `Настройки -> Материалы и цены`.
* Зафиксировано, что материалы и закупочные цены нужны для расчётов, себестоимости и контроля цен.
* Зафиксировано, что "Материалы и цены" — служебный раздел, в первую очередь для admin.
* Зафиксировано, что обычный менеджер не должен случайно менять закупочные цены.
* Зафиксировано, что "Заказы" — главный будущий рабочий раздел, а Ozon и расчёты должны быть отдельными рабочими разделами.
* Зафиксировано, что редактирование закупочных цен в будущем должно идти через историю цен и audit log.
* Добавлена документация `docs/SITE_ORDERS_AND_CHAT.md`.
* Зафиксировано, что заказы с сайта должны попадать в общую систему и отображаться в `diez-control-center`.
* Зафиксировано, что сайт не должен хранить реальные заказы только во frontend/sessionStorage.
* Зафиксирована схема `diez-site -> API -> diez-data-core -> diez-control-center`.
* Зафиксировано, что будущий чат сайта должен обслуживаться из ПК-приложения через API и общую базу.
* Зафиксировано, что Ozon должен быть отдельным каналом заказов/сообщений.
* Зафиксировано, что материалы остаются служебным разделом настроек.
* Зафиксировано, что миграции заказов, клиентов, сообщений и диалогов не создавать без отдельного проектирования.
* Создан draft будущей модели заказов и чата `docs/FUTURE_ORDERS_AND_CHAT_MODEL.md`.
* Зафиксированы будущие сущности заказов, клиентов, диалогов, сообщений, ролей и прав без создания миграций.
* Зафиксирован архитектурный план будущих миграций `diez-data-core` без SQL-кода.
* Создана модель будущей навигации `docs/NAVIGATION_MODEL.md`.
* Зафиксированы будущие основные разделы: Главная панель, Заказы, Чат / Сообщения, Ozon, Клиенты, Расчёты, Производство, Оплаты, Доставка, Товары, Настройки.
* Зафиксирован состав раздела настроек: Материалы и закупочные цены, Пользователи и роли, Интеграции, Способы оплаты, Способы доставки, Справочники, Системные настройки.
* Зафиксировано, что текущий экран "Материалы" должен быть перенесён в `Настройки -> Материалы и закупочные цены`.
* Зафиксирована будущая видимость разделов по ролям без реализации в коде.
* Зафиксировано правило трёх главных файлов документации: `README.md`, `PROJECT_VERSION.md`, `CHANGELOG.md`.
* Зафиксировано, что `docs/` используется для больших подробных документов, чтобы не раздувать основные файлы.
* Добавлен список документов из `docs/` в `README.md` с кратким назначением каждого файла.
* Документация консолидирована в 3 главных файла: `README.md`, `PROJECT_VERSION.md`, `CHANGELOG.md`.
* Папка `docs` удалена.
* Важные правила из `docs` перенесены в `README.md` и `PROJECT_VERSION.md`.
* В `README.md` перенесены назначение программы, архитектура, dev-запуск, Codex workflow, навигация, роли, сайт-заказы-чат, материалы как часть настроек, будущая модель заказов/чата, политика версий и обновлений.
* В `PROJECT_VERSION.md` перенесён текущий статус: Tauri desktop shell готов, API read-only готов, экран "Материалы" временный, главный будущий экран — `Заказы`, сайт-заказы-чат-Ozon — будущие ключевые модули.
* Добавлена команда `pnpm.cmd dev:all` для совместного запуска API и Tauri в dev-режиме.
* Добавлена dev-зависимость `concurrently` для комбинированного dev-запуска.
* Зафиксировано, что PostgreSQL Docker пока запускается отдельно через `diez-data-core`.
* Зафиксировано, что если порт `3001` занят, нужно остановить уже запущенный API.
* Зафиксирован persistent Tauri dev workflow: не перезапускать `pnpm.cmd dev:tauri`, если окно `Диез Имидж Control Center` уже открыто.
* Зафиксировано, что для UI-правок Codex должен выполнять `pnpm.cmd check` и `pnpm.cmd --filter @diez/desktop build`, а пользователь смотрит изменения в уже открытом окне.
* Зафиксировано, что полный перезапуск Tauri выполняется только после закрытия окна пользователем и отдельного разрешения.
* Зафиксировано правило работы с отдельным чатом `Data Base 02` для всех вопросов общей базы, миграций, seed-данных, заказов, клиентов, доставок, оплат, товаров, материалов и цен.
* Добавлена заготовка role-aware UI с mock-ролью `admin`.
* Зафиксировано, что сейчас показывается полная версия интерфейса для `admin mock`.
* Зафиксировано, что будущие роли будут скрывать лишние разделы и данные после добавления авторизации и прав доступа.
* Зафиксирован приоритет разработки: сначала бизнес-система `Диез Имидж`, а Ozon — будущий модуль/канал внутри общей системы `diez-control-center -> API -> diez-data-core`.
* Уточнено, что Ozon не первый этап реализации, но должен учитываться при проектировании общей главной панели, навигации и UI как канал внутри общей системы.
* Зафиксирован краткий вывод draft-отчёта `orders-model-draft.md`: `diez-data-core` пока не готова к реальным заказам, первыми нужны будущие таблицы источников, статусов, клиентов, заказов, позиций, истории статусов и событий.
* Зафиксирован самый безопасный MVP заказов: минимальный read/write API для создания заказа, snapshot расчёта в `order_items.calculation_data`, read-only отображение в `diez-control-center`, без Ozon, оплат, доставок и реального чата на первом шаге.
* Зафиксирован вывод аудита конструктора сайта для будущей офисной версии в `diez-control-center`.
* Зафиксировано, что офисная версия конструктора должна быть адаптацией для менеджера, а не копией клиентского UI сайта.
* Зафиксирован главный принцип: сайт и ПК-программа должны быть разными интерфейсами к общей базе `diez-data-core`, общему API и общему расчётному ядру.
* Зафиксировано, что формула расчёта, геометрия, материалы, LED, борт, лицо, себестоимость, specs, правила цены и snapshot расчёта должны быть общими для сайта и ПК-программы.
* Зафиксировано, что `src/lib/pricing/light-letter.ts`, `geometry-analysis.ts`, `text-layout.ts` и `production-svg.ts` являются кандидатами для общего направления конструктора, а `board-tape-options.ts` и `face-film-options.ts` должны постепенно перейти на API/БД.
* Зафиксирован вывод `constructor-parity-test-plan.md`: перед офисной версией конструктора нужны parity tests между сайтом и ПК-программой.
* Зафиксировано, что одинаковый input должен давать одинаковую geometry, pricing breakdown и итоговую цену.
* Зафиксировано, что нельзя сравнивать только итоговую цену: нужно сверять себестоимость, материалы, площадь, периметр, LED, борт, лицо, плёнку, отходы, работу, накладные и итоговый breakdown.
* Зафиксированы первые fixtures конструктора: `simple-light-text-diez-300`, `simple-non-light-text-diez-300`, `face-film-red-text-diez-300`.
* Зафиксировано правило: сначала создать baseline fixtures текущего сайта, а уже потом выделять shared pricing/core.
* Создан пакет `packages/shared` с именем `@diez/shared`.
* В `@diez/shared` добавлены только типы/контракты будущего общего ядра конструктора.
* Зафиксировано, что формула расчёта пока не перенесена, сайт пока не подключён к `@diez/shared`, а ПК-программа пока не использует `@diez/shared` для расчёта.
* Зафиксировано, что `@diez/shared` — безопасная подготовка к общему расчётному core, а следующий шаг позже — переносить pure-логику маленькими частями и сверять по baseline fixtures.
* Старый локальный пакет `@diez/shared` удалён из `diez-control-center`.
* Зафиксировано, что общие контракты расчёта теперь живут в `diez-shared-core/packages/calculation-core`.
* Зафиксировано, что дублей shared-контрактов в `diez-control-center` больше нет.
* Зафиксировано, что `diez-control-center` пока не подключён к новому пакету `@diez/calculation-core`.
* Зафиксировано актуальное состояние `diez-shared-core` как отдельного общего проекта для shared-кода, будущих расчётов, контрактов, future API contracts и общих типов заказов, клиентов и Ozon.
* Зафиксирован текущий состав `packages/calculation-core`: `light-letter.ts`, `geometry-analysis.ts`, `serializable-shape.ts`, `shape-adapters.ts`.
* Зафиксировано, что desktop UI и реальные расчёты пока не используют shared-формулу напрямую.
* Зафиксирован следующий этап: подключить `diez-control-center` к `@diez/calculation-core`, сделать офисный конструктор на общем расчётном ядре и сохранить возможность offline cache.
* API технически подключён к `@diez/calculation-core` через локальную file dependency.
* Добавлен временный import-check файл `apps/api/src/calculation-core-import-check.ts`.
* Зафиксировано, что UI и реальные расчёты пока не изменены.
* Добавлен diagnostic endpoint `GET /health/calculation-core`.
* Endpoint проверяет, что API может импортировать `@diez/calculation-core`; это не рабочий расчёт и не подключение конструктора.
* Добавлен временный debug endpoint `GET /debug/calculation/fixtures/:fixtureId`.
* Endpoint проверяет 3 baseline fixtures: `simple-light-text-diez-300`, `simple-non-light-text-diez-300`, `face-film-red-text-diez-300`.
* Endpoint читает baseline fixture и сверяет доступный расчёт через shared-core по сохранённой geometry.
* Hardcoded Windows path к constructor fixtures удалён из API; локальный путь теперь задаётся через `CONSTRUCTOR_FIXTURES_DIR`, fallback — `apps/api/fixtures/constructor`.
* Зафиксировано, что endpoint не является production API, а полный расчёт из text input ждёт shared text-layout/serializable shape adapter.
* Зафиксировано архитектурное правило `server-first + local cache/offline fallback`.
* Зафиксировано, что главным источником истины остаются сервер, API и общая база `diez-data-core`, а ПК-программа не должна становиться главным источником данных.
* Зафиксировано, что в будущем ПК-программа может хранить локальную рабочую копию материалов, закупочных цен, specs, правил расчёта, версии расчётного ядра и временных черновиков заказов.
* Зафиксировано будущее версионирование `calculator-core version`, `materials dataset version`, `pricing rules version` и `last sync date`.
* Зафиксировано, что сайт всегда должен работать через сервер/API, локальный кэш ПК-программы не должен становиться отдельной независимой базой, а офлайн-заказы должны быть локальными черновиками до синхронизации.

### Not changed

* Сайт `diez-site` не изменялся.
* База `diez-data-core` не изменялась.
* Миграции не создавались.
* Зависимости не устанавливались.

## Office order workflow decisions

### Documented

- `+ Новый заказ` starts with service selection.
- The active service is `ОБЪЁМНЫЕ БУКВЫ`.
- Future services include DTF printing, wide-format printing, and other services as needed.
- The app must not open the customer form or constructor before service selection.
- `ОБЪЁМНЫЕ БУКВЫ` is documented as a separate office calculation screen, not a copy of the customer site UI.
- The service header format is `< | ОБЪЁМНЫЕ БУКВЫ`.
- The back arrow returns to service selection; `Закрыть` is not needed inside the service screen.
- The left `Лента` is documented as a future feed for order/draft cards, messages, tasks, and events, not as a menu and not as a position list.
- The future draft flow is documented: calculate service, add position, update draft card in feed, open details later.
- Office board tape selection is documented as color, width, and thickness from real material data.
- Customer-site board tape restrictions must not be used as hidden office restrictions.
- `diez-data-core` remains the material source of truth.
- DTF is documented as an active office service that uses `@diez/calculation-core/print` from `diez-shared-core`.
- Added the first desktop `DTF-ПЕЧАТЬ` service screen in `+ Новый заказ`.
- The DTF screen supports width, height, quantity, A3 `300×400 мм` preset, unit price, total price, and local draft position creation.
- The desktop DTF flow does not copy the customer `/dtf` page and does not create a separate formula.
- Shared formula rule is documented: site and desktop must not keep separate formula copies.

### Not changed

- Code was not changed.
- UI was not changed.
- `diez-site` was not changed.
- `diez-shared-core` was not changed.
- `diez-data-core` was not changed.
- Migrations were not created.

## Customer response channels

* SMS-уведомления исключены из текущего плана: SMS-провайдер, SMS API, платные SMS и имя отправителя сейчас не подключаются и не планируются без отдельного нового решения.
* В DTF и будущих заявках клиент не выбирает SMS; основной канал ответа — MAX, резервный — email, телефон используется для звонка при необходимости.

## Future MAX AI assistant integration

### Documented

- MAX is documented as a future communication channel for an AI assistant, not a fixed script-only bot.
- Future flow is documented: MAX message/file intake -> backend/API persistence -> AI analysis -> desktop manager workspace with dialog, attachments, and draft request/order.
- The desktop app must not listen to MAX directly; MAX must integrate through backend/API webhooks so messages are not lost when a manager PC is off.
- Future AI capabilities are documented: request type detection, order parameter extraction, draft replies, draft requests/orders, and clarification questions.
- AI operation stages are documented: manager-reviewed draft replies, simple autonomous answers with manager handoff, and draft order assembly.
- AI provider must be replaceable: OpenAI API, DeepSeek API, local Ollama/local model later.
- The module is documented as future work only.

### Not changed

- Code was not changed.
- UI was not changed.
- `diez-site` was not changed.
- `diez-shared-core` was not changed.
- `diez-data-core` was not changed.
- Migrations were not created.

## API production build and debug route protection

### Added

- Added `build` script for `apps/api`: `tsc -p tsconfig.build.json`.
- Added `start` script for `apps/api`: `node dist/server.js`.
- Added `apps/api/tsconfig.build.json` for production TypeScript emit.

### Changed

- Debug calculation endpoints are now registered only outside production by default.
- `DEBUG_ENDPOINTS_ENABLED=true` can explicitly enable debug calculation endpoints.
- Constructor debug fixture path is now configured through `CONSTRUCTOR_FIXTURES_DIR`; fixtures are not a production dependency and the API no longer points at a hardcoded local Windows site output path.
- Constructor debug fixture path is now configured through `CONSTRUCTOR_FIXTURES_DIR`; fixtures are not a production dependency and the API no longer points at a hardcoded local Windows site output path.

### Not changed

- No deployment was performed.
- Desktop UI was not changed.
- `diez-site` was not changed.
- `diez-shared-core` was not changed.
- `diez-data-core` was not changed.
- Migrations were not created.
- `.env` was not changed.





## Desktop back icon unification

### Changed

- Desktop back action now uses the shared `chevron-left.svg` icon from `diez-shared-core`.
- Back buttons are styled as a frameless icon action without background, border, box-shadow, or button frame.
- Service back navigation keeps the same behavior for `ОБЪЁМНЫЕ БУКВЫ` and `DTF-ПЕЧАТЬ`.

### Not changed

- Calculation logic was not changed.
- Desktop API logic was not changed.
- `diez-site`, `diez-data-core`, and `diez-shared-core` were not changed.

## Desktop bundled back icon asset

### Changed

- Copied `chevron-left.svg` from `diez-shared-core/assets/svg` into `apps/desktop/src/assets/svg`.
- Desktop now imports the back icon as a local Vite-bundled asset.
- Back icon styling remains frameless and no longer depends on runtime access to the sibling `diez-shared-core` project.

### Not changed

- Calculation logic was not changed.
- Desktop API logic was not changed.
- `diez-site`, `diez-data-core`, and `diez-shared-core` were not changed.

## Office constructor layout file actions

### Changed

- Added compact `Загрузить макет` and `Скачать макет` actions to the office `ОБЪЁМНЫЕ БУКВЫ` screen.
- Copied `file-upload.svg` and `file-download.svg` from `diez-shared-core/assets/svg` into desktop local bundled assets.
- The upload action opens an SVG file picker placeholder; production import/export is reserved for the next office workflow step.

### Not changed

- Calculation logic was not changed.
- Desktop API logic was not changed.
- `diez-site`, `diez-data-core`, and `diez-shared-core` were not changed.

## Desktop settings structure

### Changed

- The settings gear now opens a main `Настройки` screen.
- Moved the existing materials table behind the `Материалы и цены` settings card.
- Added disabled future settings cards for `Расчёты`, `Заказы`, `Интеграции`, and `Пользователи и доступ`.
- Added frameless back navigation from `Материалы и цены` to the main settings screen.

### Not changed

- Materials still come from the current API/data-core source.
- Database and migrations were not changed.
- Calculation logic was not changed.
- Desktop API logic was not changed.

## Materials and prices directory UI

### Changed

- Reworked `Материалы и цены` into a readable office directory screen.
- Added category filter chips based on loaded material categories.
- Simplified the materials table: material, category, parameters, unit, price, and status.
- Hid raw material ID from the main table and kept it only in the selected-material details card.
- Added readable purchase price formatting without long decimal values.
- Improved the selected-material card with category, unit, status, purchase data, and parameters.

### Not changed

- Material data still comes from the current API/data-core source.
- Editing materials was not added.
- API, database, seeds, and migrations were not changed.
- Calculation logic was not changed.

## Materials inline price editing

### Added

- Added inline editing for existing purchase prices in the `Материалы и цены` table.
- Added API update support for existing active material pricing input records.
- Added desktop API client support for saving edited purchase prices.

### Changed

- Removed the selected-material details card from the main materials screen.
- The materials table now uses the full available content width.
- Edited prices update the current table after a successful API save.

### Not changed

- The updated database field is limited to `app.material_pricing_inputs.purchase_price_minor`.
- New pricing input records are not created from the UI.
- Material categories, units, specs, seeds, migrations, and calculation formulas were not changed.

## Activity feed panel cleanup

### Changed

- Simplified the left `Лента` panel.
- Removed static `ДИЕЗ ИМИДЖ`, `Control Center`, and explanatory feed text.

## Local draft order receiving

### Added

- Added temporary frontend/MVP order receiving mode.
- Added local draft order persistence in `localStorage` under `diez-control-center:draft-orders`.
- Added draft statuses `receiving` and `awaiting-details`.
- Added left-feed draft order cards with position count, total, and readable status.
- Added draft detail actions to add another position to the current receiving draft and finish order receiving.
- Added quick check and trash icon actions to the left-feed draft card.
- Added customer and delivery indicators to the left-feed draft card.
- Added local customer and delivery panels opened from the draft card indicators.

### Changed

- Feed order cards now use the customer name/phone or `Заказчик не заполнен` as the main title instead of generic `Черновик заказа`.
- Feed order cards now show a short summary from the first order position.
- Draft statuses are displayed as readable order statuses: `заказ в приёме` and `ждёт оформления`.
- Displayed order status now reflects actual local order completeness: `без позиций`, `нужен заказчик`, `нужна доставка`, or `оформлен`.
- Draft order details now show compact customer and delivery summaries above the positions list.
- Removed the manual `Завершить приём заказа` action from the local MVP order flow.
- `+ Новый заказ` now moves the active `receiving` draft to `awaiting-details` before starting a new service selection flow.
- Adding positions from `ОБЪЁМНЫЕ БУКВЫ` and `DTF-ПЕЧАТЬ` now updates the active local draft order instead of a volatile screen-only item list.
- The check icon finishes order receiving locally; the trash icon deletes the local draft after confirmation.
- Desktop draft action icons are imported as bundled SVG assets.
- Draft order item actions now use bundled pencil/trash SVG icons instead of text buttons.
- Customer and delivery indicators read from the current localStorage draft-order model and use bundled `user`, `truck`, and `truck-off` icons.
- Customer and delivery edits save only to the `diez-control-center:draft-orders` localStorage MVP state.
- Draft order customer and delivery summary cards now show bundled thematic icons and pencil edit actions instead of text actions.
- Draft order details were tightened visually so customer, delivery, positions, and total stay compact without long service notes.
- The customer phone field now normalizes typing and pasted values to `+7 XXX XXX XX XX`.
- Delivery mode now supports `not-required`, `manual`, and future disabled `cdek`.
- Existing localStorage `required` delivery mode is normalized to `manual`.
- The delivery panel now shows `Доставка не требуется`, `Ручная доставка`, and disabled `СДЭК позже`.
- CDEK remains a future backend/API integration; no CDEK API, tokens, database writes, or migrations were added.

### Not changed

- Full order CRUD, payments, and delivery provider persistence are not implemented yet.
- `localStorage` remains temporary frontend storage until the manager explicitly creates the order through `POST /orders`.
