-- Audit log je append-only (§2 bod 2, §13).
--
-- Drizzle tohle nevyjádří, takže je to ruční SQL, které se pouští po migracích
-- (`npm run db:sql`). Je idempotentní.
--
-- Bez tohohle triggeru je "append-only" jen slib v dokumentaci. S ním to
-- databáze odmítne, i kdyby se v kódu spletl update.

create or replace function audit_log_append_only() returns trigger as $$
begin
  raise exception 'audit_log je append-only: % není povolen (§2 bod 2)', tg_op;
end;
$$ language plpgsql;

drop trigger if exists audit_log_no_update_delete on audit_log;

create trigger audit_log_no_update_delete
  before update or delete on audit_log
  for each row execute function audit_log_append_only();
