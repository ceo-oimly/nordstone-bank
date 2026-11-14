CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"wallet_id" varchar(80) NOT NULL,
	"method_name" varchar(100) NOT NULL,
	"network" varchar(100) NOT NULL,
	"wallet_address" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"reference" varchar(64) NOT NULL,
	"proof_filename" varchar(255) NOT NULL,
	"proof_content_type" varchar(80) NOT NULL,
	"proof_data" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deposits_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deposits_user_created_idx" ON "deposits" USING btree ("user_id","created_at");