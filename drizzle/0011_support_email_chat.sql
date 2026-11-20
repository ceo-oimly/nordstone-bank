ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "sent_via_email" boolean DEFAULT false NOT NULL;
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "email_message_id" varchar(255);
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "source" varchar(20) DEFAULT 'app' NOT NULL;
