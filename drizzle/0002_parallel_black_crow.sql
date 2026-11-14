CREATE TABLE "registration_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320),
	"ip_address" varchar(64),
	"success" boolean NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middle_name" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");