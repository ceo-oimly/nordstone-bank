import { boolean, date, index, integer, numeric, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", { id: serial("id").primaryKey(), key: varchar("key", { length: 120 }).notNull().unique(), value: text("value").notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull() });
export const currencies = pgTable("currencies", { id: serial("id").primaryKey(), code: varchar("code", { length: 3 }).notNull().unique(), name: varchar("name", { length: 120 }).notNull(), flagEmoji: varchar("flag_emoji", { length: 16 }).notNull(), isActive: boolean("is_active").default(true).notNull(), sortOrder: integer("sort_order").default(0).notNull() });
export const exchangeRates = pgTable("exchange_rates", { id: serial("id").primaryKey(), currencyCode: varchar("currency_code", { length: 3 }).notNull(), rate: numeric("rate", { precision: 20, scale: 8 }).notNull(), change24h: numeric("change_24h", { precision: 12, scale: 4 }).notNull(), lastUpdated: timestamp("last_updated").defaultNow().notNull() });
export const testimonials = pgTable("testimonials", { id: serial("id").primaryKey(), name: varchar("name", { length: 160 }).notNull(), role: varchar("role", { length: 160 }).notNull(), avatarUrl: text("avatar_url").notNull(), quote: text("quote").notNull(), rating: integer("rating").default(5).notNull(), isActive: boolean("is_active").default(true).notNull(), createdAt: timestamp("created_at").defaultNow().notNull() });
export const blogPosts = pgTable("blog_posts", { id: serial("id").primaryKey(), slug: varchar("slug", { length: 180 }).notNull().unique(), title: varchar("title", { length: 240 }).notNull(), category: varchar("category", { length: 80 }).notNull(), coverImage: text("cover_image").notNull(), excerpt: text("excerpt").notNull(), publishedAt: date("published_at").notNull(), commentCount: integer("comment_count").default(0).notNull(), isActive: boolean("is_active").default(true).notNull() });
export const benefits = pgTable("benefits", { id: serial("id").primaryKey(), icon: varchar("icon", { length: 80 }).notNull(), title: varchar("title", { length: 160 }).notNull(), description: text("description").notNull(), sortOrder: integer("sort_order").default(0).notNull() });

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  middleName: varchar("middle_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  username: varchar("username", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  phone: varchar("phone", { length: 32 }),
  country: varchar("country", { length: 120 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  accountType: varchar("account_type", { length: 40 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  role: varchar("role", { length: 12 }).default("USER").notNull(),
  status: varchar("status", { length: 12 }).default("ACTIVE").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordHistory = pgTable("password_history", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 40 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  accountNumber: varchar("account_number", { length: 10 }).notNull().unique(),
  accountType: varchar("account_type", { length: 80 }).default("Savings").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  transactionLimit: numeric("transaction_limit", { precision: 15, scale: 2 }).default("10000.00").notNull(),
  status: varchar("status", { length: 40 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pinAttempts = pgTable("pin_attempts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  success: boolean("success").notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

// Persistent IP throttling works across serverless instances, unlike in-memory counters.
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const registrationAttempts = pgTable("registration_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }),
  ipAddress: varchar("ip_address", { length: 64 }),
  success: boolean("success").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  description: text("description"),
  counterpartyName: varchar("counterparty_name", { length: 180 }),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  transferType: varchar("transfer_type", { length: 20 }),
  destinationCountry: varchar("destination_country", { length: 120 }),
  destinationCurrency: varchar("destination_currency", { length: 3 }).default("USD"),
  swiftCode: varchar("swift_code", { length: 20 }),
  iban: varchar("iban", { length: 64 }),
  fxRate: numeric("fx_rate", { precision: 20, scale: 10 }),
  fee: numeric("fee", { precision: 15, scale: 2 }).default("0.00").notNull(),
  recipientAmount: numeric("recipient_amount", { precision: 15, scale: 2 }),
  recipientName: varchar("recipient_name", { length: 180 }),
  recipientAccountNumber: varchar("recipient_account_number", { length: 64 }),
  recipientBank: varchar("recipient_bank", { length: 180 }),
  cardId: uuid("card_id"),
  expectedDelivery: timestamp("expected_delivery"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deposits = pgTable("deposits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  walletId: varchar("wallet_id", { length: 80 }).notNull(),
  methodName: varchar("method_name", { length: 100 }).notNull(),
  network: varchar("network", { length: 100 }).notNull(),
  walletAddress: text("wallet_address").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  proofFilename: varchar("proof_filename", { length: 255 }).notNull(),
  proofContentType: varchar("proof_content_type", { length: 80 }).notNull(),
  proofData: text("proof_data").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ userCreatedIndex: index("deposits_user_created_idx").on(table.userId, table.createdAt) }));

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  cardType: varchar("card_type", { length: 80 }).default("Visa").notNull(),
  cardLevel: varchar("card_level", { length: 20 }).default("Standard").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  last4: varchar("last4", { length: 4 }).notNull(),
  token: varchar("token", { length: 80 }).notNull().unique(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  billingAddress: text("billing_address"),
  dailyLimit: numeric("daily_limit", { precision: 15, scale: 2 }).default("1000.00").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  holderName: varchar("holder_name", { length: 240 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
});

export const cardApplications = pgTable("card_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).default("system").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 240 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ userReadIndex: index("notifications_user_read_idx").on(table.userId, table.isRead) }));

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticketNumber: varchar("ticket_number", { length: 16 }).notNull().unique(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).default("Low").notNull(),
  status: varchar("status", { length: 20 }).default("Open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderId: uuid("sender_id").notNull(),
  message: text("message").notNull(),
  sentViaEmail: boolean("sent_via_email").default(false).notNull(),
  emailMessageId: varchar("email_message_id", { length: 255 }),
  source: varchar("source", { length: 20 }).default("app").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const beneficiaries = pgTable("beneficiaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  accountNumber: varchar("account_number", { length: 64 }).notNull(),
  bankName: varchar("bank_name", { length: 180 }).notNull(),
  country: varchar("country", { length: 120 }).notNull(),
  swiftCode: varchar("swift_code", { length: 20 }),
  iban: varchar("iban", { length: 64 }),
  transferType: varchar("transfer_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ ownerAccountTypeUnique: uniqueIndex("beneficiaries_owner_account_type_unique").on(table.userId, table.accountNumber, table.transferType) }));

export const transferAttempts = pgTable("transfer_attempts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  success: boolean("success").notNull(),
  reason: text("reason"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminUserId: uuid("admin_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 80 }).notNull(),
  note: text("note"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ createdIndex: index("admin_audit_logs_created_idx").on(table.createdAt), targetIndex: index("admin_audit_logs_target_idx").on(table.targetUserId, table.createdAt) }));

export const adminWalletConfigs = pgTable("admin_wallet_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 12 }).notNull(),
  network: varchar("network", { length: 100 }).notNull(),
  address: text("address").notNull(),
  icon: varchar("icon", { length: 8 }).default("◈").notNull(),
  paymentUriPrefix: varchar("payment_uri_prefix", { length: 80 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const loanApplications = pgTable("loan_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  purpose: text("purpose").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ statusCreatedIndex: index("loan_applications_status_created_idx").on(table.status, table.createdAt) }));
