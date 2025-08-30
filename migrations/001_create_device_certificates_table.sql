-- Migration: 001_create_device_certificates_table.sql
-- Description: Create device certificates table for UUID subdomain SSL architecture
-- Date: 2024-12-20

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create device_certificates table
CREATE TABLE IF NOT EXISTS device_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  uuid_subdomain VARCHAR(255) UNIQUE NOT NULL,
  certificate_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  user_initials VARCHAR(100),
  device_name VARCHAR(255),
  
  -- Additional metadata
  certificate_type VARCHAR(50) DEFAULT 'wildcard',
  auto_renewal BOOLEAN DEFAULT true,
  premium BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_certificates_device_id ON device_certificates(device_id);
CREATE INDEX IF NOT EXISTS idx_device_certificates_uuid_subdomain ON device_certificates(uuid_subdomain);
CREATE INDEX IF NOT EXISTS idx_device_certificates_status ON device_certificates(status);
CREATE INDEX IF NOT EXISTS idx_device_certificates_expires_at ON device_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_certificates_created_at ON device_certificates(created_at);
CREATE INDEX IF NOT EXISTS idx_device_certificates_premium ON device_certificates(premium);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_certificates_status_expires ON device_certificates(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_device_certificates_device_status ON device_certificates(device_id, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_device_certificates_updated_at 
    BEFORE UPDATE ON device_certificates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.access_count = OLD.access_count + 1;
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to track access count (optional, can be enabled later)
-- CREATE TRIGGER track_device_certificate_access 
--     BEFORE UPDATE ON device_certificates 
--     FOR EACH ROW 
--     EXECUTE FUNCTION increment_access_count();

-- Add comments for documentation
COMMENT ON TABLE device_certificates IS 'Stores SSL certificate information for UUID subdomains (deviceId.myl.zip)';
COMMENT ON COLUMN device_certificates.device_id IS 'Unique device identifier from Chrome extension';
COMMENT ON COLUMN device_certificates.uuid_subdomain IS 'Generated subdomain (deviceId.myl.zip)';
COMMENT ON COLUMN device_certificates.certificate_data IS 'JSON object containing certificate details';
COMMENT ON COLUMN device_certificates.status IS 'Certificate status: active, expired, revoked, pending';
COMMENT ON COLUMN device_certificates.certificate_type IS 'Type of certificate: wildcard, single, multi';
COMMENT ON COLUMN device_certificates.auto_renewal IS 'Whether certificate should auto-renew';
COMMENT ON COLUMN device_certificates.premium IS 'Whether this is a premium certificate';
COMMENT ON COLUMN device_certificates.access_count IS 'Number of times certificate was accessed';
COMMENT ON COLUMN device_certificates.last_accessed_at IS 'Last time certificate was accessed';
