CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sector" text NOT NULL,
	"sensors" text[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assets_name_unique" UNIQUE("name")
);
