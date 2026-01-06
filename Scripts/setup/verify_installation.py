#!/usr/bin/env python3
"""
Python-based Installation Verification Script
Verifies that all required packages are installed and importable
"""

import sys
import importlib
import pkg_resources
from pathlib import Path
from typing import List, Dict, Tuple

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.OKCYAN}{'=' * 50}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{text}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{'=' * 50}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}[OK]{Colors.ENDC} {text}")

def print_error(text: str):
    print(f"{Colors.FAIL}[X]{Colors.ENDC} {text}")

def print_warning(text: str):
    print(f"{Colors.WARNING}[!]{Colors.ENDC} {text}")

def print_info(text: str):
    print(f"{Colors.OKBLUE}[i]{Colors.ENDC} {text}")

def parse_requirements(requirements_file: Path) -> List[Tuple[str, str]]:
    """Parse requirements.txt and return list of (package, version) tuples"""
    requirements = []
    
    if not requirements_file.exists():
        print_error(f"Requirements file not found: {requirements_file}")
        return requirements
    
    with open(requirements_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            
            # Parse package name and version
            if '==' in line:
                parts = line.split('==')
                package = parts[0].strip()
                version = parts[1].strip() if len(parts) > 1 else None
            elif '>=' in line:
                parts = line.split('>=')
                package = parts[0].strip()
                version = None  # Don't check specific version for >= requirements
            else:
                package = line.strip()
                version = None
            
            requirements.append((package, version))
    
    return requirements

def get_installed_packages() -> Dict[str, str]:
    """Get dictionary of installed packages and their versions"""
    installed = {}
    
    for dist in pkg_resources.working_set:
        package_name = dist.project_name.lower().replace('_', '-')
        installed[package_name] = dist.version
    
    return installed

def normalize_package_name(name: str) -> str:
    """Normalize package name for comparison"""
    return name.lower().replace('_', '-')

def test_import(package_name: str, import_name: str = None) -> bool:
    """Test if a package can be imported"""
    if import_name is None:
        import_name = package_name.replace('-', '_')
    
    try:
        importlib.import_module(import_name)
        return True
    except ImportError:
        return False

def verify_installation(requirements_file: Path, detailed: bool = False):
    """Main verification function"""
    
    print_header("Python Installation Verification")
    
    # Python version
    print_info(f"Python version: {sys.version.split()[0]}")
    print_info(f"Python executable: {sys.executable}")
    print()
    
    # Parse requirements
    print("Parsing requirements file...")
    requirements = parse_requirements(requirements_file)
    
    if not requirements:
        print_error("No requirements found or file doesn't exist")
        return False
    
    print_success(f"Found {len(requirements)} required packages")
    print()
    
    # Get installed packages
    print("Scanning installed packages...")
    installed = get_installed_packages()
    print_success(f"Found {len(installed)} installed packages")
    print()
    
    # Verify each requirement
    print_header("Verifying Required Packages")
    
    missing = []
    version_mismatches = []
    verified = []
    
    for package, expected_version in requirements:
        normalized = normalize_package_name(package)
        
        if normalized in installed:
            installed_version = installed[normalized]
            
            if expected_version and installed_version != expected_version:
                version_mismatches.append((package, expected_version, installed_version))
                if detailed:
                    print_warning(f"{package}")
                    print(f"    Expected: {expected_version}")
                    print(f"    Installed: {installed_version}")
            else:
                verified.append(package)
                if detailed:
                    print_success(f"{package} ({installed_version})")
        else:
            missing.append(package)
            if detailed:
                print_error(f"{package} - MISSING")
    
    # Summary
    print_header("Verification Summary")
    
    print(f"Total expected packages:  {len(requirements)}")
    print(f"{Colors.OKGREEN}Verified packages:        {len(verified)}{Colors.ENDC}")
    print(f"{Colors.WARNING}Version mismatches:       {len(version_mismatches)}{Colors.ENDC}")
    print(f"{Colors.FAIL}Missing packages:         {len(missing)}{Colors.ENDC}")
    print()
    
    # Show problems
    if missing:
        print_header("Missing Packages")
        for pkg in missing:
            print_error(pkg)
        print()
    
    if version_mismatches and not detailed:
        print_header("Version Mismatches")
        for pkg, expected, installed in version_mismatches:
            print_warning(f"{pkg}: expected {expected}, got {installed}")
        print()
    
    # Test critical imports
    print_header("Testing Critical Package Imports")
    
    critical_packages = [
        ('django', 'django'),
        ('djangorestframework', 'rest_framework'),
        ('celery', 'celery'),
        ('psycopg2-binary', 'psycopg2'),
        ('channels', 'channels'),
        ('pika', 'pika'),
        ('redis', 'redis'),
        ('requests', 'requests'),
    ]
    
    import_failures = []
    
    for package, import_name in critical_packages:
        # Check if package is in requirements
        if not any(normalize_package_name(pkg) == normalize_package_name(package) 
                   for pkg, _ in requirements):
            continue
        
        sys.stdout.write(f"Testing {package}... ")
        sys.stdout.flush()
        
        if test_import(package, import_name):
            print(f"{Colors.OKGREEN}[OK]{Colors.ENDC}")
        else:
            print(f"{Colors.FAIL}[FAILED]{Colors.ENDC}")
            import_failures.append(package)
    
    print()
    
    # Final verdict
    print_header("Final Verdict")
    
    has_issues = bool(missing or import_failures)
    
    if missing:
        print_error("Installation has missing packages!")
    
    if import_failures:
        print_error("Some critical packages cannot be imported!")
    
    if version_mismatches:
        print_warning("Some packages have version mismatches")
        print("    (This may or may not cause issues)")
    
    if not has_issues:
        print_success("All packages installed and working correctly!")
        print("\nYour Python environment is ready to use.")
    else:
        print("\nRecommendation: Re-run the installation script:")
        print("  .\\Scripts\\setup\\install_requirements.ps1")
    
    print()
    
    return not has_issues

def main():
    # Determine requirements file path
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent.parent
    requirements_file = root_dir / "requirements_aggregated.txt"
    
    # Check for command line arguments
    detailed = '--detailed' in sys.argv or '-d' in sys.argv
    
    if '--help' in sys.argv or '-h' in sys.argv:
        print("Usage: python verify_installation.py [--detailed|-d] [--help|-h]")
        print("\nOptions:")
        print("  --detailed, -d    Show detailed output for all packages")
        print("  --help, -h        Show this help message")
        sys.exit(0)
    
    # Run verification
    success = verify_installation(requirements_file, detailed)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
