const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Configuration for auth page deployment
const config = {
    host: 'myl.zip',
    username: 'mylzipftp@myl.zip',
    password: 'h8r(wrKhdk',
    port: 21,
    secure: 'explicit',
    localPath: '../src',
    remotePath: '/'
};

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log('[CONNECT] Connecting to MyL.Zip for auth page deployment...');
        await client.access({
            host: config.host,
            user: config.username,
            password: config.password,
            port: config.port,
            secure: config.secure
        });

        console.log('[OK] Connected successfully!');
        console.log('[DIR] Current directory:', await client.pwd());

        // Upload auth.html specifically
        console.log('[UPLOAD] Uploading auth.html...');
        const authPath = path.resolve(config.localPath, 'auth.html');
        
        if (fs.existsSync(authPath)) {
            await client.uploadFrom(authPath, 'auth.html');
            console.log('[OK] auth.html uploaded successfully!');
        } else {
            console.log('[ERROR] auth.html not found at:', authPath);
        }

        // List files to verify
        console.log('\n[LIST] Files on server:');
        const files = await client.list();
        files.forEach(file => {
            if (file.isFile) {
                console.log(`   [FILE] ${file.name} (${file.size} bytes)`);
            }
        });

    } catch (err) {
        console.error('[ERROR] Deployment failed:', err.message);
        throw err;
    } finally {
        client.close();
    }
}

// Run deployment
deploy()
    .then(() => {
        console.log('\n[SUCCESS] Auth page deployment completed successfully!');
        console.log('[URL] Auth page should be live at: https://myl.zip/auth.html');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n[FAILED] Deployment failed:', err.message);
        process.exit(1);
    });
