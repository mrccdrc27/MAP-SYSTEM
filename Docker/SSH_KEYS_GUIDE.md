# SSH Keys - Complete Guide

## What is an SSH Key?

SSH (Secure Shell) keys are a pair of cryptographic keys used for secure, passwordless authentication to remote servers. Think of them like a high-tech lock and key system.

### The Concept

**Traditional SSH:** Username + Password
```
You → Type Password → Server checks → Access granted/denied
Problem: Passwords can be guessed, intercepted, or forgotten
```

**SSH Key Authentication:** Public + Private Key pair
```
You (Private Key) ↔ Server (Public Key) → Encrypted handshake → Access granted
Problem solved: Mathematically impossible to crack, no password to type
```

### How It Works (Simple Explanation)

Imagine you have:
- **Public Key** = A mailbox anyone can put mail into
- **Private Key** = The only key that opens that mailbox

When you create SSH keys:
1. Two mathematically linked keys are generated
2. You give your **public key** to the server (it goes in the mailbox)
3. You keep your **private key** safe (like your house key)
4. When connecting, the server challenges you with a math problem
5. Only your private key can solve it correctly
6. Server says "yes, you're authorized!" without needing a password

---

## Key Components Explained

### Public Key File
- **What:** Publicly shareable cryptographic key
- **Where to put:** On every server you want to access
- **Format:** `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC... your_email@domain`
- **Security:** Safe to share, paste anywhere, post online
- **File:** `~/.ssh/id_rsa.pub` (the `.pub` means public)

### Private Key File
- **What:** Secret key that only you have
- **Where to keep:** On YOUR computer only (encrypted)
- **Format:** 
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUtbm9uZS1ub25lAAAAAA...
  -----END OPENSSH PRIVATE KEY-----
  ```
- **Security:** NEVER share, NEVER post online, ALWAYS protect
- **File:** `~/.ssh/id_rsa` (no extension = private)

### Key Fingerprint
- **What:** A short identifier/hash of your public key
- **Example:** `SHA256:abcdef1234567890...`
- **Purpose:** Easy way to verify you're using the right key
- **Use:** Compare fingerprints to ensure keys haven't been tampered with

---

## Why Use SSH Keys Over Passwords?

| Factor | Passwords | SSH Keys |
|--------|-----------|----------|
| **Security** | Can be guessed, brute-forced | Cryptographically impossible to crack |
| **Convenience** | Remember/type each time | One-time setup, use forever |
| **Man-in-Middle** | Vulnerable to interception | Protected by encryption math |
| **Key Rotation** | Change password every 90 days | Change key when needed |
| **Automation** | Can't automate (security risk) | Perfect for scripts and CI/CD |
| **Access Revocation** | Remove user account | Remove public key from server |

---

## How to Create SSH Keys

### On Windows (PowerShell)

#### Step 1: Check if you already have keys
```powershell
# Check if keys exist
Test-Path $env:USERPROFILE\.ssh\id_rsa
Test-Path $env:USERPROFILE\.ssh\id_rsa.pub

# If both return True, you already have keys
# If False, you need to create them
```

#### Step 2: Create your SSH key pair
```powershell
# Generate a new SSH key
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N ""

# What this means:
# -t rsa         : Use RSA encryption (most compatible)
# -b 4096        : Use 4096-bit encryption (very secure)
# -f "$path"     : Save to this file path
# -N ""          : No passphrase (empty quotes = no password)
```

**Output:**
```
Generating public/private rsa key pair.
Your identification has been saved in C:\Users\YourName\.ssh\id_rsa
Your public key has been saved in C:\Users\YourName\.ssh\id_rsa.pub
The key fingerprint is: SHA256:xxxxxxxxxxxxx
```

#### Step 3: View your public key
```powershell
# Display your public key (safe to share)
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub

# Output should look like:
# ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbO... yourname@COMPUTER
```

#### Step 4: Verify both files exist
```powershell
# List your SSH keys
Get-ChildItem $env:USERPROFILE\.ssh\

# Should show:
# id_rsa       (private key - KEEP SECRET)
# id_rsa.pub   (public key - safe to share)
```

---

### On macOS/Linux

#### Step 1: Check existing keys
```bash
# Check if keys exist
ls -la ~/.ssh/

# If you see id_rsa and id_rsa.pub, you're done
# If not, create them
```

#### Step 2: Create your SSH key pair
```bash
# Generate a new SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# Breakdown:
# -t rsa      : RSA encryption type
# -b 4096     : 4096-bit size (very secure)
# -f ~/.ssh/  : Save location
# -N ""       : No passphrase
```

#### Step 3: View your public key
```bash
# Display your public key
cat ~/.ssh/id_rsa.pub

