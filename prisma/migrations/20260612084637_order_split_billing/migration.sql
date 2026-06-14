-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidPersons" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "person" INTEGER;
