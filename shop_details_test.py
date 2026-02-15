#!/usr/bin/env python3
"""
Backend API Testing Script for Salesman Shop Details Endpoint
Tests the GET /api/salesman/shops/{shop_id} API with shop transactions.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://import-hub-30.preview.emergentagent.com/api"

def print_test_header(title):
    """Print a formatted test section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_step(step_num, description):
    """Print a formatted test step"""
    print(f"\n[STEP {step_num}] {description}")
    print("-" * 50)

def make_request(method, endpoint, headers=None, data=None, files=None, form_data=False):
    """Make HTTP request and return response with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        print(f"Making {method} request to: {url}")
        if data and not form_data:
            print(f"Request data: {json.dumps(data, indent=2)}")
        elif data and form_data:
            print(f"Request form data: {data}")
        
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            if form_data:
                response = requests.post(url, headers=headers, data=data)
            elif files:
                response = requests.post(url, headers=headers, data=data)
            else:
                response = requests.post(url, headers=headers, json=data)
        
        print(f"Response status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            response_data = response.json()
            print(f"Response data: {json.dumps(response_data, indent=2)}")
            return response.status_code, response_data
        else:
            print(f"Response text: {response.text}")
            return response.status_code, response.text
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None, str(e)

def test_shop_details_api():
    """Test the complete flow of GET /api/salesman/shops/{shop_id} API"""
    
    print_test_header("TESTING GET /api/salesman/shops/{shop_id} API")
    
    # Variables to store authentication tokens and data
    admin_token = None
    salesman_token = None
    shop_id = None
    
    # Step 1: Login as admin to setup test data if needed
    print_step(1, "Login as Admin")
    admin_data = {
        "email": "superadmin@gmail.com",
        "password": "LS@Super"
    }
    
    status, response = make_request("POST", "/auth/login", data=admin_data)
    
    if status == 200 and "token" in response:
        admin_token = response["token"]
        print(f"✅ Admin login successful")
        print(f"Admin token: {admin_token[:50]}...")
    else:
        print(f"❌ Admin login failed: Status {status}, Response: {response}")
        return False
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Step 2: Check if any salesmen exist
    print_step(2, "Check existing salesmen")
    status, response = make_request("GET", "/salesmen", headers=admin_headers)
    
    salesmen = []
    if status == 200 and "salesmen" in response:
        salesmen = response["salesmen"]
        print(f"✅ Found {len(salesmen)} salesmen in database")
        for salesman in salesmen[:3]:  # Show first 3
            print(f"   - ID: {salesman.get('id')}, Name: {salesman.get('name')}, Phone: {salesman.get('phone')}")
    else:
        print(f"⚠️ Could not fetch salesmen: Status {status}")
    
    # Step 3: Get a salesman for testing (create one if none exist)
    test_salesman_phone = None
    test_salesman_pin = None
    
    if salesmen:
        # Use first salesman
        test_salesman = salesmen[0]
        test_salesman_phone = test_salesman.get("phone")
        test_salesman_pin = "1234"  # Default PIN
        print(f"✅ Using existing salesman: {test_salesman.get('name')} ({test_salesman_phone})")
    else:
        print("⚠️ No salesmen found. Need to create test data first.")
        
        # Check if routes exist
        print_step("2a", "Check existing routes")
        status, response = make_request("GET", "/routes", headers=admin_headers)
        
        routes = []
        if status == 200 and "routes" in response:
            routes = response["routes"]
            print(f"✅ Found {len(routes)} routes")
        
        route_id = None
        if routes:
            route_id = routes[0]["id"]
            print(f"✅ Using route: {routes[0]['route_name']} ({route_id})")
        else:
            # Create a test route
            print_step("2b", "Creating test route")
            route_data = {
                "route_name": "Test Route for API Testing"
            }
            status, response = make_request("POST", "/routes", headers=admin_headers, data=route_data)
            
            if status == 200 and "id" in response:
                route_id = response["id"]
                print(f"✅ Created test route: {route_id}")
            else:
                print(f"❌ Failed to create route: Status {status}")
                return False
        
        # Create a test salesman
        print_step("2c", "Creating test salesman")
        test_salesman_phone = "9876543210"
        test_salesman_pin = "1234"
        
        salesman_data = {
            "name": "Test Salesman for API",
            "phone": test_salesman_phone,
            "email": f"test.salesman.{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
            "route_id": route_id,
            "pin": test_salesman_pin,
            "confirm_pin": test_salesman_pin
        }
        
        status, response = make_request("POST", "/salesmen", headers=admin_headers, data=salesman_data)
        
        if status == 200:
            print(f"✅ Created test salesman successfully")
        else:
            print(f"❌ Failed to create salesman: Status {status}")
            return False
    
    # Step 4: Login as salesman
    print_step(4, "Login as Salesman")
    
    # Form data for salesman login
    form_data = {
        "phone": test_salesman_phone,
        "pin": test_salesman_pin
    }
    
    status, response = make_request("POST", "/auth/salesman/login", data=form_data, form_data=True)
    
    if status == 200 and "token" in response:
        salesman_token = response["token"]
        print(f"✅ Salesman login successful")
        print(f"Salesman token: {salesman_token[:50]}...")
        print(f"Salesman info: {response.get('salesman', {})}")
    else:
        print(f"❌ Salesman login failed: Status {status}, Response: {response}")
        return False
    
    salesman_headers = {"Authorization": f"Bearer {salesman_token}"}
    
    # Step 5: Get list of shops from salesman API
    print_step(5, "Get shops list via salesman API")
    
    # First get routes to find shops
    status, response = make_request("GET", "/salesman/routes", headers=salesman_headers)
    
    if status != 200:
        print(f"❌ Failed to get routes: Status {status}")
        return False
    
    routes = response.get("data", [])
    if not routes:
        print("❌ No routes found for salesman")
        return False
    
    # Get shops for first route
    route_id = routes[0]["id"]
    print(f"✅ Using route: {routes[0]['route_name']} ({route_id})")
    
    status, response = make_request("GET", f"/salesman/routes/{route_id}/shops", headers=salesman_headers)
    
    if status == 200 and "data" in response:
        shops = response["data"]
        print(f"✅ Found {len(shops)} shops in route")
        
        if shops:
            shop_id = shops[0]["id"]
            print(f"✅ Selected shop for testing: {shops[0]['name']} ({shop_id})")
            for shop in shops[:3]:  # Show first 3 shops
                print(f"   - ID: {shop.get('id')}, Name: {shop.get('name')}, Phone: {shop.get('phone', 'N/A')}")
        else:
            print("❌ No shops found in route")
            return False
    else:
        print(f"❌ Failed to get shops: Status {status}")
        return False
    
    # Step 6: Test the main API - GET /api/salesman/shops/{shop_id}
    print_step(6, f"Test GET /api/salesman/shops/{shop_id} - Main API Under Test")
    
    status, response = make_request("GET", f"/salesman/shops/{shop_id}", headers=salesman_headers)
    
    if status == 200 and "data" in response:
        shop_data = response["data"]
        print(f"✅ Shop details API successful!")
        
        # Validate response structure
        print("\n🔍 VALIDATING RESPONSE STRUCTURE:")
        
        # Check basic shop fields
        required_shop_fields = ["id", "name", "phone", "address", "previous_dues", "tray_balance", "route_id"]
        missing_fields = []
        
        for field in required_shop_fields:
            if field in shop_data:
                print(f"   ✅ {field}: {shop_data[field]}")
            else:
                missing_fields.append(field)
                print(f"   ❌ Missing field: {field}")
        
        # Check route_name
        if "route_name" in shop_data:
            print(f"   ✅ route_name: {shop_data['route_name']}")
        else:
            missing_fields.append("route_name")
            print(f"   ❌ Missing field: route_name")
        
        # Check NEW FIELDS - transactions array and total_transactions
        if "transactions" in shop_data:
            transactions = shop_data["transactions"]
            print(f"   ✅ transactions (array): Found {len(transactions)} transactions")
            
            # Check transaction structure if transactions exist
            if transactions:
                print("\n   🔍 VALIDATING TRANSACTION STRUCTURE:")
                first_txn = transactions[0]
                txn_fields = ["id", "salesman_id", "shop_id", "crates", "price", "order_amount", 
                             "collected_amount", "pending_amount", "payment_type", "sale_date", 
                             "sale_time", "salesman_name"]
                
                for field in txn_fields:
                    if field in first_txn:
                        print(f"      ✅ {field}: {first_txn[field]}")
                    else:
                        print(f"      ⚠️ Missing transaction field: {field}")
                
                # Show sample transactions
                print(f"\n   📋 SAMPLE TRANSACTIONS (showing first 3 of {len(transactions)}):")
                for i, txn in enumerate(transactions[:3]):
                    print(f"      Transaction {i+1}:")
                    print(f"         ID: {txn.get('id', 'N/A')}")
                    print(f"         Salesman: {txn.get('salesman_name', 'N/A')}")
                    print(f"         Crates: {txn.get('crates', 'N/A')}")
                    print(f"         Amount: {txn.get('collected_amount', 'N/A')}")
                    print(f"         Date: {txn.get('sale_date', 'N/A')}")
                    print(f"         Payment: {txn.get('payment_type', 'N/A')}")
            else:
                print("   ℹ️ No transactions found for this shop (empty array)")
        else:
            missing_fields.append("transactions")
            print(f"   ❌ Missing field: transactions")
        
        # Check total_transactions count
        if "total_transactions" in shop_data:
            total_count = shop_data["total_transactions"]
            transactions_count = len(shop_data.get("transactions", []))
            print(f"   ✅ total_transactions: {total_count}")
            
            if total_count == transactions_count:
                print(f"   ✅ Transaction count matches array length")
            else:
                print(f"   ⚠️ Transaction count mismatch: total_transactions={total_count}, array length={transactions_count}")
        else:
            missing_fields.append("total_transactions")
            print(f"   ❌ Missing field: total_transactions")
        
        # Summary
        if not missing_fields:
            print(f"\n🎉 ALL REQUIRED FIELDS PRESENT!")
            print(f"✅ API Response Structure: VALID")
            return True
        else:
            print(f"\n⚠️ Missing {len(missing_fields)} required fields: {missing_fields}")
            print(f"⚠️ API Response Structure: PARTIALLY VALID")
            return False
            
    else:
        print(f"❌ Shop details API failed: Status {status}, Response: {response}")
        return False

if __name__ == "__main__":
    print("Starting Shop Details API Test...")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    success = test_shop_details_api()
    
    print(f"\n{'='*60}")
    if success:
        print("🎉 TEST COMPLETED SUCCESSFULLY!")
        print("✅ GET /api/salesman/shops/{shop_id} API working correctly")
        print("✅ All required fields present in response")
        print("✅ Shop transactions feature implemented and working")
    else:
        print("❌ TEST FAILED!")
        print("❌ Issues found in API implementation")
    
    print(f"Test finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    sys.exit(0 if success else 1)