# Or copy it directly to clipboard (macOS):
cat ~/.ssh/id_rsa.pub | pbcopy

# Or copy it directly to clipboard (Linux):
cat ~/.ssh/id_rsa.pub | xclip -selection clipboard
```

#### Step 4: Verify
```bash
# Check permissions (important!)
ls -la ~/.ssh/id_rsa
# Should show: -rw------- (600 permissions, only you can read)

ls -la ~/.ssh/id_rsa.pub
# Should show: -rw-r--r-- (644 permissions, readable by others)
```

---

## Step-by-Step: Add Key to DigitalOcean

### 1. Copy Your Public Key

**Windows:**
```powershell
# Copy public key to clipboard
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub | Set-Clipboard

# Verify it's in clipboard
Get-Clipboard
```

**macOS:**
```bash
cat ~/.ssh/id_rsa.pub | pbcopy
```

**Linux:**
```bash
cat ~/.ssh/id_rsa.pub | xclip -selection clipboard
```

### 2. Go to DigitalOcean

1. Log in: https://cloud.digitalocean.com
2. Click: **Settings** (bottom left)
3. Click: **Security** (left sidebar)
4. Click: **SSH Keys** section
5. Click: **Add SSH Key** button

### 3. Paste Your Public Key

1. Paste your public key into the text box
2. Name it: `my-production-key` (descriptive name)
3. Click: **Add SSH Key**

### 4. Verify

You should see your key listed with its fingerprint:
```
my-production-key
SHA256:abcdef1234567890...
```

---

## Step-by-Step: Use Key to Connect to Droplet

### 1. Create Droplet with Your Key

**During Droplet Creation:**
1. Go to **Create → Droplets**
2. Choose size (2GB RAM)
3. Choose OS (Ubuntu 22.04)
4. Scroll down to **Authentication**
5. Select: **SSH Key**
6. Select: **my-production-key** (your newly added key)
7. Click: **Create Droplet**

**Important:** Don't use password authentication!

### 2. Connect to Your Droplet

**Windows PowerShell:**
```powershell
# Connect using SSH key
ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@<droplet-ip>

# Example:
ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@192.168.1.100

# First time: Type "yes" to accept the fingerprint
# Then: You're logged in!
```

**macOS/Linux:**
```bash
# Connect using SSH key
ssh -i ~/.ssh/id_rsa root@<droplet-ip>

# Example:
ssh -i ~/.ssh/id_rsa root@192.168.1.100

# Type "yes" when asked about fingerprint
```

### 3. Verify Connection

```bash
# You should see:
# root@droplet-name:~#

# This means you're logged in to the remote server!

# Try a command:
whoami
# Should output: root

# Check uptime:
uptime
```

---

## Advanced: Key with Passphrase (More Secure)

By default, we created keys with **no passphrase**. If you want extra security:

### Create Key WITH Passphrase

**Windows:**
```powershell
# Generate key and it will ask for passphrase
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa"

# It will ask:
# Enter passphrase (empty for no passphrase): [type your passphrase]
# Enter same passphrase again: [type again]

# Example passphrase: MySecure!Pass123
```

**macOS/Linux:**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# It will ask:
# Enter passphrase (empty for no passphrase): [type your passphrase]
# Enter same passphrase again: [type again]
```

### What This Does

- Passphrase = password to unlock your private key
- Each time you use the key, you must type the passphrase
- Trade-off: More secure but less convenient for automation
- **Recommendation:** Use for personal workstation, skip for CI/CD

---

## Different Key Types Explained

### RSA (Recommended for DigitalOcean)
```powershell
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N ""
```
- **Security:** Very secure (4096-bit standard)
- **Compatibility:** Works everywhere (older servers too)
- **Size:** Larger key files
- **Speed:** Slightly slower

### Ed25519 (Newer, More Modern)
```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_eddsa" -N ""
```
- **Security:** Super secure
- **Compatibility:** Newer systems only
- **Size:** Much smaller key files
- **Speed:** Faster than RSA
- **Note:** DigitalOcean supports this

### ECDSA (Middle Ground)
```powershell
ssh-keygen -t ecdsa -b 256 -f "$env:USERPROFILE\.ssh\id_ecdsa" -N ""
```
- **Security:** Good
- **Compatibility:** Modern systems
- **Size:** Medium
- **Speed:** Faster than RSA

