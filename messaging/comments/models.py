from django.db import models
from django.core.files.storage import default_storage
from django.conf import settings
import hashlib
import os
import uuid
from datetime import datetime
from tickets.models import Ticket
from PIL import Image
import io

def comment_document_upload_path(instance, filename):
    """Generate upload path for comment documents"""
    # Use the file hash as part of the path for deduplication
    return f'comments/documents/{instance.file_hash}/{filename}'

class Comment(models.Model):
    """
    Comment model for ticket discussion with support for replies and ratings.
    Includes detailed user information.
    """
    comment_id = models.CharField(max_length=20, unique=True, db_index=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    user_id = models.CharField(max_length=255)  # Store user ID as provided
    
    # User information fields
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    # Track ratings
    thumbs_up_count = models.IntegerField(default=0)
    thumbs_down_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.comment_id:
            # Generate a unique comment ID
            unique_part = str(uuid.uuid4().int)[:8]
            self.comment_id = f"C{self.ticket.ticket_id[1:]}-{unique_part}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.comment_id} - {self.firstname} {self.lastname} ({self.role}): {self.content[:50]}"


class CommentRating(models.Model):
    """
    Tracks individual user ratings (thumbs up/down) for comments
    Using boolean for rating: True (1) = thumbs up, False (0) = thumbs down
    """
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='ratings')
    user_id = models.CharField(max_length=255)
    
    # User information fields
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    
    # True = thumbs up, False = thumbs down
    rating = models.BooleanField(help_text="True (1) for thumbs up, False (0) for thumbs down")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only rate a comment once
        unique_together = ['comment', 'user_id']
    
    def save(self, *args, **kwargs):
        # Update the comment's rating counts
        super().save(*args, **kwargs)
        
        # Count ratings and update the comment
        comment = self.comment
        comment.thumbs_up_count = comment.ratings.filter(rating=True).count()
        comment.thumbs_down_count = comment.ratings.filter(rating=False).count()
        comment.save(update_fields=['thumbs_up_count', 'thumbs_down_count'])


class DocumentStorage(models.Model):
    """
    Stores unique documents to prevent duplication.
    Multiple comments can reference the same document.
    """
    file_hash = models.CharField(max_length=64, unique=True, db_index=True)  # SHA-256 hash
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    content_type = models.CharField(max_length=100)
    file_path = models.FileField(upload_to='comments/documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Track ownership for cleanup
    uploaded_by_user_id = models.CharField(max_length=255)
    uploaded_by_name = models.CharField(max_length=255)  # "firstname lastname"
    
    # Image metadata fields
    is_image = models.BooleanField(default=False)
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    image_ratio = models.FloatField(null=True, blank=True, help_text="Width/Height ratio")
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.original_filename} ({self.file_hash[:8]}...)"
    
    def calculate_image_info(self, file_content):
        """
        Calculate image dimensions and ratio if the file is an image
        """
        try:
            # Check if content type indicates it's an image
            if not self.content_type.startswith('image/'):
                return
            
            # Try to open as image
            image = Image.open(io.BytesIO(file_content))
            self.is_image = True
            self.image_width = image.width
            self.image_height = image.height
            
            # Calculate ratio (width/height)
            if image.height > 0:
                self.image_ratio = round(image.width / image.height, 4)
            
        except Exception as e:
            # Not a valid image or error processing
            self.is_image = False
            print(f"Error processing image {self.original_filename}: {str(e)}")
    
    @classmethod
    def create_from_file(cls, file_obj, user_id, firstname, lastname):
        """
        Create or get existing DocumentStorage from uploaded file.
        Returns tuple (document_storage, created)
        """
        # Calculate file hash
        file_obj.seek(0)
        file_content = file_obj.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file_obj.seek(0)  # Reset file pointer
        
        # Check if document already exists
        try:
            existing_doc = cls.objects.get(file_hash=file_hash)
            return existing_doc, False
        except cls.DoesNotExist:
            # Create new document
            doc = cls(
                file_hash=file_hash,
                original_filename=file_obj.name,
                file_size=len(file_content),
                content_type=getattr(file_obj, 'content_type', 'application/octet-stream'),
                uploaded_by_user_id=user_id,
                uploaded_by_name=f"{firstname} {lastname}"
            )
            
            # Calculate image info before saving
            doc.calculate_image_info(file_content)
            
            doc.file_path.save(file_obj.name, file_obj, save=False)
            doc.save()
            return doc, True
    
    def delete(self, *args, **kwargs):
        """Override delete to remove file from storage"""
        if self.file_path:
            try:
                default_storage.delete(self.file_path.name)
            except:
                pass  # File might already be deleted
        super().delete(*args, **kwargs)


class CommentDocument(models.Model):
    """
    Links comments to documents with ownership tracking
    """
    comment = models.ForeignKey('Comment', on_delete=models.CASCADE, related_name='documents')
    document = models.ForeignKey(DocumentStorage, on_delete=models.CASCADE, related_name='comment_attachments')
    attached_at = models.DateTimeField(auto_now_add=True)
    
    # Track who attached this document to the comment
    attached_by_user_id = models.CharField(max_length=255)
    attached_by_name = models.CharField(max_length=255)  # "firstname lastname"
    
    class Meta:
        unique_together = ['comment', 'document']  # Prevent duplicate attachments
        ordering = ['-attached_at']
    
    def __str__(self):
        return f"{self.comment.comment_id} -> {self.document.original_filename}"
