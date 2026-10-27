-- 009_alter_fk_services_addresses_set_null.sql
-- Altera a foreign key FK_Services_Addresses_AddressId na tabela Services para ON DELETE SET NULL.
-- Dessa forma, ao excluir um endereço salvo da conta do cliente, os chamados existentes
-- permanecem íntegros no banco de dados e têm apenas o AddressId setado para NULL sem disparar erro de violação de FK RESTRICT.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_Services_Addresses_AddressId'
          AND table_name = 'Services'
    ) THEN
        ALTER TABLE "Services" DROP CONSTRAINT "FK_Services_Addresses_AddressId";
    END IF;

    -- Garante que se a constraint tiver outro nome gerado pelo EF Core ou Npgsql, também recria com SET NULL
    ALTER TABLE "Services"
        ADD CONSTRAINT "FK_Services_Addresses_AddressId"
        FOREIGN KEY ("AddressId")
        REFERENCES "Addresses" ("Id")
        ON DELETE SET NULL;
END $$;
