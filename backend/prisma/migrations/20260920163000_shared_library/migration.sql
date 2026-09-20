-- The shared library: a chamber may offer an entry to every other chamber,
-- and only the platform admin can complete that.
--
-- A separate axis from `published`, which stays the chamber's own decision
-- about its own website.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['judgments', 'research', 'media'] LOOP
    EXECUTE format(
      'ALTER TABLE %I
         ADD COLUMN "share_state"  TEXT NOT NULL DEFAULT ''private'',
         ADD COLUMN "shared_at"    TIMESTAMP(3),
         ADD COLUMN "share_note"   TEXT NOT NULL DEFAULT '''',
         ADD COLUMN "submitted_by" TEXT NOT NULL DEFAULT ''''', t);

    EXECUTE format(
      'CREATE INDEX %I ON %I("share_state", "shared_at")',
      t || '_share_state_shared_at_idx', t);
  END LOOP;
END $$;

-- The platform chamber's already-published entries keep appearing exactly
-- where they appear today.
--
-- Before this migration the public library was that chamber's published
-- entries; after it, it is every verified chamber's approved ones. Without
-- this backfill the website would silently empty out. Only the platform's
-- own chamber is touched: no other chamber's work is opted into being
-- published under anybody's name without them asking.
DO $$
DECLARE
  platform_firm INT;
  t TEXT;
BEGIN
  SELECT MIN("id") INTO platform_firm FROM "firms";
  IF platform_firm IS NULL THEN RETURN; END IF;

  FOREACH t IN ARRAY ARRAY['judgments', 'research', 'media'] LOOP
    EXECUTE format(
      'UPDATE %I
          SET "share_state" = ''approved'',
              "shared_at"   = "created_at",
              "share_note"  = ''Published by the chamber before the shared library existed.''
        WHERE "firm_id" = $1 AND "published" = true', t)
    USING platform_firm;
  END LOOP;
END $$;
