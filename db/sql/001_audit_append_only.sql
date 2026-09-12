-- The audit log is append-only (§2, §13).
--
-- Drizzle cannot express this, so it is hand-written idempotent SQL run after
-- the migrations (`npm run db:sql`).
--
-- Without the trigger, "append-only" is a promise in documentation; with it the
-- database refuses an update even if the code gets it wrong.

create or replace function audit_log_append_only() returns trigger as $$
begin
  raise exception 'audit_log je append-only: % není povolen (§2 bod 2)', tg_op;
end;
$$ language plpgsql;

drop trigger if exists audit_log_no_update_delete on audit_log;

create trigger audit_log_no_update_delete
  before update or delete on audit_log
  for each row execute function audit_log_append_only();
