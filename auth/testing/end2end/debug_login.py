"""Debug script to test employee login flow"""
from playwright.sync_api import sync_playwright

LOGIN_API_URL = "/api/v1/hdts/employees/api/login/"
PROFILE_URL = "http://localhost:8000/profile-settings/"
LOGIN_URL = "http://localhost:8000/login/"

# Test credentials
EMAIL = "john.doe@example.com"
PASSWORD = "TestPassword123!"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    print("=" * 60)
    print("Step 1: Go to login page")
    page.goto(LOGIN_URL)
    page.wait_for_load_state('networkidle')
    print(f"Current URL: {page.url}")
    
    print("=" * 60)
    print("Step 2: Get CSRF token")
    csrf_token = page.evaluate("""
        () => {
            const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
            return csrfInput ? csrfInput.value : '';
        }
    """)
    print(f"CSRF Token: {csrf_token[:20]}..." if csrf_token else "No CSRF token found")
    
    print("=" * 60)
    print("Step 3: Call login API")
    response = page.evaluate(f"""
        async () => {{
            const response = await fetch('{LOGIN_API_URL}', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                    'X-CSRFToken': '{csrf_token}'
                }},
                body: JSON.stringify({{
                    email: '{EMAIL}',
                    password: '{PASSWORD}'
                }}),
                credentials: 'include'
            }});
            const data = await response.json();
            return {{
                status: response.status,
                data: data
            }};
        }}
    """)
    print(f"Response Status: {response.get('status')}")
    print(f"Response Data Keys: {response.get('data', {}).keys() if response.get('data') else 'None'}")
    if response.get('data', {}).get('errors'):
        print(f"Errors: {response['data']['errors']}")
    if response.get('data', {}).get('access'):
        print(f"Access Token: {response['data']['access'][:50]}...")
    
    print("=" * 60)
    print("Step 4: Check cookies after API call")
    cookies = page.context.cookies()
    for c in cookies:
        print(f"  Cookie: {c['name']} = {c['value'][:30] if len(c.get('value', '')) > 30 else c.get('value', '')}")
    
    print("=" * 60)
    print("Step 5: Manually add access_token cookie if received")
    if response and response.get('status') == 200 and response.get('data', {}).get('access'):
        page.context.add_cookies([{
            'name': 'access_token',
            'value': response['data']['access'],
            'domain': 'localhost',
            'path': '/',
            'httpOnly': True,
            'secure': False,
            'sameSite': 'Strict'
        }])
        print("Manually added access_token cookie")
        
        # Check cookies again
        cookies = page.context.cookies()
        print("Cookies after manual add:")
        for c in cookies:
            print(f"  Cookie: {c['name']} = {c['value'][:30] if len(c.get('value', '')) > 30 else c.get('value', '')}")
    else:
        print(f"Login failed or no access token in response")
    
    print("=" * 60)
    print("Step 6: Navigate to profile settings")
    page.goto(PROFILE_URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    print(f"Current URL: {page.url}")
    print(f"Page Title: {page.title()}")
    
    print("=" * 60)
    print("Step 7: Final cookies")
    cookies = page.context.cookies()
    for c in cookies:
        print(f"  Cookie: {c['name']} = {c['value'][:30] if len(c.get('value', '')) > 30 else c.get('value', '')}")
    
    print("=" * 60)
    print("Press Enter to close browser...")
    input()
    browser.close()
