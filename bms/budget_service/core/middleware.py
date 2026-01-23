from django.utils.deprecation import MiddlewareMixin

class HealthCheckCSRFExemptMiddleware(MiddlewareMixin):
    """Exempt health check endpoint from CSRF validation"""
    def process_request(self, request):
        if request.path == '/health/':
            setattr(request, '_dont_enforce_csrf_checks', True)