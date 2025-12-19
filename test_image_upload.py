#!/usr/bin/env python
"""Test script to verify image upload functionality works end-to-end"""

import requests
import os
from io import BytesIO
from PIL import Image

# Create a test image
img = Image.new('RGB', (100, 100), color='red')
img_bytes = BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes.seek(0)

# First, get a valid token
login_url = 'http://localhost:8003/api/v1/users/login/api/'
login_payload = {'email': 'admin@smartsupport.com', 'password': 'Admin@123'}
login_resp = requests.post(login_url, json=login_payload, timeout=5)
print(f'Login Status: {login_resp.status_code}')

if login_resp.status_code == 200:
    token = login_resp.json().get('access')
    print(f'Got token: {token[:50]}...')
    
    # Now try to upload the image
    headers = {'Authorization': f'Bearer {token}'}
    files = {'image': ('test.jpg', img_bytes, 'image/jpeg')}
    
    upload_url = 'http://localhost:8000/api/employee/upload-image/'
    upload_resp = requests.post(upload_url, files=files, headers=headers, timeout=10)
    print(f'Upload Status: {upload_resp.status_code}')
    print(f'Upload Response: {upload_resp.text[:500]}')
    
    # Now check if the auth service has the profile picture updated
    auth_profile_url = 'http://localhost:8003/api/v1/users/profile/'
    auth_profile_resp = requests.get(auth_profile_url, headers=headers, timeout=10)
    print(f'\nAuth Service Profile Status: {auth_profile_resp.status_code}')
    profile_data = auth_profile_resp.json()
    print(f'Profile picture in auth service: {profile_data.get("profile_picture", "NOT SET")}')
else:
    print(f'Login failed: {login_resp.text[:300]}')
