"""
Cache management utilities for media files
Similar to social media platforms' caching strategies
"""
import hashlib
import time
from django.core.cache import cache
from django.conf import settings
from django.utils.http import http_date
from datetime import datetime, timezone


class MediaCacheManager:
    """
    Manages browser and server-side caching for media files
    Implements strategies similar to Instagram, Twitter, Facebook
    """
    
    # Cache keys
    MEDIA_CACHE_KEY_PREFIX = "media_cache:"
    ETAG_CACHE_KEY_PREFIX = "etag_cache:"
    
    @classmethod
    def get_cache_settings_for_content_type(cls, content_type):
        """Get cache settings based on content type"""
        cache_settings = getattr(settings, 'BROWSER_CACHE_SETTINGS', {})
        return cache_settings.get(content_type, cache_settings.get('default', {
            'max_age': 7 * 24 * 60 * 60,  # 1 week default
            'immutable': False
        }))
    
    @classmethod
    def generate_cache_control_header(cls, content_type):
        """Generate Cache-Control header based on content type"""
        cache_settings = cls.get_cache_settings_for_content_type(content_type)
        max_age = cache_settings.get('max_age', 7 * 24 * 60 * 60)
        immutable = cache_settings.get('immutable', False)
        
        cache_control = f'public, max-age={max_age}'
        if immutable:
            cache_control += ', immutable'
        
        return cache_control
    
    @classmethod
    def generate_etag(cls, file_path, file_size, modified_time):
        """Generate ETag for a file"""
        etag_source = f"{file_path}-{file_size}-{modified_time}"
        return hashlib.md5(etag_source.encode()).hexdigest()
    
    @classmethod
    def get_cached_etag(cls, document_id):
        """Get cached ETag for a document"""
        cache_key = f"{cls.ETAG_CACHE_KEY_PREFIX}{document_id}"
        return cache.get(cache_key)
    
    @classmethod
    def set_cached_etag(cls, document_id, etag, timeout=None):
        """Cache an ETag for a document"""
        if timeout is None:
            timeout = 24 * 60 * 60  # 24 hours
        cache_key = f"{cls.ETAG_CACHE_KEY_PREFIX}{document_id}"
        cache.set(cache_key, etag, timeout)
    
    @classmethod
    def invalidate_document_cache(cls, document_id):
        """Invalidate cache for a specific document"""
        # Clear ETag cache
        etag_cache_key = f"{cls.ETAG_CACHE_KEY_PREFIX}{document_id}"
        cache.delete(etag_cache_key)
        
        # Clear media cache if exists
        media_cache_key = f"{cls.MEDIA_CACHE_KEY_PREFIX}{document_id}"
        cache.delete(media_cache_key)
    
    @classmethod
    def get_optimized_headers(cls, content_type, file_size, last_modified, etag):
        """Get optimized HTTP headers for media serving"""
        headers = {}
        
        # Cache control
        headers['Cache-Control'] = cls.generate_cache_control_header(content_type)
        
        # ETag
        headers['ETag'] = f'"{etag}"'
        
        # Last-Modified
        if last_modified:
            headers['Last-Modified'] = http_date(last_modified.timestamp())
        
        # Expires (1 year from now for images, shorter for documents)
        cache_settings = cls.get_cache_settings_for_content_type(content_type)
        max_age = cache_settings.get('max_age', 7 * 24 * 60 * 60)
        expires_timestamp = time.time() + max_age
        headers['Expires'] = http_date(expires_timestamp)
        
        # Content-Length
        headers['Content-Length'] = str(file_size)
        
        # Additional headers for images (social media style)
        if content_type.startswith('image/'):
            headers.update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Max-Age': str(max_age),
                'Vary': 'Accept-Encoding'
            })
        
        return headers


class ImageOptimizationHelper:
    """
    Helper for image optimization and caching strategies
    """
    
    # Image formats that benefit from aggressive caching
    CACHEABLE_IMAGE_TYPES = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/svg+xml', 'image/bmp'
    }
    
    @classmethod
    def is_image(cls, content_type):
        """Check if content type is an image"""
        return content_type.lower() in cls.CACHEABLE_IMAGE_TYPES
    
    @classmethod
    def should_use_aggressive_caching(cls, content_type):
        """Determine if file should use aggressive caching (1 year)"""
        return cls.is_image(content_type)
    
    @classmethod
    def get_recommended_cache_duration(cls, content_type, file_size=None):
        """Get recommended cache duration based on file type and size"""
        if cls.is_image(content_type):
            # Images: 1 year (like Instagram, Twitter)
            return 365 * 24 * 60 * 60
        elif content_type.startswith('video/'):
            # Videos: 30 days
            return 30 * 24 * 60 * 60
        elif content_type == 'application/pdf':
            # PDFs: 7 days (might be updated)
            return 7 * 24 * 60 * 60
        else:
            # Other documents: 3 days
            return 3 * 24 * 60 * 60


# Middleware for adding cache headers to all media responses
class MediaCacheMiddleware:
    """
    Middleware to add appropriate cache headers to media responses
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add cache headers to media URLs
        if request.path.startswith('/media/'):
            content_type = response.get('Content-Type', 'application/octet-stream')
            
            # Only add headers if not already present
            if 'Cache-Control' not in response:
                cache_control = MediaCacheManager.generate_cache_control_header(content_type)
                response['Cache-Control'] = cache_control
            
            # Add security headers for images
            if content_type.startswith('image/'):
                response['X-Content-Type-Options'] = 'nosniff'
        
        return response