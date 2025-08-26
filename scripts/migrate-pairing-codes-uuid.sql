-- Migration script to add UUID support to pairing codes
-- Version: 1.0.0
-- Created: 2024-01-01
-- Description: Updates pairing_codes table to support UUID format and format tracking

-- Step 1: Add format column to pairing_codes table
ALTER TABLE pairing_codes 
ADD COLUMN IF NOT EXISTS format VARCHAR(10) DEFAULT 'uuid';

-- Step 2: Update existing records to have 'legacy' format
UPDATE pairing_codes 
SET format = 'legacy' 
WHERE format IS NULL OR format = 'uuid';

-- Step 3: Extend code column to support UUID format (36 characters)
-- Note: This may fail if there are existing codes longer than 6 characters
-- In that case, you may need to clean up existing data first
ALTER TABLE pairing_codes 
ALTER COLUMN code TYPE VARCHAR(36);

-- Step 4: Add index for format column
CREATE INDEX IF NOT EXISTS idx_pairing_codes_format ON pairing_codes(format);

-- Step 5: Update the cleanup function to handle different formats
CREATE OR REPLACE FUNCTION cleanup_expired_pairing_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM pairing_codes 
  WHERE expires_at < CURRENT_TIMESTAMP 
  AND is_used = false;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add constraint to ensure format is valid
ALTER TABLE pairing_codes 
ADD CONSTRAINT chk_pairing_codes_format 
CHECK (format IN ('uuid', 'short', 'legacy'));

-- Step 7: Add constraint to ensure code length matches format
-- This is a complex constraint that checks format-specific length requirements
CREATE OR REPLACE FUNCTION validate_pairing_code_format()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate code length based on format
  CASE NEW.format
    WHEN 'uuid' THEN
      IF LENGTH(NEW.code) != 36 THEN
        RAISE EXCEPTION 'UUID format requires 36 characters, got %', LENGTH(NEW.code);
      END IF;
      -- Basic UUID format validation (simplified)
      IF NEW.code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid UUID format: %', NEW.code;
      END IF;
    WHEN 'short' THEN
      IF LENGTH(NEW.code) != 12 THEN
        RAISE EXCEPTION 'Short format requires 12 characters, got %', LENGTH(NEW.code);
      END IF;
      -- Basic hex validation
      IF NEW.code !~ '^[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid short format: %', NEW.code;
      END IF;
    WHEN 'legacy' THEN
      IF LENGTH(NEW.code) != 6 THEN
        RAISE EXCEPTION 'Legacy format requires 6 characters, got %', LENGTH(NEW.code);
      END IF;
      -- Basic numeric validation
      IF NEW.code !~ '^\d{6}$' THEN
        RAISE EXCEPTION 'Invalid legacy format: %', NEW.code;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid format: %', NEW.format;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to validate pairing code format
DROP TRIGGER IF EXISTS trigger_validate_pairing_code_format ON pairing_codes;
CREATE TRIGGER trigger_validate_pairing_code_format
  BEFORE INSERT OR UPDATE ON pairing_codes
  FOR EACH ROW EXECUTE FUNCTION validate_pairing_code_format();

-- Step 9: Create view for active pairing codes with format information
CREATE OR REPLACE VIEW active_pairing_codes AS
SELECT 
  pc.*,
  d.device_type,
  d.device_version,
  CASE 
    WHEN pc.format = 'uuid' THEN 'UUID v4'
    WHEN pc.format = 'short' THEN '12-char hex'
    WHEN pc.format = 'legacy' THEN '6-digit numeric'
    ELSE 'Unknown'
  END as format_description
FROM pairing_codes pc
JOIN devices d ON pc.device_id = d.device_id
WHERE pc.expires_at > CURRENT_TIMESTAMP 
AND pc.is_used = false
AND d.is_active = true;

