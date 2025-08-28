-- NFT Schema Migration for zip-myl-backend
-- Version: 1.0.0
-- Created: 2025-01-27
-- Description: Adds NFT storage, pairing tokens, and invalid NFT tables

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NFT Collections Table
CREATE TABLE IF NOT EXISTS nft_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  nft_data JSONB NOT NULL,
  platform VARCHAR(50) NOT NULL,
  collection_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pairing Tokens Table
CREATE TABLE IF NOT EXISTS pairing_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  platform VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invalid NFTs Table
CREATE TABLE IF NOT EXISTS invalid_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_data JSONB NOT NULL,
  reason VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  user_id UUID NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User NFT Profiles Table (extends existing user functionality)
CREATE TABLE IF NOT EXISTS user_nft_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  profile_picture_url VARCHAR(500),
  profile_picture_hash VARCHAR(255),
  nft_count INTEGER DEFAULT 0,
  last_nft_added TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nft_collections_user_id ON nft_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_collections_platform ON nft_collections(platform);
CREATE INDEX IF NOT EXISTS idx_nft_collections_created_at ON nft_collections(created_at);

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_token ON pairing_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_user_id ON pairing_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_expires_at ON pairing_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_platform ON pairing_tokens(platform);

CREATE INDEX IF NOT EXISTS idx_invalid_nfts_user_id ON invalid_nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_invalid_nfts_platform ON invalid_nfts(platform);
CREATE INDEX IF NOT EXISTS idx_invalid_nfts_created_at ON invalid_nfts(created_at);

CREATE INDEX IF NOT EXISTS idx_user_nft_profiles_user_id ON user_nft_profiles(user_id);

-- Add foreign key constraints
ALTER TABLE nft_collections 
ADD CONSTRAINT fk_nft_collections_user_id 
FOREIGN KEY (user_id) REFERENCES devices(device_id) ON DELETE CASCADE;

ALTER TABLE pairing_tokens 
ADD CONSTRAINT fk_pairing_tokens_user_id 
FOREIGN KEY (user_id) REFERENCES devices(device_id) ON DELETE CASCADE;

ALTER TABLE invalid_nfts 
ADD CONSTRAINT fk_invalid_nfts_user_id 
FOREIGN KEY (user_id) REFERENCES devices(device_id) ON DELETE SET NULL;

ALTER TABLE user_nft_profiles 
ADD CONSTRAINT fk_user_nft_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES devices(device_id) ON DELETE CASCADE;

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_nft_collections_updated_at 
    BEFORE UPDATE ON nft_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_nft_profiles_updated_at 
    BEFORE UPDATE ON user_nft_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data for existing users (optional)
-- This creates NFT profiles for existing device users
INSERT INTO user_nft_profiles (user_id, nft_count)
SELECT DISTINCT device_id, 0 
FROM devices 
WHERE device_id NOT IN (SELECT user_id FROM user_nft_profiles);

-- Add comments for documentation
COMMENT ON TABLE nft_collections IS 'Stores user NFT collections with platform-specific data';
COMMENT ON TABLE pairing_tokens IS 'Temporary tokens for NFT pairing validation';
COMMENT ON TABLE invalid_nfts IS 'Stores rejected NFTs with rejection reasons';
COMMENT ON TABLE user_nft_profiles IS 'Extended user profiles with NFT-specific information';

-- Verify migration
SELECT 'NFT Schema Migration completed successfully' as status;
