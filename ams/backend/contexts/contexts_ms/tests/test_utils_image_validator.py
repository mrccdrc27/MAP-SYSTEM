import io
from django.test import SimpleTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import serializers
from PIL import Image

from ..utils import validate_image_file


class ImageValidatorTests(SimpleTestCase):
    def create_image_file(self, fmt='PNG', size=(100, 100), color=(255, 0, 0)):
        """Create an in-memory image and return a SimpleUploadedFile."""
        bio = io.BytesIO()
        img = Image.new('RGB', size, color=color)
        img.save(bio, format=fmt)
        bio.seek(0)
        content = bio.read()
        name = f'test_image.{fmt.lower()}'
        content_type = f'image/{fmt.lower() if fmt.lower() != "jpeg" else "jpeg"}'
        return SimpleUploadedFile(name, content, content_type=content_type)

    def test_validate_image_file_accepts_valid_png(self):
        f = self.create_image_file(fmt='PNG')
        # Should not raise
        try:
            res = validate_image_file(f)
        except Exception as e:
            self.fail(f'validate_image_file raised unexpectedly: {e}')
        # validator should return the original value
        self.assertIs(res, f)

    def test_validate_image_file_rejects_wrong_format(self):
        # Create a GIF image (unsupported by validator)
        f = self.create_image_file(fmt='GIF')
        with self.assertRaises(serializers.ValidationError):
            validate_image_file(f)

    def test_validate_image_file_rejects_oversized_file(self):
        # Create arbitrary bytes >5MB and mark as jpeg
        big_size = 5 * 1024 * 1024 + 10
        content = b'0' * big_size
        f = SimpleUploadedFile('big.jpg', content, content_type='image/jpeg')
        with self.assertRaises(serializers.ValidationError):
            validate_image_file(f)
