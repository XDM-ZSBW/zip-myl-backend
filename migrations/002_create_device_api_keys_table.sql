-- Migration: 002_create_device_api_keys_table.sql
-- Description: Create device API keys table for UUID subdomain architecture
-- Date: 2024-12-20

-- Create device_api_keys table
CREATE TABLE IF NOT EXISTS device_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256 hash of API key
  device_name VARCHAR(255),
  user_initials VARCHAR(100),
  permissions JSONB DEFAULT '["ssl:read", "device:read", "api:access"]',
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  uuid_subdomain VARCHAR(255),
  
  -- Foreign key reference
  FOREIGN KEY (device_id) REFERENCES device_certificates(device_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_api_keys_device_id ON device_api_keys(device_id);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_key_hash ON device_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_api_key ON device_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_is_active ON device_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_expires_at ON device_api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_last_used_at ON device_api_keys(last_used_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_api_keys_active_expires ON device_api_keys(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_device_api_keys_device_active ON device_api_keys(device_id, is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_device_api_keys_updated_at 
    BEFORE UPDATE ON device_api_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.usage_count = OLD.usage_count + 1;
    NEW.last_used_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to track API key usage
CREATE TRIGGER track_api_key_usage 
    BEFORE UPDATE ON device_api_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION increment_api_key_usage();

-- Add comments for documentation
COMMENT ON TABLE device_api_keys IS 'Stores API keys for devices with UUID subdomain SSL certificates';
COMMENT ON COLUMN device_api_keys.device_id IS 'Reference to device_certificates table';
COMMENT ON COLUMN device_api_keys.api_key IS 'Plain text API key (only stored temporarily)';
COMMENT ON COLUMN device_api_keys.key_hash IS 'SHA256 hash of API key for secure storage';
COMMENT ON COLUMN device_api_keys.permissions IS 'JSON array of permissions granted to this API key';
COMMENT ON COLUMN device_api_keys.rate_limit IS 'Maximum requests per hour for this API key';
COMMENT ON COLUMN device_api_keys.usage_count IS 'Number of times this API key was used';
COMMENT ON COLUMN device_api_keys.last_used_at IS 'Last time this API key was used';
COMMENT ON COLUMN device_api_keys.uuid_subdomain IS 'Associated UUID subdomain for this device';
