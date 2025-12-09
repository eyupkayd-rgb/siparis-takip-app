#!/usr/bin/env python3
"""
Backend API Testing Script
Tests all backend endpoints to ensure they are working correctly.
"""

import requests
import json
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    return None

def test_backend_apis():
    """Test all backend API endpoints"""
    
    backend_url = get_backend_url()
    if not backend_url:
        print("❌ CRITICAL: Could not get backend URL from frontend/.env")
        return False
    
    api_base = f"{backend_url}/api"
    print(f"🔍 Testing Backend APIs at: {api_base}")
    print("=" * 60)
    
    all_tests_passed = True
    
    # Test 1: Root endpoint
    print("1. Testing Root Endpoint (/api/)")
    try:
        response = requests.get(f"{api_base}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("   ✅ Root endpoint working correctly")
            else:
                print(f"   ❌ Unexpected response: {data}")
                all_tests_passed = False
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Root endpoint error: {e}")
        all_tests_passed = False
    
    # Test 2: Create status check (POST)
    print("\n2. Testing Create Status Check (POST /api/status)")
    try:
        test_data = {
            "client_name": "Test Client Modal Verification"
        }
        response = requests.post(f"{api_base}/status", 
                               json=test_data, 
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "client_name" in data and "timestamp" in data:
                print("   ✅ Status check creation working correctly")
                print(f"   📝 Created status with ID: {data['id']}")
            else:
                print(f"   ❌ Missing required fields in response: {data}")
                all_tests_passed = False
        else:
            print(f"   ❌ Status creation failed: {response.status_code}")
            print(f"   📄 Response: {response.text}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Status creation error: {e}")
        all_tests_passed = False
    
    # Test 3: Get status checks (GET)
    print("\n3. Testing Get Status Checks (GET /api/status)")
    try:
        response = requests.get(f"{api_base}/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"   ✅ Status retrieval working correctly")
                print(f"   📊 Found {len(data)} status records")
                if len(data) > 0:
                    print(f"   📝 Latest record: {data[-1]['client_name']}")
            else:
                print(f"   ❌ Expected list, got: {type(data)}")
                all_tests_passed = False
        else:
            print(f"   ❌ Status retrieval failed: {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Status retrieval error: {e}")
        all_tests_passed = False
    
    print("\n" + "=" * 60)
    if all_tests_passed:
        print("🎉 ALL BACKEND API TESTS PASSED")
        return True
    else:
        print("❌ SOME BACKEND API TESTS FAILED")
        return False

if __name__ == "__main__":
    print("🚀 Starting Backend API Tests...")
    print(f"⏰ Test Time: {datetime.now()}")
    
    success = test_backend_apis()
    
    if success:
        print("\n✅ Backend APIs are working correctly")
        exit(0)
    else:
        print("\n❌ Backend API issues detected")
        exit(1)