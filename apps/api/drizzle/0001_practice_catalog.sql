CREATE TABLE "drills" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"instruction" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_completions" (
	"user_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"rule_id" varchar(32) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_completions_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "shot_rules" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"start" varchar(8) NOT NULL,
	"curve" varchar(8) NOT NULL,
	"height" varchar(6) NOT NULL,
	"feedback" text NOT NULL,
	"drill_id" varchar(32) NOT NULL,
	CONSTRAINT "shot_rules_shot_unique" UNIQUE("start","curve","height"),
	CONSTRAINT "shot_rules_start_check" CHECK ("shot_rules"."start" in ('left', 'straight', 'right')),
	CONSTRAINT "shot_rules_curve_check" CHECK ("shot_rules"."curve" in ('left', 'straight', 'right')),
	CONSTRAINT "shot_rules_height_check" CHECK ("shot_rules"."height" in ('low', 'normal', 'high'))
);
--> statement-breakpoint
ALTER TABLE "practice_completions" ADD CONSTRAINT "practice_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_completions" ADD CONSTRAINT "practice_completions_rule_id_shot_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."shot_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_rules" ADD CONSTRAINT "shot_rules_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_completions_history_idx" ON "practice_completions" USING btree ("user_id","completed_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
INSERT INTO "drills" ("id", "title", "instruction") VALUES
  ('d01', 'Start-line check', 'Pick a visible target and call the starting direction of your next shot.'),
  ('d02', 'Curve check', 'Call the starting line and finishing side of your next shot.'),
  ('d03', 'Height check', 'Classify the height of your next shot as low, normal or high.');
--> statement-breakpoint
INSERT INTO "shot_rules" ("id", "start", "curve", "height", "feedback", "drill_id") VALUES
  ('r01', 'right', 'straight', 'normal', 'Your shot started right and stayed on that line.', 'd01'),
  ('r02', 'straight', 'right', 'normal', 'Your shot started on target and curved right.', 'd02'),
  ('r03', 'straight', 'straight', 'low', 'Your shot stayed on line and flew low.', 'd03');