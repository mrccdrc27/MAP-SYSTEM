from drf_spectacular.extensions import OpenApiAuthenticationExtension

class MicroserviceJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'core.authentication.MicroserviceJWTAuthentication'
    name = 'MicroserviceJWT'
    
    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    