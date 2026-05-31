# Future Orders and Chat Model

Draft будущей модели заказов и чата для `diez-control-center` и `diez-data-core`.

Этот документ не является миграцией и не содержит SQL-кода.

## Текущий контекст

`diez-control-center` — будущий единый головной центр управления экосистемой «Диез Имидж».

Главный будущий рабочий раздел программы — "Заказы".

Текущий экран "Материалы" — временный MVP-экран для проверки связки:

```text
Desktop UI -> API -> PostgreSQL
```

Материалы остаются служебным разделом `Настройки -> Материалы и цены`.

В `diez-data-core` уже есть базовые справочники и таблицы для материалов, товаров, услуг, цен и specs:

* `app.units`;
* `app.material_categories`;
* `app.materials`;
* `app.material_pricing_inputs`;
* `app.material_roll_specs`;
* `app.material_sheet_specs`;
* `app.material_liquid_specs`;
* `app.material_bulk_specs`;
* `app.service_categories`;
* `app.services`;
* `app.service_prices`;
* `app.product_categories`;
* `app.products`;
* `app.product_prices`;
* `app.light_letter_specs`.

Таблиц заказов, клиентов, диалогов и сообщений пока нет.

## 1. Общий принцип

Сайт, Ozon и ручные заказы должны идти через API.

Данные должны сохраняться в `diez-data-core`.

ПК-программа должна отображать и обрабатывать эти данные.

Правильная схема:

```text
site / ozon / manual -> API -> diez-data-core -> diez-control-center
```

Сайт не должен хранить реальные заказы только во frontend/sessionStorage.

Desktop-приложение не должно напрямую хранить пароль PostgreSQL.

Доступ к данным должен идти через API.

## 2. Будущие сущности заказов

### customers

Клиент: человек или организация, связанная с заказами, диалогами, оплатами и доставкой.

Возможные поля:

* `id`;
* `customer_type`: person, company;
* `display_name`;
* `company_name`;
* `inn` / реквизиты, если понадобятся;
* `source`: site, ozon, manual, phone, messenger;
* `created_at`;
* `updated_at`.

### customer_contacts

Контактные данные клиента.

Возможные поля:

* `id`;
* `customer_id`;
* `contact_type`: phone, email, telegram, whatsapp, site_chat, ozon_chat;
* `value`;
* `is_primary`;
* `created_at`;
* `updated_at`.

### customer_addresses

Адреса клиента для доставки, самовывоза, документов или производства.

Возможные поля:

* `id`;
* `customer_id`;
* `address_type`: delivery, billing, pickup, other;
* `city`;
* `street`;
* `house`;
* `office`;
* `full_text`;
* `comment`;
* `created_at`;
* `updated_at`.

### orders

Основная сущность заказа.

Возможные поля:

* `id`;
* `order_number`;
* `customer_id`;
* `source`: site, ozon, manual, phone, messenger;
* `external_id`: внешний ID сайта/Ozon, если есть;
* `status_id`;
* `manager_user_id`;
* `designer_user_id`;
* `production_user_id`;
* `title`;
* `description`;
* `customer_comment`;
* `internal_comment`;
* `total_price_minor`;
* `currency_code`;
* `deadline_at`;
* `created_at`;
* `updated_at`.

### order_items

Состав заказа.

Позиция может ссылаться на товар, услугу, расчёт или быть ручной строкой.

Возможные поля:

* `id`;
* `order_id`;
* `item_type`: product, service, custom, calculation;
* `product_id`;
* `service_id`;
* `name`;
* `description`;
* `quantity`;
* `unit_id`;
* `unit_price_minor`;
* `total_price_minor`;
* `currency_code`;
* `source_payload`;
* `created_at`;
* `updated_at`.

### order_statuses

Справочник статусов заказов.

Примеры:

* new;
* in_review;
* waiting_customer;
* design;
* approved;
* production;
* ready;
* delivered;
* cancelled.

### order_status_history

История изменения статусов.

Возможные поля:

* `id`;
* `order_id`;
* `from_status_id`;
* `to_status_id`;
* `changed_by_user_id`;
* `comment`;
* `created_at`.

### order_events

Лента событий заказа.

События нужны для аудита и понятной истории обработки.

Примеры событий:

* заказ создан;
* заказ принят менеджером;
* статус изменён;
* добавлен файл;
* добавлен комментарий;
* создан расчёт;
* получена оплата;
* отправлено сообщение клиенту.

### order_files / attachments

Файлы заказа.

Возможные типы:

* макет;
* файл клиента;
* производственный файл;
* счёт;
* акт;
* фото готовой продукции;
* прочее вложение.

Файлы не должны храниться в базе как большие бинарные поля без отдельного решения.

Нужно отдельно выбрать хранилище файлов и хранить в базе метаданные и ссылки.

### order_sources

Справочник источников заказа:

* site;
* ozon;
* manual;
* phone;
* messenger.

Источник должен быть виден менеджеру в ПК-приложении.

## 3. Будущие сущности чата

### conversations

Диалог с клиентом или лидом.

Диалог может существовать до заказа.

Возможные поля:

* `id`;
* `customer_id`;
* `order_id`;
* `channel`: site, ozon, manual;
* `assigned_user_id`;
* `status`: open, waiting_customer, answered, closed;
* `created_at`;
* `updated_at`;
* `closed_at`.

