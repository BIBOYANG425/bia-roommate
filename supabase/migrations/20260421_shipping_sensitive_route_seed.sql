-- Seed the sensitive shipping route (placeholder — admin fills
-- in dates/pricing via /api/shipping/admin/routes).
-- Depends on 20260420_shipping_sensitive_method.sql being applied.

INSERT INTO public.shipping_routes (method, label, transit_days_estimate, notes)
VALUES (
  'sensitive',
  '敏感货专线',
  25,
  '可收含电池电子、化妆品、液体、粉末；价格/时效另行报价'
)
ON CONFLICT DO NOTHING;
