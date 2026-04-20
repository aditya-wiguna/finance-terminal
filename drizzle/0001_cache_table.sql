CREATE TABLE IF NOT EXISTS "api_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"content" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_cache_key_idx" ON "api_cache"("cache_key");
CREATE INDEX IF NOT EXISTS "api_cache_expires_idx" ON "api_cache"("expires_at");
