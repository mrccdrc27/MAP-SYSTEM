from django.contrib import admin
from .models import Comment, CommentRating

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('comment_id', 'ticket', 'user_id', 'content', 'created_at', 'thumbs_up_count', 'thumbs_down_count')
    list_filter = ('created_at', 'ticket')
    search_fields = ('comment_id', 'user_id', 'content')
    readonly_fields = ('comment_id', 'created_at', 'updated_at')

@admin.register(CommentRating)
class CommentRatingAdmin(admin.ModelAdmin):
    list_display = ('comment', 'user_id', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('comment__comment_id', 'user_id')
