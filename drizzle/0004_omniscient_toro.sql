CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_off_end_after_start" CHECK ("time_off"."end_at" > "time_off"."start_at")
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "working_hours_day_of_week_unique" UNIQUE("day_of_week"),
	CONSTRAINT "working_hours_end_after_start" CHECK ("working_hours"."end_time" > "working_hours"."start_time"),
	CONSTRAINT "working_hours_valid_day" CHECK ("working_hours"."day_of_week" BETWEEN 0 AND 6)
);
