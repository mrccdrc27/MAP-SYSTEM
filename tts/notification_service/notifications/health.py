"""
Health Check Views for Production Monitoring
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
from celery import current_app
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Comprehensive health check for Railway monitoring
    
    Returns:
        200: All systems operational
        503: One or more systems failing
    """
    checks = {
        'database': False,
        'cache': False,
        'celery': False,
        'gmail_api': False
    }
    
    details = {}
    
    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        checks['database'] = True
        details['database'] = 'connected'
    except Exception as e:
        checks['database'] = False
        details['database'] = str(e)
        logger.error(f"Database health check failed: {e}")
    
    # Cache check
    try:
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        checks['cache'] = (result == 'ok')
        details['cache'] = 'operational' if checks['cache'] else 'failed'
    except Exception as e:
        checks['cache'] = False
        details['cache'] = str(e)
        logger.error(f"Cache health check failed: {e}")
    
    # Celery worker check
    try:
        inspect = current_app.control.inspect()
        stats = inspect.stats()
        if stats:
            checks['celery'] = True
            worker_count = len(stats)
            details['celery'] = f"{worker_count} worker(s) active"
        else:
            checks['celery'] = False
            details['celery'] = 'no workers found'
    except Exception as e:
        checks['celery'] = False
        details['celery'] = str(e)
        logger.error(f"Celery health check failed: {e}")
    
    # Gmail API check
    try:
        from .gmail_service import get_gmail_service
        gmail = get_gmail_service()
        if gmail.service is not None:
            checks['gmail_api'] = True
            details['gmail_api'] = 'initialized'
        else:
            checks['gmail_api'] = False
            details['gmail_api'] = 'not initialized'
    except Exception as e:
        checks['gmail_api'] = False
        details['gmail_api'] = str(e)
        logger.error(f"Gmail API health check failed: {e}")
    
    # Overall health status
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return Response({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'checks': checks,
        'details': details
    }, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Readiness probe for Railway
    Checks if service is ready to accept traffic
    """
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return Response({'status': 'ready'}, status=200)
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return Response({'status': 'not ready', 'error': str(e)}, status=503)


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Liveness probe for Railway
    Checks if service is alive (doesn't check dependencies)
    """
    return Response({'status': 'alive'}, status=200)
