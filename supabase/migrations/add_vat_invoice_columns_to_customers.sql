-- =============================================
-- Migration: Add VAT Invoice columns to Customers
-- Date: 2026-06-11
-- Purpose: Support VAT invoice lookup feature
-- Instructions: Copy and run this in Supabase SQL Editor
-- =============================================

-- Add 5 nullable columns for VAT invoice info
ALTER TABLE "Customers"
ADD COLUMN IF NOT EXISTS "taxCode" text,
ADD COLUMN IF NOT EXISTS "companyName" text,
ADD COLUMN IF NOT EXISTS "companyAddress" text,
ADD COLUMN IF NOT EXISTS "companyEmail" text,
ADD COLUMN IF NOT EXISTS "companyPhone" text;

-- Add comment for documentation
COMMENT ON COLUMN "Customers"."taxCode" IS 'Tax code (MST) of the business for VAT invoice';
COMMENT ON COLUMN "Customers"."companyName" IS 'Company name retrieved from VietQR API';
COMMENT ON COLUMN "Customers"."companyAddress" IS 'Company address retrieved from VietQR API';
COMMENT ON COLUMN "Customers"."companyEmail" IS 'Company email manually entered by customer';
COMMENT ON COLUMN "Customers"."companyPhone" IS 'Company phone manually entered by customer';
