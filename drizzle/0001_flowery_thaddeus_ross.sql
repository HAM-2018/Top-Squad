CREATE TABLE "team_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"invited_email" text NOT NULL,
	"invited_first_name" text,
	"invited_last_name" text,
	"invited_user_id" integer,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
DROP INDEX "uniq_team_challenge";--> statement-breakpoint
DROP INDEX "uniq_teams_name_lower";--> statement-breakpoint
DROP INDEX "uniq_challenge_team_invite";--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_team_invite_email" ON "team_invites" USING btree ("team_id",lower("invited_email"));--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_team_challenge" ON "team_challenges" USING btree ("team_id","challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_teams_name_lower" ON "teams" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_challenge_team_invite" ON "challenge_team_invites" USING btree ("challenge_id","team_id");