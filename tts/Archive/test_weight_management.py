#!/usr/bin/env python
"""
Weight Management Endpoint Test Script
Demonstrates how to use the weight management API
"""

import requests
import json
from datetime import timedelta

BASE_URL = "http://localhost:8000/api"
WORKFLOW_ID = 2

# Example test data
example_response = {
    "workflow_id": 2,
    "workflow_name": "Asset Check Out Workflow",
    "slas": {
        "low_sla": "432000.0",
        "medium_sla": "172800.0",
        "high_sla": "28800.0",
        "urgent_sla": "14400.0"
    },
    "steps": [
        {
            "step_id": 4,
            "name": "Asset Check Out Workflow - Triage Ticket",
            "weight": 1,
            "role_id": 1,
            "role_name": "Admin",
            "order": 1
        },
        {
            "step_id": 5,
            "name": "Asset Check Out Workflow - Resolve Ticket",
            "weight": 1,
            "role_id": 2,
            "role_name": "Asset Manager",
            "order": 2
        },
        {
            "step_id": 6,
            "name": "Asset Check Out Workflow - Finalize Ticket",
            "weight": 1,
            "role_id": 1,
            "role_name": "Admin",
            "order": 3
        }
    ]
}

def test_get_weights():
    """Test GET /weights/workflow/<workflow_id>/"""
    print("\n" + "="*60)
    print("TEST: GET Weight Data")
    print("="*60)
    
    url = f"{BASE_URL}/weights/workflow/{WORKFLOW_ID}/"
    print(f"GET {url}")
    
    # In practice, you'd use:
    # response = requests.get(url, cookies={'token': your_token})
    # data = response.json()
    
    print("\nExpected Response:")
    print(json.dumps(example_response, indent=2))

def test_update_weights():
    """Test PUT /weights/workflow/<workflow_id>/"""
    print("\n" + "="*60)
    print("TEST: Update Step Weights")
    print("="*60)
    
    url = f"{BASE_URL}/weights/workflow/{WORKFLOW_ID}/"
    print(f"PUT {url}")
    
    payload = {
        "steps": [
            {"step_id": 4, "weight": 2},
            {"step_id": 5, "weight": 5},
            {"step_id": 6, "weight": 3}
        ]
    }
    
    print("\nRequest Payload:")
    print(json.dumps(payload, indent=2))
    
    print("\nExpected Response:")
    expected_response = {
        "message": "Updated 3 step weights",
        "updated_count": 3,
        "steps": [
            {
                "step_id": 4,
                "name": "Asset Check Out Workflow - Triage Ticket",
                "weight": 2,
                "role_id": 1,
                "role_name": "Admin",
                "order": 1
            },
            {
                "step_id": 5,
                "name": "Asset Check Out Workflow - Resolve Ticket",
                "weight": 5,
                "role_id": 2,
                "role_name": "Asset Manager",
                "order": 2
            },
            {
                "step_id": 6,
                "name": "Asset Check Out Workflow - Finalize Ticket",
                "weight": 3,
                "role_id": 1,
                "role_name": "Admin",
                "order": 3
            }
        ]
    }
    print(json.dumps(expected_response, indent=2))

def test_error_cases():
    """Test error handling"""
    print("\n" + "="*60)
    print("TEST: Error Cases")
    print("="*60)
    
    print("\n1. Non-existent workflow:")
    print("GET /weights/workflow/9999/")
    print("Response: 404 - Workflow with ID 9999 not found")
    
    print("\n2. Invalid weight values:")
    payload = {
        "steps": [
            {"step_id": 4}  # Missing weight
        ]
    }
    print("PUT /weights/workflow/2/")
    print("Payload:", json.dumps(payload))
    print("Response: 400 - Missing step_id or weight in payload")
    
    print("\n3. Non-existent step:")
    payload = {
        "steps": [
            {"step_id": 9999, "weight": 5}
        ]
    }
    print("PUT /weights/workflow/2/")
    print("Payload:", json.dumps(payload))
    print("Response: 400 - Step with ID 9999 not found in workflow 2")

if __name__ == "__main__":
    print("\nWeight Management API - Test Documentation")
    test_get_weights()
    test_update_weights()
    test_error_cases()
    
    print("\n" + "="*60)
    print("USAGE NOTES")
    print("="*60)
    print("""
1. GET /weights/workflow/{workflow_id}/
   - Retrieves all 4 SLAs (urgent, high, medium, low) for the workflow
   - Retrieves all steps for that workflow with their weights
   - Authentication: Required (JWT token in cookies)
   
2. PUT /weights/workflow/{workflow_id}/
   - Updates weights for steps in the workflow
   - Payload must contain "steps" array with step_id and weight
   - Weight must be a positive integer
   - Returns updated steps and count of successful updates
   - Authentication: Required (JWT token in cookies)
   
3. Weight Interpretation
   - Higher weight = step takes proportionally more time
   - Weights are used to calculate actual time allocation per step
   - Example: If urgent_sla is 4 hours and steps have weights [1, 2, 1],
     each step gets 4*1/4, 4*2/4, 4*1/4 hours respectively
    """)
