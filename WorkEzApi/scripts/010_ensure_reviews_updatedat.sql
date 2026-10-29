-- Migration 010: Garante colunas de auditoria na tabela Reviews
ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP;
