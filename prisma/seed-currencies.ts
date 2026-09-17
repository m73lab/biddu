import "dotenv/config";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

// ISO 4217 currencies — Chile first, then rest
export const currencies = [
  { code: "CLP", name: "Peso Chileno", symbol: "$" },
  { code: "USD", name: "Dólar Estadounidense", symbol: "US$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Libra Esterlina", symbol: "£" },
  { code: "JPY", name: "Yen Japonés", symbol: "¥" },
  { code: "CHF", name: "Franco Suizo", symbol: "CHF" },
  { code: "CAD", name: "Dólar Canadiense", symbol: "C$" },
  { code: "AUD", name: "Dólar Australiano", symbol: "A$" },
  { code: "NZD", name: "Dólar Neozelandés", symbol: "NZ$" },
  { code: "CNY", name: "Yuan Chino", symbol: "¥" },
  { code: "HKD", name: "Dólar de Hong Kong", symbol: "HK$" },
  { code: "SGD", name: "Dólar de Singapur", symbol: "S$" },
  { code: "SEK", name: "Corona Sueca", symbol: "kr" },
  { code: "NOK", name: "Corona Noruega", symbol: "kr" },
  { code: "DKK", name: "Corona Danesa", symbol: "kr" },
  { code: "KRW", name: "Won Surcoreano", symbol: "₩" },
  { code: "INR", name: "Rupia India", symbol: "₹" },
  { code: "RUB", name: "Rublo Ruso", symbol: "₽" },
  { code: "BRL", name: "Real Brasileño", symbol: "R$" },
  { code: "ZAR", name: "Rand Sudafricano", symbol: "R" },
  { code: "MXN", name: "Peso Mexicano", symbol: "MX$" },
  { code: "ARS", name: "Peso Argentino", symbol: "AR$" },
  { code: "COP", name: "Peso Colombiano", symbol: "CO$" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/" },
  { code: "UYU", name: "Peso Uruguayo", symbol: "$U" },
  { code: "PYG", name: "Guaraní", symbol: "Gs" },
  { code: "BOB", name: "Boliviano", symbol: "Bs" },
  { code: "DOP", name: "Peso Dominicano", symbol: "RD$" },
  { code: "CRC", name: "Coló Costarricense", symbol: "₩" },
  { code: "GTQ", name: "Quetzal Guatemalteco", symbol: "Q" },
  { code: "HNL", name: "Lempira Hondureñ", symbol: "L" },
  { code: "NIO", name: "Córdoba Nicaragüense", symbol: "C$" },
  { code: "PAB", name: "Balboa Panameño", symbol: "B/." },
  { code: "CUP", name: "Peso Cubano", symbol: "$" },
  { code: "PLN", name: "Zloty Polaco", symbol: "zł" },
  { code: "TRY", name: "Lira Turca", symbol: "₺" },
  { code: "THB", name: "Baht Tailandés", symbol: "฿" },
  { code: "IDR", name: "Rupia Indonesia", symbol: "Rp" },
  { code: "MYR", name: "Ringgit Malayo", symbol: "RM" },
  { code: "PHP", name: "Peso Filipino", symbol: "₱" },
  { code: "CZK", name: "Corona Checa", symbol: "Kč" },
  { code: "HUF", name: "Forinto Húngaro", symbol: "Ft" },
  { code: "ILS", name: "Shekel Israelí", symbol: "₪" },
  { code: "TWD", name: "Dólar Taiwanés", symbol: "NT$" },
  { code: "AED", name: "Dírham de los EAU", symbol: "د.إ" },
  { code: "SAR", name: "Riyal Saudí", symbol: "﷼" },
  { code: "RON", name: "Leu Rumano", symbol: "lei" },
  { code: "BGN", name: "Lev Búlgaro", symbol: "лв" },
  { code: "HRK", name: "Kuna Croata", symbol: "kn" },
  { code: "UAH", name: "Hryvnia Ucraniana", symbol: "₴" },
  { code: "VND", name: "Dong Vietnamita", symbol: "₫" },
  { code: "EGP", name: "Libra Egipcia", symbol: "E£" },
  { code: "PKR", name: "Rupia Pakistaní", symbol: "₨" },
  { code: "BDT", name: "Taka Bangladesí", symbol: "৳" },
  { code: "NGN", name: "Naira Nigeriana", symbol: "₦" },
  { code: "KES", name: "Chelín Keniano", symbol: "KSh" },
];

export async function seedCurrencies(prismaClient: PrismaClient = prisma) {
  // Always upsert (no early skip): newly added currencies must also reach
  // databases seeded before they existed. update:{} is a no-op for rows
  // that already exist.
  console.log("💰 Seeding currencies...");
  for (const currency of currencies) {
    await prismaClient.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
  console.log(`✅ Seeded ${currencies.length} currencies`);
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  (async () => {
    console.log("🌱 Seeding currencies only...\n");
    await seedCurrencies();
    console.log("\n🎉 Currency seeding complete!");
  })()
    .catch((e) => {
      console.error("❌ Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
