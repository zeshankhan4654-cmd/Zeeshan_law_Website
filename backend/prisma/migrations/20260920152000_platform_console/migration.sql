-- The platform console: who may run the platform, and a record of what they do.

-- ---------------------------------------------------------------------------
-- Who runs the platform
-- ---------------------------------------------------------------------------
-- A property of a person, not of a chamber. Tying it to "any Principal of
-- the first chamber" would mean a colleague made Principal silently acquires
-- the power to suspend other advocates' practices.
ALTER TABLE "users" ADD COLUMN "platform_admin" BOOLEAN NOT NULL DEFAULT false;

-- Nobody is granted it here. It is given from the command line
-- (npm run platform:grant -- <email>) so that standing up a fresh database
-- does not quietly create someone who can suspend other people's chambers.

-- ---------------------------------------------------------------------------
-- What they did, and why
-- ---------------------------------------------------------------------------
CREATE TABLE "platform_audit" (
    "id"                SERIAL       NOT NULL,
    "actor_id"          INTEGER      NOT NULL,
    "actor_email"       TEXT         NOT NULL,
    "action"            TEXT         NOT NULL,
    "firm_id_acted_on"  INTEGER      NOT NULL,
    "firm_slug"         TEXT         NOT NULL,
    "reason"            TEXT         NOT NULL DEFAULT '',
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_pkey" PRIMARY KEY ("id")
);

-- No foreign keys on purpose. The record has to outlive both the admin's
-- account and the chamber it was about — an audit trail that disappears when
-- somebody deletes the thing it is about is not an audit trail.
CREATE INDEX "platform_audit_firm_id_acted_on_created_at_idx"
  ON "platform_audit"("firm_id_acted_on", "created_at");
CREATE INDEX "platform_audit_created_at_idx" ON "platform_audit"("created_at");
