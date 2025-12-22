import io
from rest_framework import serializers
try:
    from PIL import Image
except Exception:
    Image = None


def validate_image_file(value, max_size=5 * 1024 * 1024):
    """Validate uploaded image file:

    - size must be <= max_size (default 5MB)
    - binary format must be JPEG or PNG (uses Pillow if available)
    - falls back to content_type or extension checks when necessary
    Raises `rest_framework.serializers.ValidationError` on failure.
    """
    if value in (None, ''):
        return value

    # size check
    if hasattr(value, 'size') and value.size is not None:
        if value.size > max_size:
            raise serializers.ValidationError('File size must be 5 MB or smaller.')

    # try content_type first
    content_type = getattr(value, 'content_type', None)
    if content_type:
        if content_type not in ('image/jpeg', 'image/png'):
            raise serializers.ValidationError('File must be a JPEG or PNG image.')

    # If Pillow is available, perform binary check
    if Image is not None:
        try:
            data = value.read()
            try:
                value.seek(0)
            except Exception:
                pass

            bio = io.BytesIO(data)
            img = Image.open(bio)
            img.verify()
            fmt = img.format
            if fmt not in ('JPEG', 'PNG'):
                raise serializers.ValidationError('File must be a JPEG or PNG image.')
        except serializers.ValidationError:
            raise
        except Exception:
            # if Pillow cannot identify the image, reject
            raise serializers.ValidationError('File must be a valid JPEG or PNG image.')
        return value

    # Fallback: check extension
    try:
        import os
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png'):
            raise serializers.ValidationError('File must be a JPEG or PNG image.')
    except Exception:
        return value

    return value