### conversation_participants

Участники диалога.

Возможные участники:

* customer;
* employee;
* system;
* external_channel.

### messages

Сообщения в диалоге.

Возможные поля:

* `id`;
* `conversation_id`;
* `sender_type`: customer, employee, system;
* `sender_user_id`;
* `customer_id`;
* `body`;
* `status`: new, read, answered;
* `external_id`;
* `created_at`;
* `read_at`.

### message_attachments

Вложения сообщений.

Возможные поля:

* `id`;
* `message_id`;
* `file_name`;
* `mime_type`;
* `file_size`;
* `storage_key`;
* `public_url`;
* `created_at`.

### message_statuses

Статусы сообщений:

* new;
* read;
* answered.

### assigned_user

Ответственный сотрудник за диалог.

На уровне базы это может быть поле `assigned_user_id` в `conversations`.

### channel

Канал коммуникации:

* site;
* ozon;
* manual.

## 4. Связь заказов и чата

Чат может быть связан с заказом через `conversations.order_id`.

Заказ может иметь несколько сообщений через связанный `conversation`.

Сообщение может появиться до заказа как lead/заявка.

После оформления заявки conversation может быть привязан к order.

Пример:

```text
conversation без order_id
-> клиент уточняет детали
-> менеджер создаёт заказ
-> conversation получает order_id
-> история общения остаётся связанной с заказом
```

## 5. Роли

Будущие роли:

* admin;
* manager;
* designer;
* production;
* accountant;
* viewer.

## 6. Права доступа

### Кто видит заказы

* admin видит все заказы;
* manager видит заказы и управляет обработкой;
* designer видит заказы, где нужны макеты/дизайн;
* production видит заказы, переданные в производство;
* accountant видит заказы в части оплат и документов;
* viewer видит только разрешённый read-only список.

### Кто отвечает в чате

* admin может видеть и отвечать во всех чатах;
* manager отвечает клиенту по заказам и заявкам;
* designer может участвовать в сообщениях по макетам, если это разрешено;
* production не должен вести клиентский чат по умолчанию;
* viewer не отвечает.

### Кто меняет статусы

* admin может менять любые статусы;
* manager меняет основные клиентские и операционные статусы;
* designer меняет статусы дизайн-задач;
* production меняет производственные статусы;
* accountant меняет финансовые статусы, если они появятся;
* viewer не меняет статусы.

### Кто видит оплаты

* admin видит всё;
* accountant видит оплаты, счета и закрывающие документы;
* manager может видеть базовый статус оплаты заказа;
* designer и production не должны видеть финансовые детали без необходимости;
* viewer видит только то, что разрешено ролью.

### Кто меняет закупочные цены

Материалы и закупочные цены — служебный раздел `Настройки -> Материалы и цены`.

Обычный менеджер не должен случайно менять закупочные цены.

Редактирование закупочных цен в будущем должно идти через историю цен и audit log.

Основной доступ на изменение закупочных цен:

* admin;
* отдельная будущая роль или право, если понадобится.

## 7. Что нужно будет добавить в `diez-data-core` позже

Ниже только архитектурный план будущих миграций, без SQL-кода.

### 000008_users_and_roles

Будущая миграция для сотрудников, ролей и прав.

Возможные сущности:

* users;
* roles;
* user_roles;
* permissions;
* role_permissions.

### 000009_customers

Будущая миграция для клиентов.

Возможные сущности:

* customers;
* customer_contacts;
* customer_addresses.

### 000010_orders

Будущая миграция для заказов.

Возможные сущности:

* order_sources;
* order_statuses;
* orders;
* order_items;
* order_status_history;
* order_events.

### 000011_order_files

Будущая миграция для файлов и вложений заказов.

Возможные сущности:

* order_files;
* file_storage_metadata.

Перед этим нужно выбрать политику хранения файлов.

### 000012_conversations_and_messages

Будущая миграция для диалогов и сообщений.

Возможные сущности:

* conversations;
* conversation_participants;
* messages;
* message_attachments;
* message_statuses.

### 000013_order_payments

Будущая миграция для оплат, если финансовый модуль будет проектироваться вместе с заказами.

Возможные сущности:

* payment_statuses;
* payments;
* invoices;
* closing_documents.

### 000014_audit_log

Будущая миграция для аудита.

Возможные сущности:

* audit_events;
* audit_event_details.

Audit log должен покрывать:

* изменение статусов;
* изменение ответственных;
* изменение закупочных цен;
* изменение финансовых данных;
* действия с заказами;
* действия с сообщениями.

## 8. Что не делать сейчас

На текущем этапе не делать:

* не создавать таблицы;
* не менять сайт;
* не подключать реальный чат;
* не подключать Ozon;
* не делать авторизацию вслепую;
* не создавать миграции без отдельного проектирования;
* не добавлять SQL-код в этот draft;
* не хранить реальные заказы во frontend/sessionStorage;
* не хранить пароль PostgreSQL в desktop-приложении.

## Следующий правильный шаг

Перед реализацией заказов нужно отдельно спроектировать:

* жизненный цикл заказа;
* минимальный набор статусов;
* состав заказа;
* модель клиента;
* модель файлов;
* роли и права;
* API endpoints;
* миграции `diez-data-core`;
* изменения сайта;
* поведение `diez-control-center`.
