-- supabase-product-reviews — follow-up to 20260824000000_create_product_reviews.sql.
-- Realtime DELETE events are filtered by clients on product_id
-- (product_id=eq.<id>). With the default replica identity, DELETE payloads
-- carry only the primary key, so Realtime cannot match the filter and the
-- event is never delivered — storefront subscribers kept showing deleted
-- reviews until a manual reload. REPLICA IDENTITY FULL makes DELETE payloads
-- carry the whole old row, so filters match and the storefront's
-- refetch-on-event handler removes the row instantly.
-- Additive + idempotent: safe to re-run.

alter table public.product_reviews replica identity full;