**For DigitalOcean in 2025:** Use **RSA (4096-bit)** - most compatible

---

## File Permissions (IMPORTANT!)

### What Permissions Your Keys Need

```bash
# Private key should be readable ONLY by you
ls -la ~/.ssh/id_rsa
# Should show: -rw------- (600)

# Public key can be readable by others
ls -la ~/.ssh/id_rsa.pub
# Should show: -rw-r--r-- (644)

# SSH directory itself
ls -ld ~/.ssh/
# Should show: drwx------ (700)
```

### Fix Permissions (if needed)

**macOS/Linux:**
```bash
chmod 600 ~/.ssh/id_rsa      # Private key: only you can read
chmod 644 ~/.ssh/id_rsa.pub  # Public key: readable by others
chmod 700 ~/.ssh/            # Directory: only you can access
```

**Windows (PowerShell):**
```powershell
# Windows typically handles this automatically
# But if you need to restrict, use:
icacls "$env:USERPROFILE\.ssh\id_rsa" /inheritance:r /grant:r "$env:USERNAME`:`(F`)"
```

### Why This Matters

- **Wrong permissions = SSH won't work**
- Private key too open = SSH will refuse to use it
- SSH is protective by design: "That private key is too public!"

---

## Troubleshooting SSH Keys

### Problem: "Permission denied (publickey)"

**Cause:** Key not on server or not authorized

**Solution:**
```bash
# Verify your public key is on the server:
cat ~/.ssh/authorized_keys

# If you don't see your key, add it:
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# Fix permissions:
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh/
```

### Problem: "Could not open a connection to your authentication agent"

**Windows Solution:**
```powershell
# Start SSH agent
Start-Service ssh-agent

# Add your key
ssh-add "$env:USERPROFILE\.ssh\id_rsa"

# List added keys
ssh-add -l
```

**macOS/Linux Solution:**
```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_rsa

# List added keys
ssh-add -l
```

### Problem: "No such file or directory"

**Cause:** Key file doesn't exist

**Solution:**
```powershell
# Check if keys exist
Test-Path $env:USERPROFILE\.ssh\id_rsa
# If False, create them (see "How to Create SSH Keys" section)
```

### Problem: "Bad permissions" or "Unprotected private key file"

**Solution:**
```bash
# Fix permissions
chmod 600 ~/.ssh/id_rsa
```

---

## Multiple SSH Keys (Advanced)

You can have multiple SSH keys for different purposes:

### Example Setup

```
~/.ssh/
├── id_rsa              (general purpose)
├── id_rsa.pub
├── digitalocean        (for DigitalOcean servers)
├── digitalocean.pub
├── github              (for GitHub access)
├── github.pub
└── config              (configuration file)
```

### Create Multiple Keys

```bash
# Key for DigitalOcean
ssh-keygen -t rsa -b 4096 -f ~/.ssh/digitalocean -N ""

# Key for GitHub
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github -N ""

# Key for production servers
ssh-keygen -t rsa -b 4096 -f ~/.ssh/production -N ""
```

### Configure SSH Config

**File:** `~/.ssh/config`

```bash
# Default key for most connections
Host *
    IdentityFile ~/.ssh/id_rsa

# DigitalOcean droplets
Host digitalocean.com
    IdentityFile ~/.ssh/digitalocean
    User root

# GitHub
Host github.com
    IdentityFile ~/.ssh/github
    User git

# Production servers
Host prod-*.yourdomain.com
    IdentityFile ~/.ssh/production
    User deploy
```

### Usage

```bash
# Automatically uses id_rsa for most servers
ssh user@example.com

# Automatically uses digitalocean key and root user
ssh digitalocean.com

# Automatically uses production key
ssh deploy@prod-01.yourdomain.com
```

---

## Security Best Practices

### ✅ DO

- ✅ Create a new key for each major service/environment
- ✅ Use strong key size (4096-bit RSA minimum)
- ✅ Keep private keys backed up (encrypted)
- ✅ Use passphrase for sensitive keys
- ✅ Rotate keys annually
- ✅ Store keys on encrypted disk
- ✅ Restrict file permissions (600 on private key)
- ✅ Use different keys for different environments

### ❌ DON'T

- ❌ Share private keys with anyone
- ❌ Commit private keys to Git
- ❌ Upload private keys online
- ❌ Email private keys
- ❌ Use passwords instead of keys
- ❌ Leave keys with loose permissions
- ❌ Use same key for dev and production
- ❌ Save keys in cloud storage without encryption

---

## Backup Your SSH Keys

### Why Backup?

- Lost key = Can't access servers
- Damaged disk = Lost access forever
- New computer = Need access from there too

### Backup Strategy

```bash
# 1. Backup to encrypted location
cp -r ~/.ssh ~/ssh-backup-encrypted/

