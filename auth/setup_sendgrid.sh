#!/bin/bash
# SendGrid Setup Helper Script

echo "============================================================"
echo "   SendGrid Email Service Setup"
echo "============================================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
fi

# Check if SENDGRID_API_KEY is set
if grep -q "SENDGRID_API_KEY=your-sendgrid-api-key-here" .env || grep -q "SENDGRID_API_KEY=$" .env; then
    echo "⚠️  SENDGRID_API_KEY not configured in .env"
    echo ""
    echo "📝 Setup Steps:"
    echo "1. Go to https://sendgrid.com and sign up"
    echo "2. Navigate to Settings → API Keys"
    echo "3. Create a new API key with 'Mail Send' permissions"
    echo "4. Copy the API key"
    echo ""
    read -p "Paste your SendGrid API key (or press Enter to skip): " api_key
    
    if [ ! -z "$api_key" ]; then
        # Update .env file
        if grep -q "SENDGRID_API_KEY=" .env; then
            sed -i "s/SENDGRID_API_KEY=.*/SENDGRID_API_KEY=$api_key/" .env
        else
            echo "SENDGRID_API_KEY=$api_key" >> .env
        fi
        echo "✅ SENDGRID_API_KEY updated in .env"
    else
        echo "⏭️  Skipped API key setup"
    fi
else
    echo "✅ SENDGRID_API_KEY is configured"
fi

echo ""

# Check FROM_EMAIL
if grep -q "SENDGRID_FROM_EMAIL=noreply@yourdomain.com" .env; then
    echo "⚠️  SENDGRID_FROM_EMAIL still set to default"
    echo ""
    read -p "Enter your FROM email address (e.g., noreply@yourdomain.com): " from_email
    
    if [ ! -z "$from_email" ]; then
        sed -i "s/SENDGRID_FROM_EMAIL=.*/SENDGRID_FROM_EMAIL=$from_email/" .env
        echo "✅ SENDGRID_FROM_EMAIL updated to $from_email"
        echo ""
        echo "🔔 IMPORTANT: You must verify this email in SendGrid!"
        echo "   Go to: Settings → Sender Authentication → Verify a Single Sender"
    else
        echo "⏭️  Skipped FROM email setup"
    fi
else
    CURRENT_FROM=$(grep "SENDGRID_FROM_EMAIL=" .env | cut -d '=' -f2)
    echo "✅ SENDGRID_FROM_EMAIL is configured: $CURRENT_FROM"
fi

echo ""

# Check FROM_NAME
if grep -q "SENDGRID_FROM_NAME=TicketFlow" .env; then
    echo "ℹ️  SENDGRID_FROM_NAME set to: TicketFlow"
    read -p "Change sender name? (press Enter to keep 'TicketFlow'): " from_name
    
    if [ ! -z "$from_name" ]; then
        sed -i "s/SENDGRID_FROM_NAME=.*/SENDGRID_FROM_NAME=$from_name/" .env
        echo "✅ SENDGRID_FROM_NAME updated to: $from_name"
    fi
else
    echo "✅ SENDGRID_FROM_NAME is configured"
fi

echo ""
echo "============================================================"
echo "   Configuration Summary"
echo "============================================================"
echo ""
grep "SENDGRID_" .env | grep -v "^#"
echo ""

# Offer to run test
echo "============================================================"
echo "   Next Steps"
echo "============================================================"
echo ""
echo "1. ✅ Verify your sender email in SendGrid dashboard"
echo "   https://app.sendgrid.com/settings/sender_auth"
echo ""
echo "2. 🧪 Test the email service:"
echo "   - Edit test_sendgrid.py and set TEST_EMAIL"
echo "   - Run: python manage.py shell < test_sendgrid.py"
echo ""
echo "3. 📖 Read the documentation:"
echo "   - auth/emails/README.md"
echo "   - auth/SENDGRID_MIGRATION_COMPLETE.md"
echo ""

read -p "Run test now? (y/N): " run_test

if [ "$run_test" = "y" ] || [ "$run_test" = "Y" ]; then
    echo ""
    echo "⚠️  Make sure to edit test_sendgrid.py first!"
    echo "   Set TEST_EMAIL to your actual email address"
    read -p "Press Enter to continue..."
    python manage.py shell < test_sendgrid.py
fi

echo ""
echo "✅ Setup complete!"
echo ""
