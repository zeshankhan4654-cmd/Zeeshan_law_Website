-- The diary capabilities did not exist when these chambers were created, so
-- their Clerk and Colleague roles carry no grant for them and would be
-- refused the diary they are supposed to keep. New chambers get these from
-- default-roles.ts; this is the same grant for the ones already here.
--
-- The Principal needs nothing: it holds every capability by rule rather than
-- by row, including ones added after it was made.
--
-- Written so that running it twice changes nothing.
INSERT INTO "role_caps" ("firm_id", "role_key", "cap")
SELECT r."firm_id", r."role_key", c."cap"
  FROM "roles" r
 CROSS JOIN (VALUES ('tasks.view'), ('tasks.edit')) AS c("cap")
 WHERE r."role_key" IN ('editor', 'associate')
ON CONFLICT DO NOTHING;