# 2. Make a password-protected archive
tar czf - ~/.ssh | openssl enc -aes-256-cbc -out ssh-backup.tar.gz

# 3. Store in:
# - External hard drive (encrypted)
# - Password manager
# - Cloud storage (encrypted)
# - NOT in Git or public locations
```

### Restore from Backup

```bash
# Restore keys
cp -r ~/ssh-backup-encrypted/.ssh ~/.ssh

# Fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

---

## Using SSH Keys with Git

### Add SSH Key to GitHub

1. Copy your public key:
```powershell
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub | Set-Clipboard
```

2. Go to: https://github.com/settings/keys
3. Click: **New SSH key**
4. Paste your public key
5. Click: **Add SSH key**

### Clone with SSH Instead of HTTPS

```bash
# Instead of:
git clone https://github.com/user/repo.git

# Use:
git clone git@github.com:user/repo.git
```

### Verify SSH Works with GitHub

```bash
ssh -T git@github.com
# Should output: Hi username! You've successfully authenticated...
```

---

## For Your DigitalOcean Deployment

### Quick Summary

```powershell
# 1. Create SSH key (Windows PowerShell)
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N ""

# 2. View public key
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub

# 3. Add to DigitalOcean (copy output above into DigitalOcean console)

# 4. Create droplet with this SSH key

# 5. Connect to your droplet
ssh -i "$env:USERPROFILE\.ssh\id_rsa" root@<droplet-ip>

# 6. You're in! Start deployment from DEPLOYMENT_GUIDE.md
```

---

## Key Concepts Summary

| Concept | What It Is | Who Needs It |
|---------|-----------|-------------|
| **SSH Key Pair** | Two linked crypto keys (public + private) | Everyone accessing remote servers |
| **Public Key** | Shareable part, goes on servers | Can be given to anyone |
| **Private Key** | Secret part, stays on your computer | NEVER share, ALWAYS protect |
| **Passphrase** | Optional password to unlock private key | Extra security for sensitive keys |
| **Key Fingerprint** | Short identifier of your key | Verification/debugging |
| **Permissions** | File access rules (600 for private) | Critical for SSH to work |
| **Config File** | Maps hosts to different keys | Convenience for multiple keys |

---

## Additional Resources

### Documentation
- **SSH Basics:** https://www.ssh.com/ssh/
- **OpenSSH Manual:** https://man.openbsd.org/ssh-keygen
- **DigitalOcean Guide:** https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/
- **GitHub SSH:** https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Tools
- **PuTTY** (Windows GUI): https://www.putty.org/
- **MobaXterm** (Windows advanced): https://mobaxterm.mobatek.net/
- **Termius** (Cross-platform): https://termius.com/
- **VS Code Remote SSH**: Built-in SSH client

---

## Quick Cheat Sheet

```powershell
# Windows PowerShell

# CREATE key
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N ""

# VIEW public key
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub

# LIST keys
Get-ChildItem $env:USERPROFILE\.ssh\

# CONNECT to server
ssh -i "$env:USERPROFILE\.ssh\id_rsa" user@server-ip

# COPY key to clipboard
Get-Content $env:USERPROFILE\.ssh\id_rsa.pub | Set-Clipboard

# START SSH agent
Start-Service ssh-agent

# ADD key to agent
ssh-add "$env:USERPROFILE\.ssh\id_rsa"

# LIST keys in agent
ssh-add -l
```

```bash
# macOS/Linux

# CREATE key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# VIEW public key
cat ~/.ssh/id_rsa.pub

# LIST keys
ls -la ~/.ssh/

# CONNECT to server
ssh -i ~/.ssh/id_rsa user@server-ip

# COPY to clipboard (macOS)
cat ~/.ssh/id_rsa.pub | pbcopy

# START SSH agent
eval "$(ssh-agent -s)"

# ADD key to agent
ssh-add ~/.ssh/id_rsa

# LIST keys in agent
ssh-add -l

# FIX permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 700 ~/.ssh/
```

---

**Now you understand SSH keys!** You're ready to:
1. Create your own key pair
2. Add it to DigitalOcean
3. Connect securely to your Droplet
4. Deploy your application

Next: Follow the `DEPLOYMENT_GUIDE.md` section on "Initial SSH Connection" 🚀

