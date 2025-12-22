import os
import mimetypes
import hashlib
from django.http import HttpResponse, Http404, HttpResponseNotModified
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils.http import http_date, parse_http_date
from django.views.decorators.cache import cache_control
from django.views.decorators.http import condition
from django.utils.cache import get_conditional_response
from django.views import View
from django.utils.decorators import method_decorator
from comments.models import DocumentStorage
import time
from datetime import datetime, timezone
from .cache_utils import MediaCacheManager, ImageOptimizationHelper


class CachedMediaView(View):
    """
    Optimized media file serving with aggressive browser caching
    Similar to social media platforms (Instagram, Twitter, etc.)
    """
    
    def get_file_last_modified(self, file_path):
        """Get file's last modified time"""
        try:
            return datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
        except OSError:
            return None
    
    def get(self, request, document_id):
        """Serve media files with optimized caching headers"""
        try:
            document = get_object_or_404(DocumentStorage, id=document_id)
            
            if not document.file_path or not os.path.exists(document.file_path.path):
                raise Http404("File not found")
            
            file_path = document.file_path.path
            file_size = os.path.getsize(file_path)
            last_modified = self.get_file_last_modified(file_path)
            
            # Generate ETag using cache manager
            etag = MediaCacheManager.generate_etag(
                file_path, 
                file_size, 
                last_modified.timestamp() if last_modified else 0
            )
            
            # Check If-None-Match header (ETag validation)
            if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
            if if_none_match and etag in if_none_match:
                response = HttpResponseNotModified()
                response['ETag'] = f'"{etag}"'
                return response
            
            # Check If-Modified-Since header
            if_modified_since = request.META.get('HTTP_IF_MODIFIED_SINCE')
            if if_modified_since and last_modified:
                try:
                    if_modified_since_date = datetime.fromtimestamp(
                        parse_http_date(if_modified_since), tz=timezone.utc
                    )
                    if last_modified <= if_modified_since_date:
                        response = HttpResponseNotModified()
                        response['ETag'] = f'"{etag}"'
                        return response
                except (ValueError, TypeError):
                    pass
            
            # Determine content type
            content_type = document.content_type or mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            
            # Create response with file content
            with open(file_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type=content_type)
            
            # Get optimized headers using cache manager
            headers = MediaCacheManager.get_optimized_headers(
                content_type, file_size, last_modified, etag
            )
            
            # Apply all headers
            for header_name, header_value in headers.items():
                response[header_name] = header_value
            
            # Set filename for download/inline display
            if ImageOptimizationHelper.is_image(content_type):
                response['Content-Disposition'] = f'inline; filename="{document.original_filename}"'
            else:
                response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            
            # Cache the ETag for future requests
            MediaCacheManager.set_cached_etag(document_id, etag)
            
            return response
            
        except DocumentStorage.DoesNotExist:
            raise Http404("Document not found")
        except Exception as e:
            raise Http404(f"Error serving file: {str(e)}")


class CachedPublicMediaView(View):
    """
    Public media serving for static files (avatars, thumbnails, etc.)
    with even more aggressive caching
    """
    
    def get(self, request, path):
        """Serve public media files with maximum caching"""
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            raise Http404("File not found")
        
        # Security check - ensure file is within MEDIA_ROOT
        if not os.path.abspath(file_path).startswith(os.path.abspath(settings.MEDIA_ROOT)):
            raise Http404("Access denied")
        
        file_size = os.path.getsize(file_path)
        last_modified = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
        
        # Generate ETag using cache manager
        etag = MediaCacheManager.generate_etag(path, file_size, last_modified.timestamp())
        
        # Check conditional headers
        if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
        if if_none_match and etag in if_none_match:
            response = HttpResponseNotModified()
            response['ETag'] = f'"{etag}"'
            return response
        
        if_modified_since = request.META.get('HTTP_IF_MODIFIED_SINCE')
        if if_modified_since:
            try:
                if_modified_since_date = datetime.fromtimestamp(
                    parse_http_date(if_modified_since), tz=timezone.utc
                )
                if last_modified <= if_modified_since_date:
                    response = HttpResponseNotModified()
                    response['ETag'] = f'"{etag}"'
                    return response
            except (ValueError, TypeError):
                pass
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Serve file
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
        
        # Get optimized headers using cache manager
        headers = MediaCacheManager.get_optimized_headers(
            content_type, file_size, last_modified, etag
        )
        
        # Apply all headers
        for header_name, header_value in headers.items():
            response[header_name] = header_value
        
        return response


# Function-based views for URL routing
def cached_media_view(request, document_id):
    """Function wrapper for CachedMediaView"""
    return CachedMediaView.as_view()(request, document_id)


def cached_public_media_view(request, path):
    """Function wrapper for CachedPublicMediaView"""
    return CachedPublicMediaView.as_view()(request, path)