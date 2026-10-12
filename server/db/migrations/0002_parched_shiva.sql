ALTER TABLE "command_alias" DROP CONSTRAINT "command_alias_repository_slug_normalized_alias_pk";--> statement-breakpoint
ALTER TABLE "instance_command_alias" DROP CONSTRAINT "instance_command_alias_instance_slug_normalized_alias_pk";--> statement-breakpoint
ALTER TABLE "command_alias" ADD CONSTRAINT "command_alias_pk" PRIMARY KEY("repository_slug","command_id","normalized_alias");--> statement-breakpoint
ALTER TABLE "instance_command_alias" ADD CONSTRAINT "instance_command_alias_pk" PRIMARY KEY("instance_slug","command_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "instance_command_alias_instance_slug_normalized_alias_idx" ON "instance_command_alias" USING btree ("instance_slug","normalized_alias");