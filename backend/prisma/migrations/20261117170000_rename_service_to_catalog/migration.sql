-- Renomeia a entidade Service para Catalog preservando os dados.
ALTER TABLE "Service" RENAME TO "Catalog";
ALTER TABLE "Catalog" RENAME CONSTRAINT "Service_pkey" TO "Catalog_pkey";
ALTER INDEX "Service_name_key" RENAME TO "Catalog_name_key";

ALTER TABLE "Appointment" RENAME COLUMN "serviceId" TO "catalogId";
ALTER TABLE "Appointment" RENAME CONSTRAINT "Appointment_serviceId_fkey" TO "Appointment_catalogId_fkey";
