-- Migration 004: Cria tabela Reviews para armazenar avaliações reais de clientes e prestadores

CREATE TABLE IF NOT EXISTS "Reviews" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "AppointmentId" uuid NULL,
    "ReviewerUserId" uuid NOT NULL,
    "ReviewedUserId" uuid NOT NULL,
    "Rating" integer NOT NULL,
    "Comment" character varying(1000) NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NULL,
    CONSTRAINT "FK_Reviews_Users_ReviewerUserId" FOREIGN KEY ("ReviewerUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Reviews_Users_ReviewedUserId" FOREIGN KEY ("ReviewedUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Reviews_Appointments_AppointmentId" FOREIGN KEY ("AppointmentId") REFERENCES "Appointments" ("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_Reviews_ReviewedUserId" ON "Reviews" ("ReviewedUserId");
CREATE INDEX IF NOT EXISTS "IX_Reviews_ReviewerUserId" ON "Reviews" ("ReviewerUserId");
CREATE INDEX IF NOT EXISTS "IX_Reviews_AppointmentId" ON "Reviews" ("AppointmentId");
