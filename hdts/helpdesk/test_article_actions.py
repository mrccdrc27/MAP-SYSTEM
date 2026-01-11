#!/usr/bin/env python
"""
Test script to verify knowledge article archive and delete endpoints work correctly.
Run with: python manage.py shell < test_article_actions.py
"""

from core.models import KnowledgeArticle, Employee
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json

# Create test client
client = APIClient()

# Create or get a test employee with admin role
try:
    employee = Employee.objects.get(email='testadmin@example.com')
except Employee.DoesNotExist:
    employee = Employee.objects.create_user(
        email='testadmin@example.com',
        password='testpass123',
        first_name='Test',
        last_name='Admin',
        is_staff=True,
        is_superuser=True
    )

# Generate token for the employee
refresh = RefreshToken.for_user(employee)
access_token = str(refresh.access_token)
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

# Create test articles
print("Creating test articles...")
articles = []
for i in range(3):
    article = KnowledgeArticle.objects.create(
        subject=f'Test Article {i+1}',
        description=f'Test description for article {i+1}',
        category='IT Support',
        visibility='Employee',
        created_by=None
    )
    articles.append(article)
    print(f"  ✓ Created article {article.id}: {article.subject}")

# Test archive endpoint
print("\nTesting archive endpoint...")
article_to_archive = articles[0]
print(f"  Archiving article {article_to_archive.id}...")
response = client.post(f'/api/articles/{article_to_archive.id}/archive/')
print(f"  Status: {response.status_code}")
print(f"  Response: {response.json()}")

if response.status_code == 200:
    article_to_archive.refresh_from_db()
    print(f"  ✓ Article is_archived: {article_to_archive.is_archived}")
else:
    print(f"  ✗ Failed to archive article")

# Test restore endpoint
print("\nTesting restore endpoint...")
print(f"  Restoring article {article_to_archive.id}...")
response = client.post(f'/api/articles/{article_to_archive.id}/restore/')
print(f"  Status: {response.status_code}")
print(f"  Response: {response.json()}")

if response.status_code == 200:
    article_to_archive.refresh_from_db()
    print(f"  ✓ Article is_archived: {article_to_archive.is_archived}")
else:
    print(f"  ✗ Failed to restore article")

# Test delete endpoint
print("\nTesting delete endpoint...")
article_to_delete = articles[1]
article_id = article_to_delete.id
print(f"  Deleting article {article_id}...")
response = client.delete(f'/api/articles/{article_id}/')
print(f"  Status: {response.status_code}")

if response.status_code == 204:
    try:
        KnowledgeArticle.objects.get(id=article_id)
        print(f"  ✗ Article still exists in database")
    except KnowledgeArticle.DoesNotExist:
        print(f"  ✓ Article successfully deleted")
else:
    print(f"  ✗ Failed to delete article (status: {response.status_code})")

# List remaining articles
print("\nRemaining articles:")
remaining = KnowledgeArticle.objects.all()
for article in remaining:
    status = "archived" if article.is_archived else "active"
    print(f"  - {article.id}: {article.subject} ({status})")

print("\n✓ Test completed!")
