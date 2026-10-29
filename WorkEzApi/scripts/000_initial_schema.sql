-- 000_initial_schema.sql
-- Criação de todas as tabelas base do ecossistema WorkEz
-- Executado automaticamente pelo DatabaseMigrator na inicialização ou manualmente no Neon SQL Editor

CREATE TABLE IF NOT EXISTS "Users" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "Name" varchar(200) NOT NULL,
    "Email" varchar(320) NOT NULL,
    "PasswordHash" text NOT NULL DEFAULT '',
    "Phone" text,
    "DocumentNumber" text,
    "ProfilePicture" text,
    "Role" varchar(50) NOT NULL DEFAULT 'Customer',
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Email" ON "Users" ("Email");

CREATE TABLE IF NOT EXISTS "Categories" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "Name" text NOT NULL,
    "Description" text
);

CREATE TABLE IF NOT EXISTS "Addresses" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "UserId" uuid NOT NULL,
    "Street" text NOT NULL DEFAULT '',
    "Number" text NOT NULL DEFAULT '',
    "Complement" text,
    "Neighborhood" text NOT NULL DEFAULT '',
    "City" text NOT NULL DEFAULT '',
    "State" text NOT NULL DEFAULT '',
    "ZipCode" text NOT NULL DEFAULT '',
    "AddressType" text NOT NULL DEFAULT 'Home',
    "Latitude" double precision,
    "Longitude" double precision
);

CREATE TABLE IF NOT EXISTS "Customers" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "UserId" uuid NOT NULL UNIQUE REFERENCES "Users" ("Id") ON DELETE CASCADE,
    "Notes" text
);

CREATE TABLE IF NOT EXISTS "Providers" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "UserId" uuid NOT NULL UNIQUE REFERENCES "Users" ("Id") ON DELETE CASCADE,
    "ProfessionalDescription" text,
    "AverageRating" numeric(3, 2) NOT NULL DEFAULT 0.0,
    "DocumentVerified" boolean NOT NULL DEFAULT false,
    "CompletedServicesCount" integer NOT NULL DEFAULT 0,
    "AvailabilityStatus" text NOT NULL DEFAULT 'Available',
    "Latitude" double precision,
    "Longitude" double precision,
    "ServiceRadiusKm" double precision NOT NULL DEFAULT 15.0,
    "Portfolio" text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS "ProviderCategories" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ProviderId" uuid NOT NULL REFERENCES "Providers" ("Id") ON DELETE CASCADE,
    "CategoryId" uuid NOT NULL REFERENCES "Categories" ("Id") ON DELETE CASCADE,
    "Status" text NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS "Services" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "CustomerId" uuid NOT NULL REFERENCES "Customers" ("Id") ON DELETE RESTRICT,
    "CategoryId" uuid NOT NULL REFERENCES "Categories" ("Id") ON DELETE RESTRICT,
    "AddressId" uuid REFERENCES "Addresses" ("Id") ON DELETE SET NULL,
    "Title" varchar(300) NOT NULL,
    "Description" text,
    "ImageUrl" text,
    "DesiredDate" timestamptz,
    "ServiceStatus" varchar(50) NOT NULL DEFAULT 'Open',
    "StartCheckInCode" varchar(10),
    "BeforePhotosJson" text,
    "AfterPhotosJson" text,
    "CompletedClientSignatureUrl" varchar(1000),
    "Latitude" double precision,
    "Longitude" double precision,
    "UrgencyLevel" text DEFAULT 'Medium',
    "LocationReleased" boolean DEFAULT false,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Proposals" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ServiceId" uuid NOT NULL REFERENCES "Services" ("Id") ON DELETE CASCADE,
    "ProviderId" uuid NOT NULL REFERENCES "Providers" ("Id") ON DELETE RESTRICT,
    "ProposedPrice" numeric(10, 2) NOT NULL,
    "LaborPrice" numeric(10, 2),
    "MaterialsPrice" numeric(10, 2),
    "Description" text,
    "EstimatedTime" text,
    "ProposalStatus" varchar(50) NOT NULL DEFAULT 'Pending',
    "CounterPrice" numeric(10, 2),
    "CounterDescription" text,
    "CounterOfferedAt" timestamptz,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Appointments" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "ServiceId" uuid NOT NULL UNIQUE REFERENCES "Services" ("Id") ON DELETE RESTRICT,
    "ProposalId" uuid NOT NULL UNIQUE REFERENCES "Proposals" ("Id") ON DELETE RESTRICT,
    "CustomerId" uuid NOT NULL REFERENCES "Customers" ("Id") ON DELETE RESTRICT,
    "ProviderId" uuid NOT NULL REFERENCES "Providers" ("Id") ON DELETE RESTRICT,
    "AppointmentStatus" varchar(50) NOT NULL DEFAULT 'Confirmed',
    "FinalPrice" numeric(10, 2) NOT NULL,
    "ScheduledDate" timestamptz NOT NULL,
    "CompletedAt" timestamptz,
    "ConfirmationCode" text,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Categorias Iniciais
INSERT INTO "Categories" ("Id", "Name", "Description") VALUES
    ('11111111-1111-1111-1111-111111111101', 'Elétrica', 'Instalações elétricas, chuveiros, disjuntores e iluminação'),
    ('11111111-1111-1111-1111-111111111102', 'Hidráulica', 'Encanamentos, desentupimentos, torneiras e vazamentos'),
    ('11111111-1111-1111-1111-111111111103', 'Pintura', 'Pinturas residenciais e comerciais, texturas e acabamentos'),
    ('11111111-1111-1111-1111-111111111104', 'Limpeza', 'Diaristas, faxinas completas e pós-obra'),
    ('11111111-1111-1111-1111-111111111105', 'Montagem', 'Montagem e desmontagem de móveis planejados e convencionais'),
    ('11111111-1111-1111-1111-111111111106', 'Climatização', 'Instalação, limpeza e manutenção de ar-condicionado'),
    ('11111111-1111-1111-1111-111111111107', 'Marcenaria', 'Fabricação, reparos e ajustes em madeira e MDF'),
    ('11111111-1111-1111-1111-111111111108', 'Mecânica', 'Manutenção preventiva, autoelétrica e socorro rápido')
ON CONFLICT ("Id") DO NOTHING;


-- Garantia de colunas caso as tabelas já existissem previamente
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "Portfolio" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "ServiceRadiusKm" double precision NOT NULL DEFAULT 15.0;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "AverageRating" numeric(3, 2) NOT NULL DEFAULT 0.0;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "DocumentVerified" boolean NOT NULL DEFAULT false;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "CompletedServicesCount" integer NOT NULL DEFAULT 0;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "AvailabilityStatus" text NOT NULL DEFAULT 'Available';
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "Latitude" double precision;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "Longitude" double precision;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "ProfessionalDescription" text;

ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "PasswordHash" text NOT NULL DEFAULT '';
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Phone" text;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DocumentNumber" text;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ProfilePicture" text;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Role" varchar(50) NOT NULL DEFAULT 'Customer';

ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "StartCheckInCode" varchar(10);
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "BeforePhotosJson" text;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "AfterPhotosJson" text;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "CompletedClientSignatureUrl" varchar(1000);
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "Latitude" double precision;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "Longitude" double precision;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "UrgencyLevel" text DEFAULT 'Medium';
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "LocationReleased" boolean DEFAULT false;

ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "LaborPrice" numeric(10, 2);
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "MaterialsPrice" numeric(10, 2);
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterPrice" numeric(10, 2);
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterDescription" text;
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "CounterOfferedAt" timestamptz;

ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "QualityTagsJson" text;

ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "Reviews" ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now();
