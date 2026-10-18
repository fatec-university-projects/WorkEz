-- Migration 008: Adiciona campos de segurança de serviço (check-in OTP, fotos antes/depois e assinatura)
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "StartCheckInCode" varchar(10) NULL;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "BeforePhotosJson" text NULL;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "AfterPhotosJson" text NULL;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "CompletedClientSignatureUrl" varchar(1000) NULL;
