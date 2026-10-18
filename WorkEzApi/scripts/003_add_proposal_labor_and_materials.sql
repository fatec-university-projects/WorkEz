-- Migration 003: Adiciona LaborPrice e MaterialsPrice na tabela Proposals
-- Permite discriminação entre Mão de Obra e Materiais para cálculo justo da taxa da plataforma (15% apenas sobre mão de obra)

ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "LaborPrice" numeric(10,2);
ALTER TABLE "Proposals" ADD COLUMN IF NOT EXISTS "MaterialsPrice" numeric(10,2);

-- Atualiza propostas existentes para definir LaborPrice = ProposedPrice e MaterialsPrice = 0 caso estejam nulos
UPDATE "Proposals"
SET "LaborPrice" = "ProposedPrice", "MaterialsPrice" = 0
WHERE "LaborPrice" IS NULL;
