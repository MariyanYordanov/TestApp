# Database

## Ред на изпълнение

```bash
psql -U postgres -d testapp -f schema.sql
psql -U postgres -d testapp -f seed.sql
```

## Файлове

- `schema.sql` — създава всички таблици и индекси
- `seed.sql`   — тестови данни за разработка
- `migrations/` — промени в схемата след началната версия
