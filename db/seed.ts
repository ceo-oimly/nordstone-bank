import { db } from "./index";
import { benefits, blogPosts, currencies, siteSettings, testimonials } from "./schema";

async function main() {
if (!db) throw new Error("Set DATABASE_URL before seeding.");

await db.insert(siteSettings).values([
  { key: "active_users", value: "18.5M+" }, { key: "happy_customers", value: "18M+" },
  { key: "support_email", value: "support@example.com" }, { key: "support_phone", value: "+1 (800) 555-0100" },
]).onConflictDoNothing();

await db.insert(currencies).values([
  { code: "USD", name: "US Dollar", flagEmoji: "🇺🇸", sortOrder: 1 }, { code: "EUR", name: "Euro", flagEmoji: "🇪🇺", sortOrder: 2 },
  { code: "GBP", name: "British Pound", flagEmoji: "🇬🇧", sortOrder: 3 }, { code: "CAD", name: "Canadian Dollar", flagEmoji: "🇨🇦", sortOrder: 4 },
  { code: "KRW", name: "South Korean won", flagEmoji: "🇰🇷", sortOrder: 5 }, { code: "JPY", name: "Japanese Yen", flagEmoji: "🇯🇵", sortOrder: 6 },
  { code: "CNY", name: "Chinese Yuan", flagEmoji: "🇨🇳", sortOrder: 7 }, { code: "NZD", name: "NZ Dollar", flagEmoji: "🇳🇿", sortOrder: 8 },
  { code: "CHF", name: "Swiss Franc", flagEmoji: "🇨🇭", sortOrder: 9 },
]).onConflictDoNothing();

await db.insert(testimonials).values([
  { name: "Avery Johnson", role: "Small business owner", avatarUrl: "/images/avatar-1.svg", quote: "Sending money to my suppliers is now simple, clear, and quick. I can focus on growing my business.", rating: 5, isActive: true },
  { name: "Mina Patel", role: "Frequent traveler", avatarUrl: "/images/avatar-2.svg", quote: "I love knowing exactly what I will pay before I make a transfer. The whole experience feels effortless.", rating: 5, isActive: true },
  { name: "Daniel Kim", role: "Product designer", avatarUrl: "/images/avatar-3.svg", quote: "A refreshingly easy way to manage money across borders. The app is thoughtful and easy to use.", rating: 5, isActive: true },
  { name: "Sofia Martins", role: "Independent consultant", avatarUrl: "/images/avatar-4.svg", quote: "Payments arrive quickly and support is always easy to reach. It has made international work much easier.", rating: 5, isActive: true },
  { name: "Noah Williams", role: "Entrepreneur", avatarUrl: "/images/avatar-5.svg", quote: "Clear fees and a clean experience make this the service I recommend to my team.", rating: 5, isActive: true },
]).onConflictDoNothing();

await db.insert(blogPosts).values([
  { slug: "5-things-before-starting-business", title: "5 Things You Need To Know Before Starting Business", category: "Corporate", coverImage: "/images/blog-corporate.svg", excerpt: "A clear-eyed guide to building strong foundations for your new business.", publishedAt: "2022-05-22", commentCount: 12, isActive: true },
  { slug: "effect-of-inflation-on-expenditure", title: "Effect Of Inflation On Our Daily Expenditure", category: "Consumer", coverImage: "/images/blog-consumer.svg", excerpt: "Understand the everyday impact of changing prices and make your budget go further.", publishedAt: "2022-05-13", commentCount: 18, isActive: true },
  { slug: "best-exchange-rate-tips", title: "7 Tips To Get Best Exchange Rate In Currency", category: "Finance", coverImage: "/images/blog-finance.svg", excerpt: "Practical ways to compare rates and make international payments with confidence.", publishedAt: "2022-04-15", commentCount: 10, isActive: true },
]).onConflictDoNothing();

await db.insert(benefits).values([
  { icon: "globe", title: "Global Coverage", description: "Move money across borders with confidence.", sortOrder: 1 },
  { icon: "money", title: "Easy Transfer Method", description: "A straightforward way to send money worldwide.", sortOrder: 2 },
  { icon: "bell", title: "Global 24/7 Support", description: "Help is here whenever you need it.", sortOrder: 3 },
  { icon: "exchange", title: "Lowest Fee", description: "Know the cost before you send.", sortOrder: 4 },
  { icon: "processing", title: "Instant Processing", description: "Fast processing keeps life moving.", sortOrder: 5 },
  { icon: "shield", title: "Bank Level Security", description: "Your money and information stay protected.", sortOrder: 6 },
]).onConflictDoNothing();

console.info("Seed data inserted. Exchange rates are intentionally not seeded; add verified provider data before publishing rates.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
