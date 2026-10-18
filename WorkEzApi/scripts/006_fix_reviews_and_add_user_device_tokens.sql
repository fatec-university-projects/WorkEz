-- Migration 006: Cria tabela UserDeviceTokens e ajusta tabela Reviews para serviços e agendamentos opcionais
-- 1. Cria tabela UserDeviceTokens para registro de tokens push do Expo
CREATE TABLE IF NOT EXISTS "UserDeviceTokens" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "UserId" uuid NOT NULL,
    "ExpoPushToken" character varying(255) NOT NULL,
    "Platform" character varying(50) NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_UserDeviceTokens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_UserDeviceTokens_UserId" ON "UserDeviceTokens" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_UserDeviceTokens_ExpoPushToken" ON "UserDeviceTokens" ("ExpoPushToken");

-- 2. Torna AppointmentId opcional em Reviews (avaliações vinculadas diretamente ao serviço ou agendamento)
ALTER TABLE "Reviews" ALTER COLUMN "AppointmentId" DROP NOT NULL;

-- 3. Adiciona ServiceId na tabela Reviews caso não exista
ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "ServiceId" uuid NULL;

-- 4. Adiciona Foreign Key para Services se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_Reviews_Services_ServiceId'
    ) THEN
        ALTER TABLE "Reviews"
            ADD CONSTRAINT "FK_Reviews_Services_ServiceId"
            FOREIGN KEY ("ServiceId") REFERENCES "Services" ("Id")
            ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Cria índice para ServiceId em Reviews
CREATE INDEX IF NOT EXISTS "IX_Reviews_ServiceId" ON "Reviews" ("ServiceId");
