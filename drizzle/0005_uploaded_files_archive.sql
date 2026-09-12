CREATE TYPE "public"."upload_kind" AS ENUM('konfigurace', 'sablona');--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"filename" text NOT NULL,
	"content" "bytea" NOT NULL,
	"import_report" jsonb,
	"note" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "uploaded_files_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
ALTER TABLE "computations" ADD COLUMN "config_upload_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_config_upload_fk" FOREIGN KEY ("run_id","config_upload_id") REFERENCES "public"."uploaded_files"("run_id","id") ON DELETE restrict ON UPDATE no action;