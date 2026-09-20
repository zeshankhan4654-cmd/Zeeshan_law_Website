-- Email sign-in, per-chamber handles, and chamber verification.
--
-- Written by hand rather than generated. A generated migration would drop
-- `users.username`'s unique index and add a NOT NULL `email` with no value
-- in it, which fails on the first existing row. Every account that exists
-- today pre-dates email sign-in and has to be given an address it can sign
-- in with before the column can be made required.

-- ---------------------------------------------------------------------------
-- Chambers: verification
-- ---------------------------------------------------------------------------
ALTER TABLE "firms" ADD COLUMN "verified"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "firms" ADD COLUMN "enrolment_no" TEXT    NOT NULL DEFAULT '';

-- The first chamber is the platform's own, so it is verified by definition:
-- the person who runs the platform does not have to verify himself.
UPDATE "firms" SET "verified" = true
WHERE "id" = (SELECT MIN("id") FROM "firms");

-- ---------------------------------------------------------------------------
-- Staff: email becomes the sign-in, username becomes a per-chamber handle
-- ---------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN "email" TEXT;

-- A placeholder each existing account can sign in with immediately. `.invalid`
-- is reserved by RFC 2606 and can never be a real domain, so this is honest
-- about being a stand-in and can never collide with somebody's real address.
-- Holders replace it from Settings; nothing is sent to these addresses.
UPDATE "users" AS u
SET "email" = u."username" || '@' || f."slug" || '.invalid'
FROM "firms" AS f
WHERE f."id" = u."firm_id" AND u."email" IS NULL;

-- Guard: refuse to continue rather than create a broken sign-in. Two accounts
-- cannot share a username within one chamber today (username was globally
-- unique until this migration), so this should never fire — but a NOT NULL
-- added over a duplicate would leave somebody unable to sign in at all.
DO $$
DECLARE clashes INT;
BEGIN
  SELECT COUNT(*) INTO clashes FROM (
    SELECT "email" FROM "users" GROUP BY "email" HAVING COUNT(*) > 1
  ) AS dupes;
  IF clashes > 0 THEN
    RAISE EXCEPTION 'Backfilled % duplicate email address(es); resolve before migrating.', clashes;
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

DROP INDEX "users_username_key";
CREATE UNIQUE INDEX "users_firm_id_username_key" ON "users"("firm_id", "username");

-- ---------------------------------------------------------------------------
-- Clients: the portal username becomes per-chamber
-- ---------------------------------------------------------------------------
-- NULLs stay distinct under a Postgres unique index, so clients without
-- portal access are unaffected.
DROP INDEX "clients_portal_username_key";
CREATE UNIQUE INDEX "clients_firm_id_portal_username_key"
  ON "clients"("firm_id", "portal_username");
