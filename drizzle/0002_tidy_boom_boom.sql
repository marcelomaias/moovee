CREATE TABLE "queue_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"release_year" text,
	"position" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"source_suggestion_id" text
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"approval_mode" text DEFAULT 'majority' NOT NULL,
	"approval_threshold" integer,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"invited_user_id" text NOT NULL,
	"invited_by_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_member" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"suggested_by_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"release_year" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"suggested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestion_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"suggestion_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"release_year" text,
	"watched_by_id" text,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"source_queue_entry_id" text
);
--> statement-breakpoint
ALTER TABLE "queue_entry" ADD CONSTRAINT "queue_entry_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entry" ADD CONSTRAINT "queue_entry_source_suggestion_id_suggestion_id_fk" FOREIGN KEY ("source_suggestion_id") REFERENCES "public"."suggestion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invite" ADD CONSTRAINT "room_invite_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invite" ADD CONSTRAINT "room_invite_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invite" ADD CONSTRAINT "room_invite_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_suggested_by_id_user_id_fk" FOREIGN KEY ("suggested_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion_vote" ADD CONSTRAINT "suggestion_vote_suggestion_id_suggestion_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."suggestion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion_vote" ADD CONSTRAINT "suggestion_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_watched_by_id_user_id_fk" FOREIGN KEY ("watched_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_source_queue_entry_id_queue_entry_id_fk" FOREIGN KEY ("source_queue_entry_id") REFERENCES "public"."queue_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entry_room_tmdb_idx" ON "queue_entry" USING btree ("room_id","tmdb_id");--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entry_room_position_idx" ON "queue_entry" USING btree ("room_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "room_invite_room_user_idx" ON "room_invite" USING btree ("room_id","invited_user_id");--> statement-breakpoint
CREATE INDEX "room_invite_invitedUserId_idx" ON "room_invite" USING btree ("invited_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_member_room_user_idx" ON "room_member" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "room_member_roomId_idx" ON "room_member" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_member_userId_idx" ON "room_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "suggestion_room_status_idx" ON "suggestion" USING btree ("room_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "suggestion_room_tmdb_pending_idx" ON "suggestion" USING btree ("room_id","tmdb_id") WHERE "suggestion"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "suggestion_vote_suggestion_user_idx" ON "suggestion_vote" USING btree ("suggestion_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_history_room_tmdb_idx" ON "watch_history" USING btree ("room_id","tmdb_id");--> statement-breakpoint
CREATE INDEX "watch_history_roomId_idx" ON "watch_history" USING btree ("room_id");