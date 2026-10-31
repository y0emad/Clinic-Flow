CREATE TYPE "public"."role" AS ENUM('DOCTOR', 'PATIENT');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"otp" text,
	"time_otp" timestamp with time zone,
	"role" "role" DEFAULT 'PATIENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
