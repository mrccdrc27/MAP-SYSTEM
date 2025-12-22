import re


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