-- Step 10: Create function to generate pairing codes with format support
CREATE OR REPLACE FUNCTION generate_pairing_code(
  p_device_id VARCHAR(255),
  p_format VARCHAR(10) DEFAULT 'uuid',
  p_expires_in_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(
  code VARCHAR(36),
  format VARCHAR(10),
  expires_at TIMESTAMP
) AS $$
DECLARE
  generated_code VARCHAR(36);
  expires_time TIMESTAMP;
BEGIN
  -- Calculate expiration time
  expires_time := CURRENT_TIMESTAMP + (p_expires_in_minutes || ' minutes')::INTERVAL;
  
  -- Generate code based on format
  CASE p_format
    WHEN 'uuid' THEN
      generated_code := gen_random_uuid()::VARCHAR;
    WHEN 'short' THEN
      generated_code := encode(gen_random_bytes(6), 'hex');
    WHEN 'legacy' THEN
      generated_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    ELSE
      RAISE EXCEPTION 'Invalid format: %', p_format;
  END CASE;
  
  -- Insert the pairing code
  INSERT INTO pairing_codes (code, device_id, format, expires_at)
  VALUES (generated_code, p_device_id, p_format, expires_time);
  
  -- Return the generated code
  RETURN QUERY SELECT generated_code, p_format, expires_time;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create function to verify pairing codes with format support
CREATE OR REPLACE FUNCTION verify_pairing_code(
  p_code VARCHAR(36),
  p_format VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE(
  device_id VARCHAR(255),
  format VARCHAR(10),
  expires_at TIMESTAMP,
  is_valid BOOLEAN
) AS $$
DECLARE
  detected_format VARCHAR(10);
  code_record RECORD;
BEGIN
  -- Detect format if not provided
  IF p_format IS NULL THEN
    CASE 
      WHEN p_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        detected_format := 'uuid';
      WHEN p_code ~ '^[0-9a-f]{12}$' THEN
        detected_format := 'short';
      WHEN p_code ~ '^\d{6}$' THEN
        detected_format := 'legacy';
      ELSE
        detected_format := 'unknown';
    END CASE;
  ELSE
    detected_format := p_format;
  END IF;
  
  -- If format is unknown, return invalid
  IF detected_format = 'unknown' THEN
    RETURN QUERY SELECT NULL::VARCHAR(255), 'unknown', NULL::TIMESTAMP, false;
    RETURN;
  END IF;
  
  -- Look up the code
  SELECT pc.device_id, pc.format, pc.expires_at
  INTO code_record
  FROM pairing_codes pc
  WHERE pc.code = p_code 
  AND pc.format = detected_format
  AND pc.expires_at > CURRENT_TIMESTAMP
  AND pc.is_used = false;
  
  -- Return result
  IF code_record.device_id IS NOT NULL THEN
    RETURN QUERY SELECT code_record.device_id, code_record.format, code_record.expires_at, true;
  ELSE
    RETURN QUERY SELECT NULL::VARCHAR(255), detected_format, NULL::TIMESTAMP, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add comments for documentation
COMMENT ON COLUMN pairing_codes.format IS 'Format of the pairing code: uuid, short, or legacy';
COMMENT ON COLUMN pairing_codes.code IS 'The pairing code (6-36 characters depending on format)';
COMMENT ON FUNCTION generate_pairing_code IS 'Generates a pairing code with the specified format';
COMMENT ON FUNCTION verify_pairing_code IS 'Verifies a pairing code and returns device information';
COMMENT ON VIEW active_pairing_codes IS 'View of active, unused pairing codes with device information';

-- Step 13: Create sample data for testing (optional)
-- Uncomment the following lines to create test data
/*
INSERT INTO devices (device_id, device_type, device_version, fingerprint_hash, public_key, encrypted_metadata)
VALUES 
  ('test-device-uuid', 'chrome-extension', '2.0.0', 'test-fingerprint-uuid', 'test-public-key', 'test-metadata'),
  ('test-device-short', 'chrome-extension', '2.0.0', 'test-fingerprint-short', 'test-public-key', 'test-metadata'),
  ('test-device-legacy', 'chrome-extension', '2.0.0', 'test-fingerprint-legacy', 'test-public-key', 'test-metadata');

-- Generate test pairing codes
SELECT * FROM generate_pairing_code('test-device-uuid', 'uuid', 10);
SELECT * FROM generate_pairing_code('test-device-short', 'short', 10);
SELECT * FROM generate_pairing_code('test-device-legacy', 'legacy', 10);
*/

-- Migration completed successfully
SELECT 'Pairing codes UUID migration completed successfully' as status;
