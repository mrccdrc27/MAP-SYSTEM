#!/bin/bash

# Capstone Scripts CLI Installer (Unix/Linux/macOS)

SCRIPTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTS_ROOT")"

echo ""
echo "=== Capstone Scripts CLI Installer ==="
echo ""

# Detect uninstall flag
if [[ "$1" == "--uninstall" ]]; then
    echo "Uninstalling CLI..."
    
    # Remove from PATH in shell profiles
    for profile_file in ~/.bashrc ~/.bash_profile ~/.zshrc ~/.profile; do
        if [[ -f "$profile_file" ]]; then
            sed -i.bak '/# Capstone CLI/,/# End Capstone CLI/d' "$profile_file"
            rm -f "${profile_file}.bak"
        fi
    done
    
    echo "✓ Removed from shell profiles"
    
    # Remove symlink if exists
    if [[ -L /usr/local/bin/scripts ]]; then
        sudo rm /usr/local/bin/scripts
        echo "✓ Removed symlink from /usr/local/bin/scripts"
    fi
    
    echo ""
    echo "✓ CLI uninstalled successfully!"
    echo ""
    exit 0
fi

# --- Install Mode ---

echo "Detected System: $(uname -s)"
echo "Scripts Location: $SCRIPTS_ROOT"
echo ""
echo "Installation Methods:"
echo "  1. Symlink in /usr/local/bin (Recommended, requires sudo)"
echo "  2. Add Scripts folder to PATH via shell profile (No sudo)"
echo "  3. Both methods"
echo ""

read -p "Select option (1-3): " choice

install_symlink=false
install_path=false

case $choice in
    1) install_symlink=true ;;
    2) install_path=true ;;
    3) install_symlink=true; install_path=true ;;
    *) echo "Invalid choice. Exiting."; exit 1 ;;
esac

# Method 1: Symlink
if [ "$install_symlink" = true ]; then
    echo ""
    echo "[Symlink Method]"
    
    if sudo ln -sf "$SCRIPTS_ROOT/scripts.cmd" /usr/local/bin/scripts; then
        sudo chmod +x /usr/local/bin/scripts
        echo "✓ Created symlink at /usr/local/bin/scripts"
    else
        echo "⚠ Failed to create symlink (check sudo permissions)"
        install_symlink=false
    fi
fi

# Method 2: PATH in shell profile
if [ "$install_path" = true ]; then
    echo ""
    echo "[PATH Method]"
    
    shell_files=(~/.bashrc ~/.bash_profile ~/.zshrc ~/.profile)
    added=false
    
    for profile_file in "${shell_files[@]}"; do
        if [[ -f "$profile_file" ]]; then
            if ! grep -q "# Capstone CLI" "$profile_file"; then
                cat >> "$profile_file" << EOF

# Capstone CLI
if [[ ":\$PATH:" != *":$SCRIPTS_ROOT:"* ]]; then
    export PATH="$SCRIPTS_ROOT:\$PATH"
fi
# End Capstone CLI
EOF
                echo "✓ Added to $profile_file"
                added=true
            fi
        fi
    done
    
    if [ "$added" = true ]; then
        echo ""
        echo "⚠ Please restart your terminal or run: source ~/.bashrc (or ~/.zshrc for zsh)"
    fi
fi

# Completion message
echo ""
echo "✓ CLI Installation Complete!"
echo ""
echo "Usage:"
echo "  scripts list          # Show all available scripts"
echo "  scripts menu          # Open interactive menu"
echo "  scripts run tts start # Run specific script"
echo ""
echo "To uninstall: $SCRIPTS_ROOT/install-cli.sh --uninstall"
echo ""
