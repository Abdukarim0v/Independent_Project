-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'BILL_REQUESTED';

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "serviceFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
