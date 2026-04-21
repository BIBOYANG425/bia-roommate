-- Migration: add 'sensitive' value to shipping_method enum.
-- Must be applied before 20260421_shipping_sensitive_route_seed.sql
-- (Postgres requires a new enum value to be committed before it can
-- be referenced, so the seed INSERT lives in a separate migration.)

ALTER TYPE public.shipping_method ADD VALUE IF NOT EXISTS 'sensitive';
