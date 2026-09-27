-- start_mix / deliver_mix were silent no-ops when the order's status did not
-- match (e.g. double-click, stale card): the UPDATE affected 0 rows and the
-- admin UI still toasted success. Raise instead so the UI shows the error.
create or replace function public.start_mix(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_updated int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role != 'admin' then raise exception 'not authorized'; end if;

  update public.mixing_orders
     set status = 'in_progress', updated_at = now()
   where id = p_order_id and status = 'in_escrow';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'order is not awaiting start (already started or refunded)';
  end if;
end;
$$;

create or replace function public.deliver_mix(p_order_id uuid, p_preview_link text, p_full_link text)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_updated int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role != 'admin' then raise exception 'not authorized'; end if;
  if p_preview_link is null or length(trim(p_preview_link)) = 0 then raise exception 'preview link required'; end if;

  update public.mixing_orders
     set preview_link = trim(p_preview_link),
         full_link = nullif(trim(p_full_link), ''),
         status = 'delivered', updated_at = now()
   where id = p_order_id and status in ('in_escrow','in_progress');
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'order cannot be delivered in its current status';
  end if;
end;
$$;
