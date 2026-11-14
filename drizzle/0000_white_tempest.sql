CREATE TABLE "benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"icon" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(240) NOT NULL,
	"category" varchar(80) NOT NULL,
	"cover_image" text NOT NULL,
	"excerpt" text NOT NULL,
	"published_at" date NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(120) NOT NULL,
	"flag_emoji" varchar(16) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"change_24h" numeric(12, 4) NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(120) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" varchar(160) NOT NULL,
	"avatar_url" text NOT NULL,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
