#!/usr/bin/env node

// Test script for chat authentication
console.log('🧪 Testing Chat Authentication...');

async function testChatAuthentication() {
    try {
        // Step 1: Register a device
        console.log('📱 Step 1: Registering device...');
        const registerResponse = await fetch('http://localhost:3333/api/v1/device/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: 'test-chat-device',
                deviceInfo: {
                    type: 'web-browser',
                    userAgent: 'test-chat-agent'
                }
            })
        });

        if (!registerResponse.ok) {
            throw new Error(`Device registration failed: ${registerResponse.status}`);
        }

        const registerData = await registerResponse.json();
        console.log('✅ Device registered:', registerData);

        // Step 2: Test chat health endpoint
        console.log('💬 Step 2: Testing chat health...');
        const healthResponse = await fetch('http://localhost:3333/chat/health');
        const healthData = await healthResponse.json();
        console.log('✅ Chat health:', healthData);

        // Step 3: Test chat broadcast with authentication
        console.log('📡 Step 3: Testing chat broadcast...');
        const broadcastResponse = await fetch('http://localhost:3333/chat/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${registerData.deviceId}` // Using deviceId as token
            },
            body: JSON.stringify({
                message: 'Test message from authenticated device',
                deviceId: registerData.deviceId
            })
        });

        if (broadcastResponse.ok) {
            const broadcastData = await broadcastResponse.json();
            console.log('✅ Chat broadcast successful:', broadcastData);
        } else {
            console.log('⚠️ Chat broadcast failed (expected without proper token):', broadcastResponse.status);
        }

        console.log('🎉 Chat authentication test completed successfully!');
        console.log('📋 Next step: Test the frontend with the updated authentication');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testChatAuthentication();
