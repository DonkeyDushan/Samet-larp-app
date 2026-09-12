ALTER TABLE "characters" DROP CONSTRAINT "characters_config_version_fk";
--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_config_version_fk";
--> statement-breakpoint
ALTER TABLE "character_scales" DROP CONSTRAINT "character_scales_config_version_fk";
--> statement-breakpoint
ALTER TABLE "flags" DROP CONSTRAINT "flags_config_version_fk";
--> statement-breakpoint
ALTER TABLE "scales" DROP CONSTRAINT "scales_config_version_fk";
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_config_version_fk";
--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_config_version_fk";
--> statement-breakpoint
ALTER TABLE "rules" DROP CONSTRAINT "rules_config_version_fk";
--> statement-breakpoint
ALTER TABLE "computations" DROP CONSTRAINT "computations_config_version_fk";
--> statement-breakpoint
ALTER TABLE "content_blocks" DROP CONSTRAINT "content_blocks_config_version_fk";
--> statement-breakpoint
DROP INDEX "templates_active_character";--> statement-breakpoint
DROP INDEX "templates_active_group";--> statement-breakpoint
DROP INDEX "templates_active_singleton";--> statement-breakpoint
CREATE UNIQUE INDEX "templates_singleton" ON "templates" USING btree ("run_id","chapter_id","kind") WHERE "templates"."kind" in ('highlighty', 'dotaznik');--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "character_scales" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "flags" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "computations" DROP COLUMN "config_version_id";--> statement-breakpoint
ALTER TABLE "content_blocks" DROP COLUMN "source_config_version_id";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_character_key" UNIQUE("run_id","chapter_id","character_id");--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_group_key" UNIQUE("run_id","chapter_id","group_id");