-- Enhanced Trust Network Database Schema
-- Version: 1.0.0
-- Created: 2025-01-15
-- Purpose: Support for Chrome extension enhanced user experiences based on authentication status

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced Sites Configuration Table
CREATE TABLE IF NOT EXISTS enhanced_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enhanced_features JSONB DEFAULT '[]'::jsonb,
  permission_requirements JSONB DEFAULT '[]'::jsonb,
  ui_injection JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  permissions JSONB DEFAULT '[]'::jsonb,
  feature_access JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Enhanced Authentication State Table
CREATE TABLE IF NOT EXISTS enhanced_auth_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  operator_id VARCHAR(255),
  device_token TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Enhanced Feature Usage Log Table
CREATE TABLE IF NOT EXISTS enhanced_feature_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  site_domain VARCHAR(255) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Enhanced Site Access Log Table
CREATE TABLE IF NOT EXISTS enhanced_site_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  site_domain VARCHAR(255) NOT NULL,
  access_type VARCHAR(50) NOT NULL, -- 'enhanced', 'public', 'denied'
  permissions_used JSONB DEFAULT '[]'::jsonb,
  features_accessed JSONB DEFAULT '[]'::jsonb,
  ip_address INET,
  user_agent TEXT,
  session_duration INTEGER, -- in seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_sites_domain ON enhanced_sites(domain);
CREATE INDEX IF NOT EXISTS idx_enhanced_sites_active ON enhanced_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_enhanced_sites_features ON enhanced_sites USING GIN(enhanced_features);
CREATE INDEX IF NOT EXISTS idx_enhanced_sites_permissions ON enhanced_sites USING GIN(permission_requirements);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_device ON user_permissions(device_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permissions ON user_permissions USING GIN(permissions);

CREATE INDEX IF NOT EXISTS idx_enhanced_auth_state_device ON enhanced_auth_state(device_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_auth_state_token ON enhanced_auth_state(device_token);
CREATE INDEX IF NOT EXISTS idx_enhanced_auth_state_expires ON enhanced_auth_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_auth_state_active ON enhanced_auth_state(is_active);

CREATE INDEX IF NOT EXISTS idx_enhanced_feature_logs_device ON enhanced_feature_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_feature_logs_site ON enhanced_feature_logs(site_domain);
CREATE INDEX IF NOT EXISTS idx_enhanced_feature_logs_feature ON enhanced_feature_logs(feature_name);
CREATE INDEX IF NOT EXISTS idx_enhanced_feature_logs_created ON enhanced_feature_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_enhanced_site_access_logs_device ON enhanced_site_access_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_site_access_logs_site ON enhanced_site_access_logs(site_domain);
CREATE INDEX IF NOT EXISTS idx_enhanced_site_access_logs_type ON enhanced_site_access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_site_access_logs_created ON enhanced_site_access_logs(created_at);

-- Functions for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_enhanced_auth()
RETURNS void AS $$
BEGIN
  DELETE FROM enhanced_auth_state 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_user_permissions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_permissions 
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_enhanced_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM enhanced_feature_logs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
  
  DELETE FROM enhanced_site_access_logs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_enhanced_sites_updated_at 
  BEFORE UPDATE ON enhanced_sites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at 
  BEFORE UPDATE ON user_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_auth_state_updated_at 
  BEFORE UPDATE ON enhanced_auth_state 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_enhanced_sites AS
SELECT 
  es.*,
  COUNT(esa.id) as total_accesses,
  COUNT(CASE WHEN esa.access_type = 'enhanced' THEN 1 END) as enhanced_accesses,
  MAX(esa.created_at) as last_access
FROM enhanced_sites es
LEFT JOIN enhanced_site_access_logs esa ON es.domain = esa.site_domain
WHERE es.is_active = true
GROUP BY es.id;

CREATE OR REPLACE VIEW user_permission_summary AS
SELECT 
  up.user_id,
  up.device_id,
  up.permissions,
  up.feature_access,
  up.expires_at,
  up.last_verified,
  d.device_type,
  d.device_version
FROM user_permissions up
JOIN devices d ON up.device_id = d.device_id
WHERE up.is_active = true;

-- Insert default enhanced sites configuration
INSERT INTO enhanced_sites (domain, name, description, enhanced_features, permission_requirements, ui_injection, config) VALUES
(
  'xdmiq.com',
  'Business Operations Frontend',
  'Main business operations interface',
  '["admin", "debug", "analytics", "reporting"]',
  '["admin"]',
  '{"adminPanel": true, "debugTools": true, "analytics": true}',
  '{"autoEnable": true, "showNotification": true, "persistentUI": false}'
),
(
  'yourl.cloud',
  'Cloud Infrastructure',
  'Cloud management and monitoring',
  '["infrastructure", "monitoring", "deployment"]',
  '["admin", "infrastructure"]',
  '{"infrastructureMonitoring": true, "deploymentTools": true, "logs": true}',
  '{"autoEnable": true, "showNotification": true, "persistentUI": true}'
)
ON CONFLICT (domain) DO NOTHING;
