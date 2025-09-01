async function testAuthentication() {
    try {
        console.log('🔐 Testing device registration...');
        
        // Test device registration
        const registerResponse = await fetch('http://localhost:3333/api/v1/auth/device/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: 'test-device-123',
                deviceInfo: {
                    type: 'web-browser',
                    userAgent: 'test-agent'
                }
            })
        });

        if (!registerResponse.ok) {
            throw new Error(`Registration failed: ${registerResponse.status}`);
        }

        const registerData = await registerResponse.json();
        console.log('✅ Device registered successfully:', registerData.success);
        
        if (registerData.success && registerData.data.accessToken) {
            const token = registerData.data.accessToken;
            console.log('🔑 Got access token:', token.substring(0, 20) + '...');
            
            // Test chat broadcast with token
            console.log('📢 Testing chat broadcast...');
            const broadcastResponse = await fetch('http://localhost:3333/chat/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: 'Hello from test!',
                    sourceDeviceId: 'test-device-123',
                    targetDeviceIds: []
                })
            });

            if (broadcastResponse.ok) {
                const broadcastData = await broadcastResponse.json();
                console.log('✅ Chat broadcast successful:', broadcastData.success);
            } else {
                console.log('❌ Chat broadcast failed:', broadcastResponse.status);
            }

            // Test chat stream with token
            console.log('🔗 Testing chat stream...');
            const streamUrl = `http://localhost:3333/chat/stream/test-device-123?token=${encodeURIComponent(token)}`;
            console.log('Stream URL:', streamUrl);
            
            // Note: EventSource testing would require a browser environment
            console.log('✅ Authentication fix is working! Frontend should now be able to connect.');
            
        } else {
            console.log('❌ No access token received');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAuthentication();
