-- Refund request flow: artists request, admins approve/deny. Direct artist refunds removed.
alter table public.mixing_orders add column if not exists refund_requested_at timestamptz;
alter table public.mixing_orders add column if not exists refund_request_reason text;

-- Artist creates a refund request (no money moves yet)
create or replace function public.request_mix_refund(p_order_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_order record;
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    select * into v_order from public.mixing_orders where id = p_order_id;
    if not found then raise exception 'order not found'; end if;
    if v_order.artist_id != auth.uid() then raise exception 'not authorized'; end if;
    if v_order.status = 'refunded' then raise exception 'order already refunded'; end if;
    if v_order.status not in ('in_escrow','in_progress','delivered') then
        raise exception 'order cannot be refunded in its current state';
    end if;
    if v_order.refund_requested_at is not null then raise exception 'refund already requested - awaiting review'; end if;
    update public.mixing_orders
       set refund_requested_at = now(),
           refund_request_reason = nullif(trim(coalesce(p_reason,'')), ''),
           updated_at = now()
     where id = p_order_id;
end;
$$;

-- refund_mix is now ADMIN ONLY (artist self-refund removed)
create or replace function public.refund_mix(p_order_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order record;
    v_role text;
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    select * into v_order from public.mixing_orders where id = p_order_id;
    if not found then raise exception 'order not found'; end if;
    select role into v_role from public.profiles where id = auth.uid();
    if v_role != 'admin' then raise exception 'not authorized - admin only'; end if;
    if v_order.status not in ('in_escrow','in_progress','delivered') then
        raise exception 'order cannot be refunded';
    end if;

    update public.mixing_orders
       set status = 'refunded',
           admin_note = coalesce(p_reason, admin_note),
           refund_requested_at = null,
           refund_request_reason = null,
           updated_at = now()
     where id = p_order_id;

    update public.profiles set balance = balance + v_order.amount where id = v_order.artist_id;

    insert into public.transactions (user_id, amount, type, description, related_submission_id)
    values (v_order.artist_id, v_order.amount, 'refund',
            'Mixing refund: ' || v_order.package_name || ' — ' || v_order.song_title
                || coalesce(' (' || p_reason || ')', ''),
            v_order.submission_id);
end;
$$;

-- Admin resolves a refund request: approve (money moves) or deny (request cleared)
create or replace function public.resolve_mix_refund(p_order_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order record;
    v_role text;
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    select * into v_order from public.mixing_orders where id = p_order_id;
    if not found then raise exception 'order not found'; end if;
    select role into v_role from public.profiles where id = auth.uid();
    if v_role != 'admin' then raise exception 'not authorized - admin only'; end if;
    if v_order.refund_requested_at is null then raise exception 'no pending refund request'; end if;

    if p_approve then
        perform public.refund_mix(p_order_id, coalesce(p_note, 'refund request approved'));
    else
        update public.mixing_orders
           set refund_requested_at = null,
               refund_request_reason = null,
               admin_note = coalesce(p_note, admin_note),
               updated_at = now()
         where id = p_order_id;
    end if;
end;
$$;

grant execute on function public.request_mix_refund(uuid, text) to authenticated;
grant execute on function public.resolve_mix_refund(uuid, boolean, text) to authenticated;

-- Notify on mixing order updates (refund requested / denied emails handled in notify-user edge function)
drop trigger if exists on_mixing_order_notify_user on public.mixing_orders;
create trigger on_mixing_order_notify_user
after update on public.mixing_orders
for each row execute function public.notify_user_webhook();
