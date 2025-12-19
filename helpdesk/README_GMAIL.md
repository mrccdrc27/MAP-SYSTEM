# Gmail OAuth setup (development)

This document explains how to set up Gmail OAuth credentials for local development.

## 1. Create OAuth client credentials
1. Go to https://console.developers.google.com/
2. Create or select a project.
3. Enable the Gmail API for the project.
4. Create OAuth 2.0 Client IDs (Application type: Desktop app).
5. Download the JSON client secret and save it to:

   `backend/client_secret_1011117020190-...apps.googleusercontent.com.json`

   or a filename matching `client_secret_*.json`.

## 2. Run the OAuth test script
From the `backend/` directory (activate the virtualenv first):

```powershell
pip install -r requirements.txt
python gmail_send_test.py
```

The script uses the client secret file in the `backend/` directory and will open a browser to perform the OAuth consent flow. It will create `token.json` in the `backend/` folder.

## 3. Keep credentials secret
- `client_secret_*.json` and `token.json` are ignored by `.gitignore`.
- Never commit these files to source control. If they were committed, remove them with:

```powershell
git rm --cached backend/token.json
git rm --cached "backend/client_secret_*.json"
git commit -m "Remove committed Gmail secrets"
```

## 4. Development safety toggle
To avoid sending real emails while developing, set the env var `GMAIL_DISABLE=true` when running the server.

## 5. Troubleshooting
- If you see "No such file or directory" for the client secret file, ensure the filename matches `client_secret_*.json` and is located in `backend/`.
- If tokens expire, re-run the OAuth flow to regenerate `token.json` or ensure the `refresh_token` is present (the script will attempt to refresh automatically in `gmail_utils.py`).
