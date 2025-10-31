#!/usr/bin/env python
"""
Check user system access
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from systems.models import System
from system_roles.models import UserSystemRole

def check_user_access():
    print("=== User System Access Debug ===")
    
    # Get user email from input
    email = input("Enter email address: ").strip()
    
    try:
        user = User.objects.get(email=email)
        print(f"\n✓ User found: {user.username} (ID: {user.id})")
        
        # List all systems
        print(f"\n📋 Available Systems:")
        systems = System.objects.all()
        for system in systems:
            print(f"  - {system.name} (slug: {system.slug}, ID: {system.id})")
        
        # Check user's system roles
        print(f"\n🔐 User's System Access:")
        user_roles = UserSystemRole.objects.filter(user=user)
        
        if not user_roles:
            print("  - No system access found!")
        else:
            for role in user_roles:
                active_status = "✓ Active" if role.is_active else "✗ Inactive"
                print(f"  - {role.system.name}: {role.role.name} ({active_status})")
        
        # Check access to each system
        print(f"\n🎯 System Access Check:")
        for system in systems:
            has_access = user.system_roles.filter(system=system, is_active=True).exists()
            status = "✓ Has Access" if has_access else "✗ No Access"
            print(f"  - {system.name}: {status}")
            
    except User.DoesNotExist:
        print("✗ User not found in database")

if __name__ == "__main__":
    check_user_access()