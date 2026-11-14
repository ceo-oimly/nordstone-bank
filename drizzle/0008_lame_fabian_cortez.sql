ALTER TABLE "notifications" ADD COLUMN "type" varchar(20) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "link" varchar(240);--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","is_read");