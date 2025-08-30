#!/usr/bin/env python3
import ftplib
import os
import sys
from pathlib import Path

# Configuration for zaido.org staging deployment
config = {
    'host': 'zaido.org',
    'username': 'zaidoftp@zaido.org',
    'password': '9N9HNK6xoZ5I',
    'port': 21,
    'local_path': './staging-deploy',
    'remote_path': '/public_html/website_1a41642e'
}

def upload_file(ftp, local_file, remote_file):
    """Upload a single file"""
    try:
        with open(local_file, 'rb') as f:
            print(f"   [FILE] Uploading {os.path.basename(local_file)}...")
            ftp.storbinary(f'STOR {remote_file}', f)
            print(f"   [OK] {os.path.basename(local_file)} uploaded successfully")
            return True
    except Exception as e:
        print(f"   [ERROR] Failed to upload {local_file}: {e}")
        return False

def upload_directory(ftp, local_dir, remote_dir):
    """Upload a directory recursively"""
    try:
        print(f"   [DIR] Uploading directory {os.path.basename(local_dir)}...")
        ftp.mkd(remote_dir)
        print(f"   [OK] Created remote directory {remote_dir}")
        
        for item in os.listdir(local_dir):
            local_path = os.path.join(local_dir, item)
            remote_path = f"{remote_dir}/{item}"
            
            if os.path.isfile(local_path):
                upload_file(ftp, local_path, remote_path)
            elif os.path.isdir(local_path):
                upload_directory(ftp, local_path, remote_path)
        
        return True
    except Exception as e:
        print(f"   [ERROR] Failed to upload directory {local_dir}: {e}")
        return False

def deploy():
    """Main deployment function"""
    ftp = ftplib.FTP()
    
    try:
        print('[CONNECT] Connecting to Hostgator for zaido.org staging deployment...')
        ftp.connect(config['host'], config['port'])
        ftp.login(config['username'], config['password'])
        
        print('[OK] Connected successfully!')
        print(f'[DIR] Current directory: {ftp.pwd()}')
        
        # Navigate to zaido.org directory
        print(f"[NAV] Navigating to {config['remote_path']}...")
        try:
            ftp.cwd(config['remote_path'])
        except:
            # Create directory if it doesn't exist
            ftp.mkd(config['remote_path'])
            ftp.cwd(config['remote_path'])
        
        print(f'[OK] Now in directory: {ftp.pwd()}')
        
        # List current files to see what's there
        print('\n[LIST] Current files in zaido.org directory:')
        try:
            files = ftp.nlst()
            for file in files:
                print(f"   [FILE] {file}")
        except Exception as e:
            print(f"   [ERROR] Could not list files: {e}")
        
        # Upload files from staging-deploy
        print('\n[UPLOAD] Uploading files to zaido.org directory...')
        local_path = Path(config['local_path']).resolve()
        
        if not local_path.exists():
            print(f"[ERROR] Local path {local_path} does not exist!")
            return False
        
        success_count = 0
        total_count = 0
        
        for item in os.listdir(local_path):
            local_item_path = local_path / item
            total_count += 1
            
            if local_item_path.is_file():
                if upload_file(ftp, str(local_item_path), item):
                    success_count += 1
            elif local_item_path.is_dir():
                if upload_directory(ftp, str(local_item_path), item):
                    success_count += 1
        
        print(f'\n[OK] Uploaded {success_count}/{total_count} items successfully!')
        
        # List uploaded files
        print('\n[LIST] Final files in zaido.org directory:')
        try:
            files = ftp.nlst()
            for file in files:
                print(f"   [FILE] {file}")
            
            if 'index.html' in files:
                print('\n[OK] index.html found - zaido.org deployment looks good!')
            else:
                print('\n[WARN] Warning: index.html not found in uploaded files')
                
        except Exception as e:
            print(f"   [ERROR] Could not list final files: {e}")
        
        return True
        
    except Exception as e:
        print(f'[ERROR] Deployment failed: {e}')
        return False
    finally:
        try:
            ftp.quit()
        except:
            pass

if __name__ == "__main__":
    print('[START] zaido.org staging deployment script starting...')
    
    success = deploy()
    
    if success:
        print('\n[SUCCESS] zaido.org staging deployment completed successfully!')
        print('[URL] Your site should be live at: https://zaido.org')
        sys.exit(0)
    else:
        print('\n[FAILED] Deployment failed!')
        sys.exit(1)
