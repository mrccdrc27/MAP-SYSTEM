from django.utils.deprecation import MiddlewareMixin

class HealthCheckCSRFExemptMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.path == '/health/':
            setattr(request, '_dont_enforce_csrf_checks', True)