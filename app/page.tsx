import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { benefits, blogPosts, currencies, exchangeRates, siteSettings, testimonials } from "@/db/schema";
import { Header, Hero, About, WhyChooseUs, CurrencyTools, ExchangeRates, Benefits, CurrencyProfile, Reviews, Blog, Footer, FloatingTools } from "@/components/landing/sections";
import LoadingRings from "@/components/brand/LoadingRings";

export const revalidate = 3600;
export default async function HomePage() {
  const [settingsRows, currencyRows, rateRows, benefitRows, reviewRows, postRows] = db ? await Promise.all([
    db.select().from(siteSettings), db.select().from(currencies).where(eq(currencies.isActive, true)).orderBy(asc(currencies.sortOrder)),
    db.select({ code: exchangeRates.currencyCode, rate: exchangeRates.rate, change24h: exchangeRates.change24h, lastUpdated: exchangeRates.lastUpdated, name: currencies.name, flagEmoji: currencies.flagEmoji }).from(exchangeRates).innerJoin(currencies, eq(exchangeRates.currencyCode, currencies.code)).where(eq(currencies.isActive, true)).orderBy(asc(currencies.sortOrder)),
    db.select().from(benefits).orderBy(asc(benefits.sortOrder)), db.select().from(testimonials).where(eq(testimonials.isActive, true)),
    db.select().from(blogPosts).where(eq(blogPosts.isActive, true)).orderBy(asc(blogPosts.publishedAt)),
  ]) : [[], [], [], [], [], []];
  const settings = Object.fromEntries(settingsRows.map((item) => [item.key, item.value]));
  return <><div className="loader" aria-hidden="true"><LoadingRings/></div><Header/><main><Hero activeUsers={settings.active_users}/><div className="container partner-strip"><span>◈&nbsp; VISA</span><span>◉&nbsp; mastercard</span><span>▣&nbsp; stripe</span></div><About/><WhyChooseUs/><CurrencyTools/><ExchangeRates rates={rateRows.map((r) => ({...r, rate:Number(r.rate), change24h:Number(r.change24h)}))} currencies={currencyRows}/><Benefits items={benefitRows}/><CurrencyProfile currencies={currencyRows}/><Reviews items={reviewRows} happyCustomers={settings.happy_customers}/><Blog posts={postRows}/></main><Footer settings={settings}/><FloatingTools/></>;
}
