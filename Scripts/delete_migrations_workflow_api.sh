#!/bin/bash

# Script to delete all migrations in workflow_api (except __init__.py)
# Keeps __init__.py files intact

SERVICE_PATH="c:/work/Capstone 2/Ticket-Tracking-System/tts/workflow_api"

echo -e "\033[36mStarting migration deletion for workflow_api...\033[0m"

# Find all app directories with migrations
for app_dir in "$SERVICE_PATH"/*; do
    if [ -d "$app_dir" ]; then
        mig_dir="$app_dir/migrations"
        
        if [ -d "$mig_dir" ]; then
            app_name=$(basename "$app_dir")
            echo -e "\n\033[32m[workflow_api] App: $app_name\033[0m"
            
            # Delete all migration files except __init__.py
            for mig_file in "$mig_dir"/*.py; do
                if [ -f "$mig_file" ]; then
                    filename=$(basename "$mig_file")
                    
                    # Keep __init__.py only
                    if [ "$filename" = "__init__.py" ]; then
                        echo -e "  \033[33m✓ Keeping: $filename\033[0m"
                        continue
                    fi
                    
                    # Delete migration file
                    if rm -f "$mig_file" 2>/dev/null; then
                        echo -e "  \033[31m✗ Deleted: $filename\033[0m"
                    else
                        echo -e "  \033[31m! Error deleting $filename\033[0m"
                    fi
                fi
            done
            
            # Clean up __pycache__ in migrations directory
            if [ -d "$mig_dir/__pycache__" ]; then
                if rm -rf "$mig_dir/__pycache__" 2>/dev/null; then
                    echo -e "  \033[90m✓ Cleaned: __pycache__\033[0m"
                else
                    echo -e "  \033[31m! Error cleaning __pycache__\033[0m"
                fi
            fi
        fi
    fi
done

echo -e "\n\033[32m✓ Migration deletion complete!\033[0m"
echo -e "\033[36mNext steps:\033[0m"
echo -e "  1. Run 'python manage.py makemigrations' in workflow_api"
echo -e "  2. Run 'python manage.py migrate' in workflow_api"