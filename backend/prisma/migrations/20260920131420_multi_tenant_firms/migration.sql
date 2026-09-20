-- Turning one chamber's system into a platform of chambers.
--
-- Written by hand rather than generated: every table already holds rows,
-- and a generated migration would either drop them or refuse a NOT NULL
-- column with no default. The order matters — create the firm, give every
-- existing row to it, and only then require the column.

-- 1. The chamber itself ------------------------------------------------------

CREATE TABLE "firms" (
    "id"               SERIAL       NOT NULL,
    "slug"             TEXT         NOT NULL,
    "name"             TEXT         NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'active',
    "suspended_reason" TEXT         NOT NULL DEFAULT '',
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "firms_slug_key" ON "firms"("slug");

-- Everything that exists today belongs to the first chamber.
INSERT INTO "firms" ("slug", "name", "updated_at")
VALUES ('arbitrator-law', 'The Arbitrator & Law Associates', CURRENT_TIMESTAMP);

-- 2. The firm key on every chamber-scoped table ------------------------------
--
-- Added nullable, backfilled to the first chamber, then made NOT NULL. A
-- DO block keeps the three steps together per table rather than repeating
-- them twenty times.

DO $$
DECLARE
    first_firm INTEGER;
    t TEXT;
    scoped TEXT[] := ARRAY[
        'users', 'roles', 'role_caps', 'push_tokens',
        'clients', 'cases', 'hearings', 'case_updates', 'case_messages',
        'documents', 'fees', 'official_fees', 'expenses', 'communications',
        'judgments', 'research', 'media',
        'enquiries', 'settings', 'testimonials', 'posts'
    ];
BEGIN
    SELECT "id" INTO first_firm FROM "firms" ORDER BY "id" LIMIT 1;

    FOREACH t IN ARRAY scoped LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN "firm_id" INTEGER', t);
        EXECUTE format('UPDATE %I SET "firm_id" = %s', t, first_firm);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN "firm_id" SET NOT NULL', t);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("firm_id")
                 REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE',
            t, t || '_firm_id_fkey'
        );
        EXECUTE format('CREATE INDEX %I ON %I("firm_id")', t || '_firm_id_idx', t);
    END LOOP;
END $$;

-- 3. Keys that were unique across the system are now unique per chamber ------

-- Two chambers may each have a role called "clerk".
DROP INDEX "roles_role_key_key";
CREATE UNIQUE INDEX "roles_firm_id_role_key_key" ON "roles"("firm_id", "role_key");

ALTER TABLE "role_caps" DROP CONSTRAINT "role_caps_pkey";
ALTER TABLE "role_caps" ADD CONSTRAINT "role_caps_pkey"
    PRIMARY KEY ("firm_id", "role_key", "cap");

-- Each chamber keeps its own address and telephone number.
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";
ALTER TABLE "settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("firm_id", "skey");

-- Two chambers may each write an article at /blog/limitation.
DROP INDEX "posts_slug_key";
CREATE UNIQUE INDEX "posts_firm_id_slug_key" ON "posts"("firm_id", "slug");

-- 4. Indexes that should lead with the chamber -------------------------------

DROP INDEX "posts_published_published_on_idx";
CREATE INDEX "posts_firm_id_published_published_on_idx"
    ON "posts"("firm_id", "published", "published_on");

DROP INDEX "testimonials_published_sort_order_idx";
CREATE INDEX "testimonials_firm_id_published_sort_order_idx"
    ON "testimonials"("firm_id", "published", "sort_order");

DROP INDEX "push_tokens_kind_subject_id_idx";
CREATE INDEX "push_tokens_firm_id_kind_subject_id_idx"
    ON "push_tokens"("firm_id", "kind", "subject_id");
