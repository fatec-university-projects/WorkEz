-- Migration 007: Criação das tabelas de Carteira Digital (WalletTransactions) e Solicitações de Saque PIX (WithdrawalRequests)

-- 1. Cria tabela WalletTransactions
CREATE TABLE IF NOT EXISTS "WalletTransactions" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ProviderId" uuid NOT NULL,
    "ServiceId" uuid NULL,
    "AppointmentId" uuid NULL,
    "Amount" numeric(10,2) NOT NULL,
    "GrossAmount" numeric(10,2) NOT NULL,
    "LaborAmount" numeric(10,2) NOT NULL DEFAULT 0.00,
    "MaterialsAmount" numeric(10,2) NOT NULL DEFAULT 0.00,
    "PlatformFeeAmount" numeric(10,2) NOT NULL DEFAULT 0.00,
    "TransactionType" character varying(50) NOT NULL,
    "Status" character varying(50) NOT NULL DEFAULT 'Completed',
    "Description" character varying(500) NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_WalletTransactions_Providers_ProviderId" FOREIGN KEY ("ProviderId") REFERENCES "Providers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_WalletTransactions_Services_ServiceId" FOREIGN KEY ("ServiceId") REFERENCES "Services" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_WalletTransactions_Appointments_AppointmentId" FOREIGN KEY ("AppointmentId") REFERENCES "Appointments" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_WalletTransactions_ProviderId" ON "WalletTransactions" ("ProviderId");
CREATE INDEX IF NOT EXISTS "IX_WalletTransactions_ServiceId" ON "WalletTransactions" ("ServiceId");
CREATE INDEX IF NOT EXISTS "IX_WalletTransactions_CreatedAt" ON "WalletTransactions" ("CreatedAt");

-- 2. Cria tabela WithdrawalRequests
CREATE TABLE IF NOT EXISTS "WithdrawalRequests" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ProviderId" uuid NOT NULL,
    "Amount" numeric(10,2) NOT NULL,
    "PixKey" character varying(150) NOT NULL,
    "PixKeyType" character varying(50) NOT NULL,
    "Status" character varying(50) NOT NULL DEFAULT 'Pending',
    "ReceiptNumber" character varying(100) NULL,
    "ProcessedAt" timestamp with time zone NULL,
    "Notes" character varying(500) NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_WithdrawalRequests_Providers_ProviderId" FOREIGN KEY ("ProviderId") REFERENCES "Providers" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_WithdrawalRequests_ProviderId" ON "WithdrawalRequests" ("ProviderId");
CREATE INDEX IF NOT EXISTS "IX_WithdrawalRequests_CreatedAt" ON "WithdrawalRequests" ("CreatedAt");
