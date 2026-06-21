# CDEK Phase 0 pre-fixes

## 1. Scope

Сделаны только безопасные pre-fixes перед будущим CDEK feature code в проекте `D:\_ProjectHome\diez-control-center`.

Что делалось:

- исправлена загрузка server delivery mode в Desktop draft, чтобы `delivery_mode='cdek'` не превращался в `manual`;
- обновлен API update-flow заказа, чтобы обычный `PATCH /orders/:id` не обнулял уже сохраненную delivery-сумму и provider-summary поля доставки;
- проверена Ozon financial signature;
- обновлены краткие проектные документы;
- выполнена TypeScript-проверка проекта.

Что не делалось:

- CDEK API не подключался;
- запросы в CDEK не выполнялись;
- CDEK credentials/env не добавлялись;
- env-файлы не читались и не менялись;
- миграции не создавались;
- production DB не трогалась;
- deploy не выполнялся;
- Desktop не перезапускался;
- Ozon-flow по смыслу не менялся;
- личный кабинет/SMS не возвращались;
- автоматические `orders.status` от доставки не добавлялись.

## 2. Files changed

- `D:\_ProjectHome\diez-control-center\apps\desktop\src\main.tsx`
- `D:\_ProjectHome\diez-control-center\apps\api\src\server.ts`
- `D:\_ProjectHome\diez-control-center\CHANGELOG.md`
- `D:\_ProjectHome\diez-control-center\PROJECT_VERSION.md`
- `D:\_ProjectHome\diez-control-center\README.md`
- `D:\_ProjectHome\diez-control-center\outputs\cdek-phase-0-prefixes-20260621-1454.md`

## 3. Desktop delivery mapping fix

Было:

- при загрузке `GET /orders/:id` в desktop draft mode `not_required` / `not-required` превращался в `not-required`;
- любой другой mode превращался в `manual`;
- будущий сохраненный `delivery_mode='cdek'` мог открыться как ручная доставка и затем быть случайно сохранен как `manual`.

Исправлено:

- добавлен отдельный mapper server delivery mode -> desktop delivery mode;
- `not_required` и `not-required` нормализуются в `not-required`;
- `cdek` сохраняется как `cdek`;
- `manual`, `pickup`, unknown и legacy values продолжают попадать в текущий безопасный fallback `manual`, потому что полноценного UI для `pickup`/CDEK еще нет;
- disabled note `СДЭК позже` не превращен в полноценный CDEK UI.

Теперь загруженный CDEK-заказ не должен терять mode уже на этапе Desktop mapping.

## 4. API delivery preservation fix

Было:

- `upsertOrderDelivery` при update существующей `app.order_delivery` всегда выставлял `price_minor = 0`;
- обычное сохранение заказа могло сбросить будущую CDEK delivery price;
- `PATCH /orders/:id` всегда писал `delivery_total_minor = 0` и `total_price_minor = incoming total`, что опасно для будущей доставки, оплачиваемой вместе с заказом.

Исправлено:

- update существующей `app.order_delivery` больше не обнуляет `price_minor`;
- `provider_payload_json`, `tracking_number`, `city`, `planned_date` и другие неупомянутые provider-related поля не перезаписываются обычным delivery upsert;
- `delivery_status` сохраняется, если mode не менялся, и пересчитывается только при смене delivery mode;
- для новых заказов поведение сохранено: delivery создается с `price_minor = 0`, `currency_code = 'RUB'`, `provider_payload_json = {}`;
- обычный `PATCH /orders/:id` сохраняет существующий `delivery_total_minor`;
- `items_total_minor` теперь берется из суммы позиций, а `total_price_minor` сохраняет существующую delivery-сумму: если входящий total уже содержит доставку, он не удваивается; если входящий total равен только позициям, доставка добавляется.

Новые CDEK endpoints не добавлялись.

## 5. Ozon financial signature check

Проверка показала:

- stored financial signature уже учитывала `delivery_total_minor`;
- item signature и `total_price_minor` также участвовали в сравнении.

Изменение:

- draft financial signature теперь получает сохраненный `delivery_total_minor`, а не жесткий `0`;
- это нужно, чтобы обычное сохранение заказа не считало существующую delivery-сумму исчезнувшей;
- активные Ozon payments `created`/`pending` по-прежнему отменяются текущим механизмом при финансовом изменении;
- final/financial Ozon payments по-прежнему блокируют изменение;
- новая Ozon-оплата автоматически не создается.

Смысл Ozon-flow не менялся.

## 6. Documentation updates

Обновлены:

- `CHANGELOG.md`: добавлена строка про Phase 0 CDEK pre-fixes;
- `PROJECT_VERSION.md`: зафиксировано состояние Phase 0;
- `README.md`: добавлено правило, что обычное редактирование заказа не должно стирать provider-поля доставки, а будущий CDEK должен идти только через backend API.

Секреты, env-значения и CDEK credentials в документацию не добавлялись.

## 7. Verification

Запущено:

```powershell
pnpm check
```

Результат:

- `apps/api check`: `tsc --noEmit` прошел успешно;
- `apps/desktop check`: `tsc --noEmit` прошел успешно.

Дополнительно проверено:

- `git diff --stat`;
- `git status --short`.

Полноценные runtime/e2e проверки не запускались, потому что задача не разрешала перезапускать Desktop и не требовала поднимать сервисы.

## 8. Risks / follow-up

- Полноценный CDEK UI все еще не реализован; `СДЭК позже` остается disabled note.
- `pickup` пока сохраняет прежний fallback в Desktop как `manual`, потому что локальный `DeliveryMode` не имеет отдельного `pickup` варианта.
- Delivery-specific endpoint для будущего CDEK save еще не создан.
- Миграции для `app.order_shipments` и `app.order_shipment_packages` не создавались.
- CDEK API/token/cache/sanitizing helpers еще не добавлялись.
- Нужно отдельно проектировать и реализовывать workflow изменения стоимости доставки после final Ozon payment: доплата/возврат/ручное списание разницы.
