CREATE TYPE "public"."cascade_decision" AS ENUM('prepocitat', 'ponechat');--> statement-breakpoint
CREATE TYPE "public"."chapter_status" AS ENUM('rozpracovana', 'spocitana', 'vydana');--> statement-breakpoint
CREATE TYPE "public"."computation_kind" AS ENUM('prepocet', 'rucni_uprava');--> statement-breakpoint
CREATE TYPE "public"."computation_status" AS ENUM('navrh', 'potvrzena');--> statement-breakpoint
CREATE TYPE "public"."condition_connector" AS ENUM('AND', 'OR');--> statement-breakpoint
CREATE TYPE "public"."condition_operator" AS ENUM('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'obsahuje', 'je_pravda', 'je_nepravda');--> statement-breakpoint
CREATE TYPE "public"."condition_subject" AS ENUM('odpoved', 'skala', 'pasmo', 'priznak', 'clenstvi', 'vedeni', 'hod');--> statement-breakpoint
CREATE TYPE "public"."effect_kind" AS ENUM('zmena_skaly', 'nastaveni_skaly', 'pasmo', 'priznak', 'blok', 'clenstvi', 'vedeni', 'tag', 'domacnost_slouceni', 'domacnost_rozdeleni');--> statement-breakpoint
CREATE TYPE "public"."group_role" AS ENUM('clen', 'vedouci');--> statement-breakpoint
CREATE TYPE "public"."membership_action" AS ENUM('pridat', 'odebrat');--> statement-breakpoint
CREATE TYPE "public"."merge_strategy" AS ENUM('soucet', 'prumer', 'vyssi', 'otazka');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('hrac', 'org');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('bool', 'single', 'multi', 'scale_direct', 'text');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('zalozen', 'aktivni', 'archivovan');--> statement-breakpoint
CREATE TYPE "public"."scale_scope" AS ENUM('postava', 'domacnost');--> statement-breakpoint
CREATE TYPE "public"."split_strategy" AS ENUM('kopie', 'polovina', 'otazka');--> statement-breakpoint
CREATE TYPE "public"."state_source" AS ENUM('pocatecni', 'prepocet', 'rucni');--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('postava', 'skupina', 'highlighty', 'dotaznik');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"number" integer NOT NULL,
	"status" "chapter_status" DEFAULT 'rozpracovana' NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" text,
	"is_touched" boolean DEFAULT false NOT NULL,
	"touched_at" timestamp with time zone,
	"touched_reason" text,
	"cascade_decision" "cascade_decision",
	"cascade_decided_at" timestamp with time zone,
	"cascade_decided_by" text,
	"diverges_from_released" boolean DEFAULT false NOT NULL,
	"divergence_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "chapters_run_number_key" UNIQUE("run_id","number"),
	CONSTRAINT "chapters_number_range" CHECK ("chapters"."number" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "config_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"source_filename" text NOT NULL,
	"source_hash" text NOT NULL,
	"diff_from_previous" jsonb,
	"import_report" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "config_versions_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "config_versions_run_version_key" UNIQUE("run_id","version"),
	CONSTRAINT "config_versions_version_positive" CHECK ("config_versions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"start_date" text NOT NULL,
	"letter" text NOT NULL,
	"label" text,
	"status" "run_status" DEFAULT 'zalozen' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "runs_id_format" CHECK ("runs"."id" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z]$'),
	CONSTRAINT "runs_letter_format" CHECK ("runs"."letter" ~ '^[A-Z]$')
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_year" integer,
	"home_group_id" uuid,
	"template_external_id" text,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "characters_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "groups_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"label" text,
	"created_in_chapter_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "households_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "character_scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"character_id" uuid NOT NULL,
	"scale_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"initial_value" integer NOT NULL,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_scales_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "character_scales_unique" UNIQUE("run_id","character_id","scale_id"),
	CONSTRAINT "character_scales_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "character_scales_initial_range" CHECK ("character_scales"."initial_value" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flags_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "flags_run_key_key" UNIQUE("run_id","key")
);
--> statement-breakpoint
CREATE TABLE "scale_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"scale_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"min_value" integer NOT NULL,
	"max_value" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scale_bands_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "scale_bands_scale_ordinal_key" UNIQUE("run_id","scale_id","ordinal"),
	CONSTRAINT "scale_bands_bounds" CHECK ("scale_bands"."min_value" <= "scale_bands"."max_value"),
	CONSTRAINT "scale_bands_within_1_10" CHECK ("scale_bands"."min_value" >= 1 and "scale_bands"."max_value" <= 10)
);
--> statement-breakpoint
CREATE TABLE "scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"min_value" integer DEFAULT 1 NOT NULL,
	"max_value" integer DEFAULT 10 NOT NULL,
	"scope" "scale_scope" DEFAULT 'postava' NOT NULL,
	"merge_strategy" "merge_strategy",
	"split_strategy" "split_strategy",
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scales_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "scales_run_key_key" UNIQUE("run_id","key"),
	CONSTRAINT "scales_range_sane" CHECK ("scales"."min_value" < "scales"."max_value"),
	CONSTRAINT "scales_range_within_1_10" CHECK ("scales"."min_value" >= 1 and "scales"."max_value" <= 10),
	CONSTRAINT "scales_household_strategies" CHECK (("scales"."scope" = 'domacnost') = ("scales"."merge_strategy" is not null and "scales"."split_strategy" is not null))
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"referenced_character_id" uuid,
	"is_other" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_options_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "answer_options_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "answer_options_question_ordinal_key" UNIQUE("run_id","question_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "answer_selected_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"answer_id" uuid NOT NULL,
	"answer_option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_selected_options_unique" UNIQUE("run_id","answer_id","answer_option_id")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"bool_value" boolean,
	"numeric_value" integer,
	"text_value" text,
	"filled_by_org" boolean DEFAULT false NOT NULL,
	"answered_by" text NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answers_unique" UNIQUE("run_id","chapter_id","character_id","question_id"),
	CONSTRAINT "answers_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"source" "question_source" DEFAULT 'hrac' NOT NULL,
	"is_paired" boolean DEFAULT false NOT NULL,
	"text" text NOT NULL,
	"help_text" text,
	"scale_id" uuid,
	"allow_other" boolean DEFAULT false NOT NULL,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "questions_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "questions_character_ordinal_key" UNIQUE("run_id","chapter_id","character_id","ordinal"),
	CONSTRAINT "questions_scale_direct_needs_scale" CHECK (("questions"."type" = 'scale_direct') = ("questions"."scale_id" is not null)),
	CONSTRAINT "questions_paired_needs_options" CHECK (not "questions"."is_paired" or "questions"."type" in ('single', 'multi'))
);
--> statement-breakpoint
CREATE TABLE "effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"rule_id" uuid,
	"answer_option_id" uuid,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"kind" "effect_kind" NOT NULL,
	"weight" numeric(8, 3) DEFAULT '1' NOT NULL,
	"character_id" uuid,
	"scale_id" uuid,
	"scale_delta" integer,
	"scale_set_value" integer,
	"band_id" uuid,
	"uses_dice_value" boolean DEFAULT false NOT NULL,
	"flag_id" uuid,
	"flag_value" boolean,
	"block_external_id" text,
	"group_id" uuid,
	"membership_action" "membership_action",
	"group_role" "group_role",
	"tag_code" text,
	"tag_note" text,
	"related_character_id" uuid,
	"related_from_answer" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "effects_exactly_one_owner" CHECK (("effects"."rule_id" is not null) <> ("effects"."answer_option_id" is not null)),
	CONSTRAINT "effects_scale_value_range" CHECK ("effects"."scale_set_value" is null or "effects"."scale_set_value" between 1 and 10),
	CONSTRAINT "effects_related_single_source" CHECK (not ("effects"."related_character_id" is not null and "effects"."related_from_answer")),
	CONSTRAINT "effects_merge_needs_related" CHECK ("effects"."kind" <> 'domacnost_slouceni' or "effects"."related_character_id" is not null or "effects"."related_from_answer")
);
--> statement-breakpoint
CREATE TABLE "rule_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"rule_id" uuid NOT NULL,
	"group_index" integer DEFAULT 0 NOT NULL,
	"position" integer NOT NULL,
	"connector" "condition_connector" DEFAULT 'AND' NOT NULL,
	"negate" boolean DEFAULT false NOT NULL,
	"subject" "condition_subject" NOT NULL,
	"operator" "condition_operator" NOT NULL,
	"question_id" uuid,
	"answer_option_id" uuid,
	"scale_id" uuid,
	"band_id" uuid,
	"flag_id" uuid,
	"group_id" uuid,
	"character_id" uuid,
	"value_text" text,
	"value_number" integer,
	"value_bool" boolean,
	"value_list" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_conditions_position_key" UNIQUE("run_id","rule_id","group_index","position")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"chapter_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"weight" numeric(8, 3) DEFAULT '1' NOT NULL,
	"is_exclusion" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"applies_once_per_household" boolean DEFAULT false NOT NULL,
	"dice_sides" integer,
	"source_config_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rules_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "rules_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "rules_dice_sides_positive" CHECK ("rules"."dice_sides" is null or "rules"."dice_sides" >= 2)
);
--> statement-breakpoint
CREATE TABLE "computations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" "computation_kind" DEFAULT 'prepocet' NOT NULL,
	"status" "computation_status" DEFAULT 'navrh' NOT NULL,
	"parent_computation_id" uuid,
	"config_version_id" uuid NOT NULL,
	"engine_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"result_json" jsonb NOT NULL,
	"trace_json" jsonb NOT NULL,
	"conflicts_json" jsonb,
	"reason" text,
	"is_released" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "computations_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "computations_chapter_version_key" UNIQUE("run_id","chapter_id","version"),
	CONSTRAINT "computations_version_positive" CHECK ("computations"."version" >= 1),
	CONSTRAINT "computations_manual_has_parent" CHECK ("computations"."kind" <> 'rucni_uprava' or "computations"."parent_computation_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "character_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"flag_id" uuid NOT NULL,
	"value" boolean NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_flags_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","flag_id","computation_id")
);
--> statement-breakpoint
CREATE TABLE "character_scale_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"scale_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"raw_value" integer,
	"was_clamped" boolean DEFAULT false NOT NULL,
	"band_id" uuid,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_scale_values_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","scale_id","computation_id"),
	CONSTRAINT "character_scale_values_range" CHECK ("character_scale_values"."value" between 1 and 10),
	CONSTRAINT "character_scale_values_clamp_consistency" CHECK (("character_scale_values"."was_clamped" = false) or ("character_scale_values"."raw_value" is not null and "character_scale_values"."raw_value" <> "character_scale_values"."value"))
);
--> statement-breakpoint
CREATE TABLE "character_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_variables_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","key","computation_id"),
	CONSTRAINT "character_variables_key_format" CHECK ("character_variables"."key" ~ '^[A-Z0-9_]+$')
);
--> statement-breakpoint
CREATE TABLE "dice_rolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"sides" integer NOT NULL,
	"value" integer NOT NULL,
	"previous_value" integer,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"reroll_count" integer DEFAULT 0 NOT NULL,
	"rolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rolled_by" text NOT NULL,
	"reason" text,
	CONSTRAINT "dice_rolls_unique" UNIQUE("run_id","chapter_id","character_id","rule_id"),
	CONSTRAINT "dice_rolls_value_in_range" CHECK ("dice_rolls"."value" between 1 and "dice_rolls"."sides"),
	CONSTRAINT "dice_rolls_sides_sane" CHECK ("dice_rolls"."sides" >= 2)
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"role" "group_role" DEFAULT 'clen' NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_memberships_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","group_id","computation_id")
);
--> statement-breakpoint
CREATE TABLE "household_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_memberships_one_per_character" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","computation_id")
);
--> statement-breakpoint
CREATE TABLE "household_scale_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"scale_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"raw_value" integer,
	"was_clamped" boolean DEFAULT false NOT NULL,
	"band_id" uuid,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_scale_values_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","household_id","scale_id","computation_id"),
	CONSTRAINT "household_scale_values_range" CHECK ("household_scale_values"."value" between 1 and 10),
	CONSTRAINT "household_scale_values_clamp_consistency" CHECK (("household_scale_values"."was_clamped" = false) or ("household_scale_values"."raw_value" is not null and "household_scale_values"."raw_value" <> "household_scale_values"."value"))
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"kind" "template_kind" NOT NULL,
	"character_id" uuid,
	"group_id" uuid,
	"external_id" text,
	"name" text NOT NULL,
	"source_filename" text NOT NULL,
	"markdown" text NOT NULL,
	"parsed_blocks" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "templates_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "templates_target_matches_kind" CHECK (case "templates"."kind"
            when 'postava' then "templates"."character_id" is not null and "templates"."group_id" is null
            when 'skupina' then "templates"."group_id" is not null and "templates"."character_id" is null
            else "templates"."character_id" is null and "templates"."group_id" is null
          end)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid,
	"action" text NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" text,
	"summary" text,
	"value_before" jsonb,
	"value_after" jsonb,
	"rule_id" uuid,
	"computation_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_versions" ADD CONSTRAINT "config_versions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_home_group_fk" FOREIGN KEY ("run_id","home_group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_chapter_fk" FOREIGN KEY ("run_id","created_in_chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scale_bands" ADD CONSTRAINT "scale_bands_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scale_bands" ADD CONSTRAINT "scale_bands_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scales" ADD CONSTRAINT "scales_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scales" ADD CONSTRAINT "scales_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_fk" FOREIGN KEY ("run_id","question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_referenced_character_fk" FOREIGN KEY ("run_id","referenced_character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_answer_fk" FOREIGN KEY ("run_id","answer_id") REFERENCES "public"."answers"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_fk" FOREIGN KEY ("run_id","question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_rule_fk" FOREIGN KEY ("run_id","rule_id") REFERENCES "public"."rules"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_related_character_fk" FOREIGN KEY ("run_id","related_character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_band_fk" FOREIGN KEY ("run_id","band_id") REFERENCES "public"."scale_bands"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_flag_fk" FOREIGN KEY ("run_id","flag_id") REFERENCES "public"."flags"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_rule_fk" FOREIGN KEY ("run_id","rule_id") REFERENCES "public"."rules"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_question_fk" FOREIGN KEY ("run_id","question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_band_fk" FOREIGN KEY ("run_id","band_id") REFERENCES "public"."scale_bands"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_flag_fk" FOREIGN KEY ("run_id","flag_id") REFERENCES "public"."flags"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_config_version_fk" FOREIGN KEY ("run_id","source_config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_parent_fk" FOREIGN KEY ("run_id","parent_computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_config_version_fk" FOREIGN KEY ("run_id","config_version_id") REFERENCES "public"."config_versions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_flags" ADD CONSTRAINT "character_flags_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_flags" ADD CONSTRAINT "character_flags_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_flags" ADD CONSTRAINT "character_flags_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_flags" ADD CONSTRAINT "character_flags_flag_fk" FOREIGN KEY ("run_id","flag_id") REFERENCES "public"."flags"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_flags" ADD CONSTRAINT "character_flags_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_band_fk" FOREIGN KEY ("run_id","band_id") REFERENCES "public"."scale_bands"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_rule_fk" FOREIGN KEY ("run_id","rule_id") REFERENCES "public"."rules"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_band_fk" FOREIGN KEY ("run_id","band_id") REFERENCES "public"."scale_bands"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_scale_values" ADD CONSTRAINT "household_scale_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_rule_fk" FOREIGN KEY ("run_id","rule_id") REFERENCES "public"."rules"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "config_versions_one_active_per_run" ON "config_versions" USING btree ("run_id") WHERE "config_versions"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "computations_one_released_per_chapter" ON "computations" USING btree ("run_id","chapter_id") WHERE "computations"."is_released";--> statement-breakpoint
CREATE UNIQUE INDEX "templates_active_character" ON "templates" USING btree ("run_id","chapter_id","character_id") WHERE "templates"."is_active" and "templates"."kind" = 'postava';--> statement-breakpoint
CREATE UNIQUE INDEX "templates_active_group" ON "templates" USING btree ("run_id","chapter_id","group_id") WHERE "templates"."is_active" and "templates"."kind" = 'skupina';--> statement-breakpoint
CREATE UNIQUE INDEX "templates_active_singleton" ON "templates" USING btree ("run_id","chapter_id","kind") WHERE "templates"."is_active" and "templates"."kind" in ('highlighty', 'dotaznik');--> statement-breakpoint
CREATE INDEX "audit_log_run_created_idx" ON "audit_log" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("run_id","entity_kind","entity_id");