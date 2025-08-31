#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');

// Load development environment variables
dotenv.config({ path: path.join(__dirname, 'env.development') });

console.log('🚀 Starting Myl.Zip Backend in Development Mode');
console.log('📁 Environment file: env.development');
console.log('🔧 Rate limits configured for development:');
console.log(`   - General: ${process.env.EXTENSION_RATE_LIMIT_GENERAL || 1000} requests/15min`);
console.log(`   - Auth: ${process.env.EXTENSION_RATE_LIMIT_AUTH || 100} attempts/15min`);
console.log(`   - Device Registration: ${process.env.EXTENSION_RATE_LIMIT_DEVICE_REG || 100} attempts/hour`);
console.log(`   - Pairing: ${process.env.EXTENSION_RATE_LIMIT_PAIRING || 50} attempts/hour`);
console.log(`   - NFT: ${process.env.EXTENSION_RATE_LIMIT_NFT || 200} operations/15min`);
console.log('');

// Start the server
require('./src/app.js');
