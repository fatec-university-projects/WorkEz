-- Migration 005: Adiciona campos de geolocalização e raio de atendimento
-- Adiciona Latitude, Longitude e ServiceRadiusKm na tabela Providers
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "Latitude" double precision NULL;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "Longitude" double precision NULL;
ALTER TABLE "Providers" ADD COLUMN IF NOT EXISTS "ServiceRadiusKm" double precision NOT NULL DEFAULT 15.0;

-- Adiciona Latitude e Longitude na tabela Services
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "Latitude" double precision NULL;
ALTER TABLE "Services" ADD COLUMN IF NOT EXISTS "Longitude" double precision NULL;

-- Adiciona Latitude e Longitude na tabela Addresses
ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS "Latitude" double precision NULL;
ALTER TABLE "Addresses" ADD COLUMN IF NOT EXISTS "Longitude" double precision NULL;
