import re
import io
from rest_framework import serializers


try:
    from PIL import Image
except Exception:
    Image = None

def normalize_name_smart(name: str) -> str:
    """Normalize a name string with smart title-casing while preserving short acronyms

    Rules implemented:
    - Collapse whitespace
    - For tokens ending with "'s" (case-insensitive), preserve the "'s" lowercase and
      smart-case the base token.
    - If the alphabetic part of a token is short (<=4 chars) treat it as an acronym and
      uppercase the alphabetic groups (e.g., "sdd's" -> "SDD's").
    - Otherwise, apply title() to the token (normal Title Case).

    This is heuristic-based and aims to keep acronyms readable while making ordinary
    words Title Case.
    """

    if not name:
        return name

    s = " ".join(name.split()).strip()

    # If the alphabetic portion of the entire input is all uppercase, we
    # assume the user typed in caps-lock and should be converted to Title Case.
    # However, preserve short acronyms (<=3 letters) which are often intended
    # to remain uppercase (e.g., "TEA", "TnT" (mixed) preserved by other logic).
    letters_only = re.sub(r"[^A-Za-z]", "", s)
    all_upper_input = bool(letters_only) and letters_only.isupper()
    all_lower_input = bool(letters_only) and letters_only.islower()

    def fix_token(tok: str) -> str:
        # handle trailing possessive 's or ’s
        lower_tok = tok
        if lower_tok.lower().endswith("'s") or lower_tok.lower().endswith("’s"):
            base = tok[:-2]
            suffix = tok[-2:]
            letters = re.sub(r"[^A-Za-z]", "", base)
            # ALL-CAPS input: treat short alphabetic bases as acronyms, title-case others
            if all_upper_input:
                if 1 <= len(letters) <= 3:
                    return re.sub(r"[A-Za-z]+", lambda m: m.group(0).upper(), base) + "'s"
                return base.title() + "'s"
            # all-lowercase input: convert to Title Case
            if all_lower_input:
                return base.title() + "'s"
            # mixed-case input: preserve user's casing for mixed tokens
            return base + "'s"

        # general token handling
        letters = re.sub(r"[^A-Za-z]", "", tok)
        # If the whole input was ALL-CAPS, convert to Title Case except short
        # alphabetic tokens (<=3 letters) which we keep uppercased as acronyms.
        if all_upper_input:
            if 1 <= len(letters) <= 3:
                return re.sub(r"[A-Za-z]+", lambda m: m.group(0).upper(), tok)
            return tok.title()

        # If the whole input was all-lowercase, convert tokens to Title Case.
        if all_lower_input:
            return tok.title()

        # Mixed-case input: preserve user's intended casing (do not force acronyms).
        return tok

    tokens = s.split(' ')
    fixed = [fix_token(t) for t in tokens]
    return ' '.join(fixed)


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
            # read bytes and validate image
            pos = None
            try:
                pos = value.tell()
            except Exception:
                pos = None
            data = value.read()
            # reset pointer if possible
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
