import { PrismaClient, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Clean (order matters for FKs) ----
  await db.stockMovement.deleteMany();
  await db.recipeItem.deleteMany();
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.menuItem.deleteMany();
  await db.category.deleteMany();
  await db.ingredient.deleteMany();
  await db.restaurantTable.deleteMany();
  await db.user.deleteMany();

  // ---- Users (one per role) ----
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const users = [
    { name: "Bosh administrator", username: "admin", role: Role.ADMIN, password: "admin123" },
    { name: "Aziz Menejer", username: "manager", role: Role.MANAGER, password: "manager123" },
    { name: "Dilnoza Ofitsiant", username: "waiter", role: Role.WAITER, password: "waiter123" },
    { name: "Sardor Oshpaz", username: "cook", role: Role.COOK, password: "cook123" },
    { name: "Kamola Kassir", username: "cashier", role: Role.CASHIER, password: "cashier123" },
  ];
  for (const u of users) {
    await db.user.create({
      data: { name: u.name, username: u.username, role: u.role, passwordHash: hash(u.password) },
    });
  }
  console.log(`✓ ${users.length} users`);

  // ---- Tables ----
  for (let i = 1; i <= 12; i++) {
    await db.restaurantTable.create({
      data: {
        number: i,
        capacity: i % 3 === 0 ? 6 : 4,
        zone: i <= 6 ? "main" : i <= 9 ? "terrace" : "vip",
      },
    });
  }
  console.log("✓ 12 tables");

  // ---- Ingredients ----
  const ing = async (uz: string, ru: string, en: string, unit: string, stock: number, min: number, cost: number) =>
    db.ingredient.create({
      data: { name: { uz, ru, en }, unit, stockQty: stock, minQty: min, costPerUnit: cost },
    });

  const beef = await ing("Mol go'shti", "Говядина", "Beef", "kg", 25, 5, 75000);
  const chicken = await ing("Tovuq go'shti", "Курица", "Chicken", "kg", 30, 5, 38000);
  const rice = await ing("Guruch", "Рис", "Rice", "kg", 50, 10, 18000);
  const potato = await ing("Kartoshka", "Картофель", "Potato", "kg", 40, 10, 6000);
  const tomato = await ing("Pomidor", "Помидор", "Tomato", "kg", 20, 5, 12000);
  const cucumber = await ing("Bodring", "Огурец", "Cucumber", "kg", 15, 4, 10000);
  const onion = await ing("Piyoz", "Лук", "Onion", "kg", 30, 8, 5000);
  const flour = await ing("Un", "Мука", "Flour", "kg", 60, 15, 7000);
  const oil = await ing("Yog'", "Масло", "Oil", "l", 25, 5, 22000);
  const cola = await ing("Cola", "Кола", "Cola", "l", 40, 10, 9000);
  const coffee = await ing("Qahva", "Кофе", "Coffee", "kg", 8, 2, 120000);
  const sugar = await ing("Shakar", "Сахар", "Sugar", "kg", 30, 8, 9000);

  // initial stock-in movements
  for (const i of [beef, chicken, rice, potato, tomato, cucumber, onion, flour, oil, cola, coffee, sugar]) {
    await db.stockMovement.create({
      data: { ingredientId: i.id, type: StockMovementType.IN, qty: i.stockQty, reason: "Boshlang'ich qoldiq" },
    });
  }
  console.log("✓ 12 ingredients");

  // ---- Categories ----
  const cat = async (uz: string, ru: string, en: string, sortOrder: number) =>
    db.category.create({ data: { name: { uz, ru, en }, sortOrder } });

  const salads = await cat("Salatlar", "Салаты", "Salads", 1);
  const hot = await cat("Issiq taomlar", "Горячие блюда", "Hot dishes", 2);
  const grill = await cat("Mangal", "Гриль", "Grill", 3);
  const drinks = await cat("Ichimliklar", "Напитки", "Drinks", 4);
  const desserts = await cat("Shirinliklar", "Десерты", "Desserts", 5);

  // ---- Menu items + recipes ----
  type RecipeDef = { id: string; qty: number };
  const dish = async (
    cat: { id: string },
    uz: string,
    ru: string,
    en: string,
    price: number,
    prep: number,
    img: string | null,
    recipe: RecipeDef[],
    desc?: { uz: string; ru: string; en: string },
  ) => {
    const item = await db.menuItem.create({
      data: {
        categoryId: cat.id,
        name: { uz, ru, en },
        description: desc ?? undefined,
        price,
        prepTimeMin: prep,
        imageUrl: img ?? undefined,
        recipe: { create: recipe.map((r) => ({ ingredientId: r.id, qty: r.qty })) },
      },
    });
    return item;
  };

  await dish(salads, "Achichuk salat", "Ачичук", "Achichuk salad", 18000, 5,
    null,
    [{ id: tomato.id, qty: 0.15 }, { id: cucumber.id, qty: 0.1 }, { id: onion.id, qty: 0.05 }]);
  await dish(salads, "Sezar salat", "Цезарь", "Caesar salad", 32000, 8,
    null,
    [{ id: chicken.id, qty: 0.12 }, { id: tomato.id, qty: 0.05 }]);
  await dish(salads, "Vinegret", "Винегрет", "Vinaigrette", 22000, 7, null,
    [{ id: potato.id, qty: 0.15 }, { id: onion.id, qty: 0.05 }]);

  await dish(hot, "Osh (palov)", "Плов", "Plov", 38000, 25,
    null,
    [{ id: rice.id, qty: 0.25 }, { id: beef.id, qty: 0.15 }, { id: onion.id, qty: 0.05 }, { id: oil.id, qty: 0.05 }],
    { uz: "An'anaviy o'zbek palovi", ru: "Традиционный узбекский плов", en: "Traditional Uzbek pilaf" });
  await dish(hot, "Lag'mon", "Лагман", "Lagman", 35000, 20,
    null,
    [{ id: flour.id, qty: 0.2 }, { id: beef.id, qty: 0.12 }, { id: tomato.id, qty: 0.1 }, { id: onion.id, qty: 0.05 }]);
  await dish(hot, "Manti", "Манты", "Manti", 30000, 30,
    null,
    [{ id: flour.id, qty: 0.18 }, { id: beef.id, qty: 0.15 }, { id: onion.id, qty: 0.08 }]);
  await dish(hot, "Qovurdoq", "Кавурдак", "Qovurdoq", 42000, 22, null,
    [{ id: beef.id, qty: 0.2 }, { id: potato.id, qty: 0.2 }, { id: onion.id, qty: 0.05 }, { id: oil.id, qty: 0.04 }]);

  await dish(grill, "Mol go'sht shashlik", "Шашлык говяжий", "Beef kebab", 28000, 18,
    null,
    [{ id: beef.id, qty: 0.18 }, { id: onion.id, qty: 0.04 }]);
  await dish(grill, "Tovuq shashlik", "Шашлык куриный", "Chicken kebab", 24000, 16,
    null,
    [{ id: chicken.id, qty: 0.2 }, { id: onion.id, qty: 0.04 }]);

  await dish(drinks, "Cola 0.5", "Кола 0.5", "Cola 0.5", 12000, 1,
    null,
    [{ id: cola.id, qty: 0.5 }]);
  await dish(drinks, "Qora qahva", "Кофе чёрный", "Black coffee", 15000, 4,
    null,
    [{ id: coffee.id, qty: 0.015 }, { id: sugar.id, qty: 0.01 }]);
  await dish(drinks, "Choy", "Чай", "Tea", 8000, 3, null, [{ id: sugar.id, qty: 0.01 }]);

  await dish(desserts, "Napoleon tort", "Торт Наполеон", "Napoleon cake", 26000, 5,
    null,
    [{ id: flour.id, qty: 0.1 }, { id: sugar.id, qty: 0.05 }]);
  await dish(desserts, "Muzqaymoq", "Мороженое", "Ice cream", 16000, 2,
    null,
    [{ id: sugar.id, qty: 0.03 }]);
  await dish(desserts, "Chak-chak", "Чак-чак", "Chak-chak", 20000, 4, null,
    [{ id: flour.id, qty: 0.08 }, { id: sugar.id, qty: 0.04 }, { id: oil.id, qty: 0.03 }]);

  console.log("✓ 5 categories, 16 menu items with recipes");

  console.log("✅ Seed complete!");
  console.log("\n  Login uchun (username / parol):");
  console.log("   admin / admin123      (Administrator)");
  console.log("   manager / manager123  (Menejer)");
  console.log("   waiter / waiter123    (Ofitsiant)");
  console.log("   cook / cook123        (Oshpaz)");
  console.log("   cashier / cashier123  (Kassir)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
