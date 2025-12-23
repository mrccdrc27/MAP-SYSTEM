from django.contrib.auth.hashers import Argon2PasswordHasher

class CustomArgon2PasswordHasher(Argon2PasswordHasher):
    time_cost = 2
    memory_cost = 102400 # Memory usage in kibibytes 
    parallelism = 4 # Number of parallel threads (default 8)