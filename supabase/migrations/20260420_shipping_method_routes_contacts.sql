-- Migration: shipping_method enum, parcels.shipping_method column,
-- shipping_routes table, shipping_contacts table with seed data.
--
-- Apply via Supabase MCP `apply_migration` or `psql`.

-- 1a. shipping_method enum + parcels column
CREATE TYPE public.shipping_method AS ENUM ('sea', 'air');

ALTER TABLE public.parcels
  ADD COLUMN shipping_method public.shipping_method;

-- 1b. shipping_routes table (schedule + pricing)
CREATE TABLE public.shipping_routes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method      public.shipping_method NOT NULL,
  label       text NOT NULL,
  price_per_kg_cny numeric(8,2),
  next_departure_date date,
  estimated_arrival_date date,
  transit_days_estimate int,
  cutoff_note text,
  notes       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One active route per method
CREATE UNIQUE INDEX idx_shipping_routes_active_method
  ON public.shipping_routes (method)
  WHERE active = true;

-- Reuse existing trigger function
CREATE TRIGGER trg_shipping_routes_updated_at
  BEFORE UPDATE ON public.shipping_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: public read for active rows, service-role writes
ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active shipping routes"
  ON public.shipping_routes FOR SELECT
  USING (active = true);

-- 1c. shipping_contacts table
CREATE TABLE public.shipping_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN ('wechat_group', 'wechat_personal', 'email', 'george_bot')),
  value         text NOT NULL DEFAULT '待配置',
  label         text NOT NULL,
  label_en      text,
  qr_code_url   text,
  display_order int NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_shipping_contacts_updated_at
  BEFORE UPDATE ON public.shipping_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.shipping_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active shipping contacts"
  ON public.shipping_contacts FOR SELECT
  USING (active = true);

-- Seed: placeholder routes
INSERT INTO public.shipping_routes (method, label, transit_days_estimate, notes)
VALUES
  ('sea', '海运专线', 30, '经济实惠，适合不急的大件'),
  ('air', '空运急件', 10, '速度快，适合急用物品');

-- Seed: placeholder contacts
INSERT INTO public.shipping_contacts (type, label, label_en, display_order)
VALUES
  ('wechat_group', 'BIA 集运群', 'BIA Shipping Group', 1),
  ('wechat_personal', 'BIA 运营微信', 'BIA Ops WeChat', 2),
  ('email', 'BIA 邮箱', 'BIA Email', 3),
  ('george_bot', 'George Bot', 'George Bot', 4);
