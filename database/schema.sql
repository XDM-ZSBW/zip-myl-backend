-- Myl.Zip Device Registration & Trust Management Database Schema
-- Version: 2.0.0
-- Created: 2025-08-26

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  device_version VARCHAR(20) NOT NULL,
  fingerprint_hash VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_metadata TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device Trust Table
CREATE TABLE IF NOT EXISTS device_trust (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_device_id VARCHAR(255) NOT NULL,
  target_device_id VARCHAR(255) NOT NULL,
  trust_level INTEGER DEFAULT 1, -- 1=paired, 2=verified, 3=trusted
  encrypted_trust_data TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (source_device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (target_device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  UNIQUE(source_device_id, target_device_id)
);

-- Pairing Codes Table
CREATE TABLE IF NOT EXISTS pairing_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(36) UNIQUE NOT NULL, -- Support both UUID (36 chars) and short format (12 chars)
  device_id VARCHAR(255) NOT NULL,
  format VARCHAR(10) DEFAULT 'uuid', -- 'uuid' or 'short'
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Key Exchange Table
CREATE TABLE IF NOT EXISTS key_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_device_id VARCHAR(255) NOT NULL,
  target_device_id VARCHAR(255) NOT NULL,
  encrypted_key_data TEXT NOT NULL,
  exchange_type VARCHAR(50) DEFAULT 'initial', -- initial, rotation, recovery
  is_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (source_device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  FOREIGN KEY (target_device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Device Sessions Table
CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  encrypted_session_data TEXT,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  encrypted_details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);

CREATE INDEX IF NOT EXISTS idx_device_trust_source ON device_trust(source_device_id);
CREATE INDEX IF NOT EXISTS idx_device_trust_target ON device_trust(target_device_id);
CREATE INDEX IF NOT EXISTS idx_device_trust_active ON device_trust(is_active);
CREATE INDEX IF NOT EXISTS idx_device_trust_level ON device_trust(trust_level);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_device ON pairing_codes(device_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_used ON pairing_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_format ON pairing_codes(format);

CREATE INDEX IF NOT EXISTS idx_key_exchanges_source ON key_exchanges(source_device_id);
CREATE INDEX IF NOT EXISTS idx_key_exchanges_target ON key_exchanges(target_device_id);
CREATE INDEX IF NOT EXISTS idx_key_exchanges_expires ON key_exchanges(expires_at);
CREATE INDEX IF NOT EXISTS idx_key_exchanges_completed ON key_exchanges(is_completed);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_expires ON device_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_device ON audit_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Functions for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_pairing_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM pairing_codes 
  WHERE expires_at < CURRENT_TIMESTAMP 
  AND is_used = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM device_sessions 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_devices_updated_at 
  BEFORE UPDATE ON devices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_trust_updated_at 
  BEFORE UPDATE ON device_trust 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_devices AS
SELECT 
  d.*,
  COUNT(dt.id) as trust_relationships,
  MAX(dt.updated_at) as last_trust_activity
FROM devices d
LEFT JOIN device_trust dt ON d.device_id = dt.source_device_id AND dt.is_active = true
WHERE d.is_active = true
GROUP BY d.id;

CREATE OR REPLACE VIEW device_trust_network AS
SELECT 
  dt.*,
  sd.device_type as source_type,
  td.device_type as target_type,
  sd.device_version as source_version,
  td.device_version as target_version
FROM device_trust dt
JOIN devices sd ON dt.source_device_id = sd.device_id
JOIN devices td ON dt.target_device_id = td.device_id
WHERE dt.is_active = true;
