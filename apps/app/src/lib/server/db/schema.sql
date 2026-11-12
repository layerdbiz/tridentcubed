CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);

--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" uuid,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);

--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);

--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'team' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inviter_id" uuid NOT NULL
);

--> statement-breakpoint
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "organization_details" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"email_domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "organization_details" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "access_grant" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"team_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "access_grant" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"types" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"logo" text DEFAULT '' NOT NULL,
	"picture" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL
);

--> statement-breakpoint
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"customer_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"photo" text DEFAULT '' NOT NULL
);

--> statement-breakpoint
ALTER TABLE "contact" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "change" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"before" jsonb,
	"after" jsonb
);

--> statement-breakpoint
ALTER TABLE "change" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"for_table" text NOT NULL,
	"for_column" text NOT NULL,
	"for_id" uuid,
	"path" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"taken_at" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"taken_from" text DEFAULT '' NOT NULL,
	"uploaded_by" uuid
);

--> statement-breakpoint
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_details" ADD CONSTRAINT "organization_details_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "access_grant" ADD CONSTRAINT "access_grant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_idx" ON "member" USING btree ("organization_id","user_id");
--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_details_email_domain_idx" ON "organization_details" USING btree ("email_domain");
--> statement-breakpoint
CREATE UNIQUE INDEX "access_grant_email_organization_idx" ON "access_grant" USING btree ("email","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_name_idx" ON "customer" USING btree ("organization_id",lower(name)) WHERE deleted_at is null;
--> statement-breakpoint
CREATE INDEX "contact_customer_idx" ON "contact" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX "change_row_idx" ON "change" USING btree ("table_name","row_id");
--> statement-breakpoint
CREATE POLICY "user is the acting user" ON "user" AS PERMISSIVE FOR SELECT TO "trident_app" USING (id = app.user_id());
--> statement-breakpoint
CREATE POLICY "organization is the acting one" ON "organization" AS PERMISSIVE FOR SELECT TO "trident_app" USING (id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "organization name changes in the acting one" ON "organization" AS PERMISSIVE FOR UPDATE TO "trident_app" USING (id = app.organization_id()) WITH CHECK (id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "member in the acting organization" ON "member" AS PERMISSIVE FOR ALL TO "trident_app" USING (organization_id = app.organization_id()) WITH CHECK (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "member is the acting user" ON "member" AS PERMISSIVE FOR SELECT TO "trident_app" USING (user_id = app.user_id());
--> statement-breakpoint
CREATE POLICY "organization_details in the acting organization" ON "organization_details" AS PERMISSIVE FOR ALL TO "trident_app" USING (organization_id = app.organization_id()) WITH CHECK (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "customer in the acting organization" ON "customer" AS PERMISSIVE FOR ALL TO "trident_app" USING (organization_id = app.organization_id()) WITH CHECK (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "contact in the acting organization" ON "contact" AS PERMISSIVE FOR ALL TO "trident_app" USING (organization_id = app.organization_id()) WITH CHECK (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "change is read in the acting organization" ON "change" AS PERMISSIVE FOR SELECT TO "trident_app" USING (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "change is added in the acting organization" ON "change" AS PERMISSIVE FOR INSERT TO "trident_app" WITH CHECK (organization_id = app.organization_id());
--> statement-breakpoint
CREATE POLICY "file in the acting organization" ON "file" AS PERMISSIVE FOR ALL TO "trident_app" USING (organization_id = app.organization_id()) WITH CHECK (organization_id = app.organization_id());
