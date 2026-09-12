CREATE TABLE "block_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"block_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"description" text,
	"text" text DEFAULT '' NOT NULL,
	"condition_expr" text NOT NULL,
	"condition_refs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_variations_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "block_variations_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "block_variations_block_priority_key" UNIQUE("run_id","block_id","priority"),
	CONSTRAINT "block_variations_priority_positive" CHECK ("block_variations"."priority" >= 1)
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "content_blocks_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "external_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "source_config_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "block_variations" ADD CONSTRAINT "block_variations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variations" ADD CONSTRAINT "block_variations_block_fk" FOREIGN KEY ("run_id","block_id") REFERENCES "public"."content_blocks"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_run_id_key" UNIQUE("run_id","id");--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_run_external_key" UNIQUE("run_id","external_id");