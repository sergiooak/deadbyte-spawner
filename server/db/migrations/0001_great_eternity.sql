ALTER TABLE "instance" ADD COLUMN IF NOT EXISTS "auto_start" boolean DEFAULT false NOT NULL;
