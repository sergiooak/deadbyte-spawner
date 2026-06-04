CREATE TABLE "command" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_slug" text NOT NULL,
	"command_key" text NOT NULL,
	"group" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_enabled" boolean DEFAULT true NOT NULL,
	"default_owner_only" boolean DEFAULT false NOT NULL,
	"supports_private" boolean DEFAULT true NOT NULL,
	"supports_groups" boolean DEFAULT true NOT NULL,
	"supports_implicit" boolean DEFAULT false NOT NULL,
	"config_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"first_seen_version_id" uuid,
	"last_seen_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_status_check" CHECK ("command"."status" in ('active', 'deprecated', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "command_alias" (
	"repository_slug" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"command_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_alias_repository_slug_normalized_alias_pk" PRIMARY KEY("repository_slug","normalized_alias")
);
--> statement-breakpoint
CREATE TABLE "command_execution" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "command_execution_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instance_slug" text NOT NULL,
	"command_id" uuid,
	"command_key" text NOT NULL,
	"repository_version_id" uuid,
	"chat_wid" text,
	"contact_wid" text,
	"message_id" text,
	"trigger_alias" text,
	"status" text NOT NULL,
	"duration_ms" integer,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_execution_status_check" CHECK ("command_execution"."status" in ('success', 'error', 'ignored', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "instance" (
	"slug" text PRIMARY KEY NOT NULL,
	"repository_slug" text NOT NULL,
	"repository_version_id" uuid,
	"name" text NOT NULL,
	"client_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"mode" text DEFAULT 'managed' NOT NULL,
	"branch" text NOT NULL,
	"commit_hash" text,
	"session_path" text NOT NULL,
	"repo_path" text NOT NULL,
	"runtime_config_path" text NOT NULL,
	"internal_host" text DEFAULT '127.0.0.1' NOT NULL,
	"internal_port" integer,
	"last_qr" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	"last_ready_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	CONSTRAINT "instance_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "instance_status_check" CHECK ("instance"."status" in ('created', 'installing', 'stopped', 'starting', 'waiting_qr', 'authenticated', 'ready', 'disconnected', 'stopping', 'crashed', 'error')),
	CONSTRAINT "instance_mode_check" CHECK ("instance"."mode" in ('standalone', 'managed'))
);
--> statement-breakpoint
CREATE TABLE "instance_command" (
	"instance_slug" text NOT NULL,
	"command_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"owner_only" boolean DEFAULT false NOT NULL,
	"description_override" text,
	"disabled_message" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_command_instance_slug_command_id_pk" PRIMARY KEY("instance_slug","command_id")
);
--> statement-breakpoint
CREATE TABLE "instance_command_alias" (
	"instance_slug" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"command_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_command_alias_instance_slug_normalized_alias_pk" PRIMARY KEY("instance_slug","normalized_alias"),
	CONSTRAINT "instance_command_alias_source_check" CHECK ("instance_command_alias"."source" in ('default', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "instance_daily_stat" (
	"instance_slug" text NOT NULL,
	"date" date NOT NULL,
	"private_chat_count" integer DEFAULT 0 NOT NULL,
	"group_chat_count" integer DEFAULT 0 NOT NULL,
	"contact_count" integer DEFAULT 0 NOT NULL,
	"incoming_message_count" integer DEFAULT 0 NOT NULL,
	"outgoing_message_count" integer DEFAULT 0 NOT NULL,
	"command_execution_count" integer DEFAULT 0 NOT NULL,
	"command_success_count" integer DEFAULT 0 NOT NULL,
	"command_error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_daily_stat_instance_slug_date_pk" PRIMARY KEY("instance_slug","date")
);
--> statement-breakpoint
CREATE TABLE "message_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instance_slug" text NOT NULL,
	"chat_wid" text,
	"contact_wid" text,
	"message_id" text,
	"direction" text NOT NULL,
	"chat_type" text,
	"message_type" text,
	"has_command" boolean DEFAULT false NOT NULL,
	"command_id" uuid,
	"command_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_event_direction_check" CHECK ("message_event"."direction" in ('incoming', 'outgoing')),
	CONSTRAINT "message_event_chat_type_check" CHECK ("message_event"."chat_type" is null or "message_event"."chat_type" in ('private', 'group'))
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"repository_url" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"package_manager" text DEFAULT 'pnpm' NOT NULL,
	"install_command" text DEFAULT 'pnpm install' NOT NULL,
	"build_command" text DEFAULT 'pnpm build' NOT NULL,
	"start_command" text DEFAULT 'node dist/cli/index.mjs start' NOT NULL,
	"manifest_command" text DEFAULT 'pnpm manifest' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_package_manager_check" CHECK ("repository"."package_manager" in ('pnpm', 'npm', 'yarn', 'bun'))
);
--> statement-breakpoint
CREATE TABLE "repository_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_slug" text NOT NULL,
	"branch" text NOT NULL,
	"commit_hash" text NOT NULL,
	"version" text,
	"manifest_hash" text NOT NULL,
	"manifest_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "runtime_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instance_slug" text,
	"event_name" text NOT NULL,
	"level" text NOT NULL,
	"message" text,
	"payload" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runtime_event_level_check" CHECK ("runtime_event"."level" in ('debug', 'info', 'warn', 'error', 'fatal'))
);
--> statement-breakpoint
CREATE TABLE "runtime_process_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "runtime_process_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"instance_slug" text NOT NULL,
	"stream" text NOT NULL,
	"line" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runtime_process_log_stream_check" CHECK ("runtime_process_log"."stream" in ('stdout', 'stderr'))
);
--> statement-breakpoint
CREATE TABLE "seen_chat" (
	"instance_slug" text NOT NULL,
	"wid" text NOT NULL,
	"name" text,
	"is_group" boolean,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seen_chat_instance_slug_wid_pk" PRIMARY KEY("instance_slug","wid")
);
--> statement-breakpoint
CREATE TABLE "seen_contact" (
	"instance_slug" text NOT NULL,
	"wid" text NOT NULL,
	"number" text,
	"name" text,
	"pushname" text,
	"is_my_contact" boolean,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seen_contact_instance_slug_wid_pk" PRIMARY KEY("instance_slug","wid")
);
--> statement-breakpoint
ALTER TABLE "command" ADD CONSTRAINT "command_repository_slug_repository_slug_fk" FOREIGN KEY ("repository_slug") REFERENCES "public"."repository"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command" ADD CONSTRAINT "command_first_seen_version_id_repository_version_id_fk" FOREIGN KEY ("first_seen_version_id") REFERENCES "public"."repository_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command" ADD CONSTRAINT "command_last_seen_version_id_repository_version_id_fk" FOREIGN KEY ("last_seen_version_id") REFERENCES "public"."repository_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_alias" ADD CONSTRAINT "command_alias_repository_slug_repository_slug_fk" FOREIGN KEY ("repository_slug") REFERENCES "public"."repository"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_alias" ADD CONSTRAINT "command_alias_command_id_command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_execution" ADD CONSTRAINT "command_execution_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_execution" ADD CONSTRAINT "command_execution_command_id_command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_execution" ADD CONSTRAINT "cmd_exec_repo_version_id_fk" FOREIGN KEY ("repository_version_id") REFERENCES "public"."repository_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance" ADD CONSTRAINT "instance_repository_slug_repository_slug_fk" FOREIGN KEY ("repository_slug") REFERENCES "public"."repository"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance" ADD CONSTRAINT "instance_repository_version_id_repository_version_id_fk" FOREIGN KEY ("repository_version_id") REFERENCES "public"."repository_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_command" ADD CONSTRAINT "instance_command_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_command" ADD CONSTRAINT "instance_command_command_id_command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_command_alias" ADD CONSTRAINT "instance_command_alias_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_command_alias" ADD CONSTRAINT "instance_command_alias_command_id_command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_daily_stat" ADD CONSTRAINT "instance_daily_stat_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_event" ADD CONSTRAINT "message_event_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_event" ADD CONSTRAINT "message_event_command_id_command_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."command"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_version" ADD CONSTRAINT "repository_version_repository_slug_repository_slug_fk" FOREIGN KEY ("repository_slug") REFERENCES "public"."repository"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_event" ADD CONSTRAINT "runtime_event_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_process_log" ADD CONSTRAINT "runtime_process_log_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seen_chat" ADD CONSTRAINT "seen_chat_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seen_contact" ADD CONSTRAINT "seen_contact_instance_slug_instance_slug_fk" FOREIGN KEY ("instance_slug") REFERENCES "public"."instance"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "command_repository_slug_command_key_unique" ON "command" USING btree ("repository_slug","command_key");--> statement-breakpoint
CREATE INDEX "command_repository_slug_status_idx" ON "command" USING btree ("repository_slug","status");--> statement-breakpoint
CREATE INDEX "command_repository_slug_command_key_idx" ON "command" USING btree ("repository_slug","command_key");--> statement-breakpoint
CREATE INDEX "command_alias_command_id_idx" ON "command_alias" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "command_alias_repository_slug_normalized_alias_idx" ON "command_alias" USING btree ("repository_slug","normalized_alias");--> statement-breakpoint
CREATE INDEX "command_execution_instance_slug_created_at_idx" ON "command_execution" USING btree ("instance_slug","created_at");--> statement-breakpoint
CREATE INDEX "command_execution_command_id_created_at_idx" ON "command_execution" USING btree ("command_id","created_at");--> statement-breakpoint
CREATE INDEX "command_execution_chat_wid_created_at_idx" ON "command_execution" USING btree ("chat_wid","created_at");--> statement-breakpoint
CREATE INDEX "command_execution_contact_wid_created_at_idx" ON "command_execution" USING btree ("contact_wid","created_at");--> statement-breakpoint
CREATE INDEX "command_execution_command_key_created_at_idx" ON "command_execution" USING btree ("command_key","created_at");--> statement-breakpoint
CREATE INDEX "instance_repository_slug_idx" ON "instance" USING btree ("repository_slug");--> statement-breakpoint
CREATE INDEX "instance_status_idx" ON "instance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "instance_command_instance_slug_enabled_idx" ON "instance_command" USING btree ("instance_slug","enabled");--> statement-breakpoint
CREATE INDEX "instance_command_command_id_idx" ON "instance_command" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "instance_command_alias_command_id_idx" ON "instance_command_alias" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "message_event_instance_slug_created_at_idx" ON "message_event" USING btree ("instance_slug","created_at");--> statement-breakpoint
CREATE INDEX "message_event_instance_slug_chat_wid_idx" ON "message_event" USING btree ("instance_slug","chat_wid");--> statement-breakpoint
CREATE INDEX "message_event_instance_slug_contact_wid_idx" ON "message_event" USING btree ("instance_slug","contact_wid");--> statement-breakpoint
CREATE INDEX "message_event_command_id_created_at_idx" ON "message_event" USING btree ("command_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_version_repository_slug_commit_hash_unique" ON "repository_version" USING btree ("repository_slug","commit_hash");--> statement-breakpoint
CREATE INDEX "repository_version_repository_slug_created_at_idx" ON "repository_version" USING btree ("repository_slug","created_at");--> statement-breakpoint
CREATE INDEX "runtime_event_instance_slug_created_at_idx" ON "runtime_event" USING btree ("instance_slug","created_at");--> statement-breakpoint
CREATE INDEX "runtime_process_log_instance_slug_created_at_idx" ON "runtime_process_log" USING btree ("instance_slug","created_at");--> statement-breakpoint
CREATE INDEX "seen_chat_instance_slug_last_seen_at_idx" ON "seen_chat" USING btree ("instance_slug","last_seen_at");--> statement-breakpoint
CREATE INDEX "seen_contact_instance_slug_last_seen_at_idx" ON "seen_contact" USING btree ("instance_slug","last_seen_at");