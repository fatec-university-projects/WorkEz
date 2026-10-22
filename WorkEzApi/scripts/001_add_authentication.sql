-- Execute UMA vez no banco PostgreSQL (Neon) antes de publicar a versão com autenticação.
-- É idempotente. Os nomes seguem as propriedades DbSet do AppDbContext (sem migrations no projeto).

ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordHash" text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "RefreshTokens" (
    "Id"        uuid        NOT NULL PRIMARY KEY,
    "UserId"    uuid        NOT NULL REFERENCES "Users" ("Id") ON DELETE CASCADE,
    "TokenHash" varchar(128) NOT NULL,
    "ExpiresAt" timestamptz NOT NULL,
    "RevokedAt" timestamptz NULL,
    "CreatedAt" timestamptz NOT NULL,
    "UpdatedAt" timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_RefreshTokens_Token" ON "RefreshTokens" ("Token");
CREATE INDEX IF NOT EXISTS "IX_RefreshTokens_UserId" ON "RefreshTokens" ("UserId");

-- Contra-propostas em Proposals
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterPrice" numeric(10, 2) NULL;
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterDescription" text NULL;
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterOfferedAt" timestamp with time zone NULL;

-- Ajustes de campos de Services
ALTER TABLE "Services" ALTER COLUMN "AddressId" DROP NOT NULL;
ALTER TABLE "Services" ALTER COLUMN "UrgencyLevel" SET DEFAULT 'Medium';
ALTER TABLE "Services" ALTER COLUMN "UrgencyLevel" DROP NOT NULL;
ALTER TABLE "Services" ALTER COLUMN "LocationReleased" SET DEFAULT false;
ALTER TABLE "Services" ALTER COLUMN "LocationReleased" DROP NOT NULL;

