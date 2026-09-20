-- The table now counts two things: sign-in attempts and public enquiries.
-- Renamed rather than dropped and recreated, so nobody's active lockout is
-- silently cleared by a deployment.
ALTER TABLE "login_attempts" RENAME TO "rate_limits";
ALTER INDEX "login_attempts_pkey" RENAME TO "rate_limits_pkey";
ALTER INDEX "login_attempts_scope_identity_ip_key" RENAME TO "rate_limits_scope_identity_ip_key";
ALTER SEQUENCE "login_attempts_id_seq" RENAME TO "rate_limits_id_seq";
