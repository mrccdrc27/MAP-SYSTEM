from celery import Celery

app = Celery('test', broker='amqp://GY6Jx5nsXW5edoIB:DGHuVF0tWCZgWnO~T51D._6viJWc7U_B@ballast.proxy.rlwy.net:48690')
result = app.control.ping()

print(result)
