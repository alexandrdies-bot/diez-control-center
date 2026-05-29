# Dev Run

## Запуск в режиме разработки

### 1. PostgreSQL

```powershell
cd D:\_ProjectHome\diez-data-core
docker compose up -d postgres
docker compose ps
```

### 2. API

```powershell
cd D:\_ProjectHome\diez-control-center
pnpm.cmd dev:api
```

Проверка:

```text
http://127.0.0.1:3001/health/db
http://127.0.0.1:3001/materials
```

### 3. Desktop / Tauri

В Developer PowerShell for Visual Studio:

```powershell
cd D:\_ProjectHome\diez-control-center
pnpm.cmd dev:tauri
```

## Известная проблема

Если база или API не запущены, экран "Материалы" может показать:

```text
Materials request failed: 500
```

Это ожидаемая dev-проблема запуска. Позже нужно сделать удобный launcher и нормальное сообщение об ошибке.
