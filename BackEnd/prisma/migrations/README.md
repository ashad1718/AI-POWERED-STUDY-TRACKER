# Prisma migration history

This directory intentionally contains no migration files yet. The existing Neon
database has not been verified against a Prisma migration baseline, so adding a
synthetic baseline or running a schema-changing command here would be unsafe.

Before adding the first migration:

1. Identify the exact Neon database that is intended for the application and
   take an appropriate backup.
2. Use `prisma migrate status` and the read-only `prisma migrate diff` from the
   parent `BackEnd` directory to compare that database with
   `prisma/schema.prisma`.
3. Only after an exact match is confirmed, generate a reviewed baseline SQL
   file with `prisma migrate diff --from-empty --to-schema=prisma/schema.prisma
   --script`, then mark it applied with `prisma migrate resolve
   --applied <migration-name>` so the baseline is not replayed against existing
   data.

Do not use `prisma migrate reset`, `prisma db push`, or an unverified
`DATABASE_URL`. Migration execution is intentionally not part of the Vercel
build until this verification is complete.
