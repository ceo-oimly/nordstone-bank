CREATE TABLE "card_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "card_type" SET DEFAULT 'Visa';--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "card_level" varchar(20) DEFAULT 'Standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "token" varchar(80);--> statement-breakpoint
UPDATE "cards" SET "token" = 'tok_' || gen_random_uuid()::text WHERE "token" IS NULL;--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "daily_limit" numeric(15, 2) DEFAULT '1000.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "balance" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
UPDATE "cards" SET "card_type" = CASE WHEN "card_type" ILIKE 'mastercard%' THEN 'Mastercard' WHEN "card_type" ILIKE 'american express%' THEN 'American Express' ELSE 'Visa' END;--> statement-breakpoint
UPDATE "cards" SET "is_active" = true, "activated_at" = COALESCE("activated_at", "created_at") WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "card_id" uuid;--> statement-breakpoint
ALTER TABLE "card_applications" ADD CONSTRAINT "card_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_applications" ADD CONSTRAINT "card_applications_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_token_unique" UNIQUE("token");
