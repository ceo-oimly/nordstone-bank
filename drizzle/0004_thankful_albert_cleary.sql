CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(180) NOT NULL,
	"account_number" varchar(64) NOT NULL,
	"bank_name" varchar(180) NOT NULL,
	"country" varchar(120) NOT NULL,
	"swift_code" varchar(20),
	"iban" varchar(64),
	"transfer_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"success" boolean NOT NULL,
	"reason" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transfer_type" varchar(20);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "destination_country" varchar(120);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "destination_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "swift_code" varchar(20);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "iban" varchar(64);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fx_rate" numeric(20, 10);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fee" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recipient_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recipient_name" varchar(180);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recipient_account_number" varchar(64);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recipient_bank" varchar(180);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "expected_delivery" timestamp;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_attempts" ADD CONSTRAINT "transfer_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beneficiaries_owner_account_type_unique" ON "beneficiaries" USING btree ("user_id","account_number","transfer_type");