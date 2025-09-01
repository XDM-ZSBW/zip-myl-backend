// Simple test for device registration
const testData = {
    deviceId: 'test-device-123',
    deviceInfo: {
        type: 'web-browser',
        userAgent: 'test-agent'
    }
};

console.log('Test data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3333/api/v1/auth/device/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
})
.then(response => {
    console.log('Response status:', response.status);
    return response.json();
})
.then(data => {
    console.log('Response data:', data);
})
.catch(error => {
    console.error('Error:', error);
});

