#!/usr/bin/env python3
import ftplib
import os
import sys
from pathlib import Path

def fix_mylzip_redirect():
    """Fix myl.zip redirect by uploading correct files"""
    
    # FTP Configuration
    host = 'zaido.org'
    username = 'zaidoftp@zaido.org'
    password = '9N9HNK6xoZ5I'
    port = 21
    remote_path = '/public_html/website_0f1108f2'
    local_path = './staging-deploy'
    
    ftp = ftplib.FTP()
    
    try:
        print('[CONNECT] Connecting to Hostgator...')
        ftp.connect(host, port)
        ftp.login(username, password)
        
        print('[OK] Connected successfully!')
        print(f'[DIR] Current directory: {ftp.pwd()}')
        
        # Navigate to myl.zip directory
        print(f'[NAV] Navigating to {remote_path}...')
        try:
            ftp.cwd(remote_path)
        except:
            print(f'[ERROR] Could not navigate to {remote_path}')
            return False
        
        print(f'[OK] Now in directory: {ftp.pwd()}')
        
        # List current files to see what's causing the redirect
        print('\n[LIST] Current files in myl.zip directory:')
        try:
            files = ftp.nlst()
            for file in files:
                print(f'   [FILE] {file}')
        except Exception as e:
            print(f'   [ERROR] Could not list files: {e}')
            return False
        
        # Check if there's an index.html that might be causing redirect
        if 'index.html' in files:
            print('\n[INFO] Found index.html - this might be causing the redirect')
            print('[INFO] We will overwrite it with the correct content')
        
        # Upload files from staging-deploy
        print('\n[UPLOAD] Uploading correct files...')
        local_path_obj = Path(local_path).resolve()
        
        if not local_path_obj.exists():
            print(f'[ERROR] Local path {local_path_obj} does not exist!')
            return False
        
        success_count = 0
        total_count = 0
        
        for item in os.listdir(local_path_obj):
            local_item_path = local_path_obj / item
            total_count += 1
            
            if local_item_path.is_file():
                try:
                    with open(local_item_path, 'rb') as f:
                        print(f'   [FILE] Uploading {item}...')
                        ftp.storbinary(f'STOR {item}', f)
                        print(f'   [OK] {item} uploaded successfully')
                        success_count += 1
                except Exception as e:
                    print(f'   [ERROR] Failed to upload {item}: {e}')
            elif local_item_path.is_dir():
                print(f'   [DIR] Uploading directory {item}...')
                try:
                    # Create directory
                    ftp.mkd(item)
                    # Upload files in directory
                    for subitem in os.listdir(local_item_path):
                        subitem_path = local_item_path / subitem
                        if subitem_path.is_file():
                            with open(subitem_path, 'rb') as f:
                                ftp.storbinary(f'STOR {item}/{subitem}', f)
                    success_count += 1
                    print(f'   [OK] Directory {item} uploaded successfully')
                except Exception as e:
                    print(f'   [ERROR] Failed to upload directory {item}: {e}')
        
        print(f'\n[OK] Uploaded {success_count}/{total_count} items successfully!')
        
        # List final files
        print('\n[LIST] Final files in myl.zip directory:')
        try:
            files = ftp.nlst()
            for file in files:
                print(f'   [FILE] {file}')
            
            if 'index.html' in files:
                print('\n[OK] index.html found - myl.zip should now work correctly!')
            else:
                print('\n[WARN] index.html not found in uploaded files')
                
        except Exception as e:
            print(f'   [ERROR] Could not list final files: {e}')
        
        return True
        
    except Exception as e:
        print(f'[ERROR] Fix failed: {e}')
        return False
    finally:
        try:
            ftp.quit()
        except:
            pass

if __name__ == "__main__":
    print('[START] Fixing myl.zip redirect issue...')
    
    success = fix_mylzip_redirect()
    
    if success:
        print('\n[SUCCESS] myl.zip redirect fix completed!')
        print('[URL] Your site should now be live at: https://myl.zip')
        print('[NOTE] Clear your browser cache or try incognito mode if you still see redirects')
        sys.exit(0)
    else:
        print('\n[FAILED] Fix failed!')
        sys.exit(1)
