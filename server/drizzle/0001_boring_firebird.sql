CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_draft" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"source_text" text NOT NULL,
	"data" jsonb NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"session_id" integer,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_proposal" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb NOT NULL,
	"base_revision" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profile" jsonb NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gameplans" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_session" ALTER COLUMN "style" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "training_session" ALTER COLUMN "duration_min" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "training_session" ALTER COLUMN "energy" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "training_session" ALTER COLUMN "energy" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "conversation_id" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "technique" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "technique" ADD COLUMN "catalog_id" text;--> statement-breakpoint
ALTER TABLE "training_session" ADD COLUMN "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "training_session" ADD COLUMN "goal_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_draft" ADD CONSTRAINT "training_draft_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_draft" ADD CONSTRAINT "training_draft_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_draft" ADD CONSTRAINT "training_draft_session_id_training_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_proposal" ADD CONSTRAINT "coach_proposal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_proposal" ADD CONSTRAINT "coach_proposal_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_state" ADD CONSTRAINT "training_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_user_updated_idx" ON "conversation" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "training_draft_user_updated_idx" ON "training_draft" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "coach_proposal_user_status_idx" ON "coach_proposal" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_conversation_idx" ON "chat_message" USING btree ("user_id","conversation_id","created_at");--> statement-breakpoint
INSERT INTO conversation (id, user_id, title, created_at, updated_at)
SELECT 'legacy-' || user_id, user_id, 'Conversaciones anteriores', min(created_at), max(created_at)
FROM chat_message GROUP BY user_id;
--> statement-breakpoint
UPDATE chat_message SET conversation_id = 'legacy-' || user_id WHERE conversation_id IS NULL;
