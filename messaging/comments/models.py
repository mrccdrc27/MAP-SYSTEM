from django.db import models
from tickets.models import Ticket
import uuid

class Comment(models.Model):
    """
    Comment model for ticket discussion with support for replies and ratings.
    """
    comment_id = models.CharField(max_length=20, unique=True, db_index=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    user_id = models.CharField(max_length=255)  # Store user ID as provided
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
        return f"{self.comment_id} - {self.user_id}: {self.content[:50]}"


class CommentRating(models.Model):
    """
    Tracks individual user ratings (thumbs up/down) for comments
    """
    RATING_CHOICES = [
        ('up', 'Thumbs Up'),
        ('down', 'Thumbs Down'),
    ]
    
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='ratings')
    user_id = models.CharField(max_length=255)
    rating = models.CharField(max_length=5, choices=RATING_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Ensure a user can only rate a comment once
        unique_together = ['comment', 'user_id']
    
    def save(self, *args, **kwargs):
        # Update the comment's rating counts
        super().save(*args, **kwargs)
        
        # Count ratings and update the comment
        comment = self.comment
        comment.thumbs_up_count = comment.ratings.filter(rating='up').count()
        comment.thumbs_down_count = comment.ratings.filter(rating='down').count()
        comment.save(update_fields=['thumbs_up_count', 'thumbs_down_count'])
