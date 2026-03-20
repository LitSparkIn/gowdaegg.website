import requests
import sys
from datetime import datetime

class GowdaEggAPITester:
    def __init__(self, base_url="https://tray-balance-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_login_valid(self):
        """Test login with valid credentials"""
        success, response = self.run_test(
            "Login with Valid Credentials",
            "POST",
            "auth/login",
            200,
            data={
                "email": "superadmin@litspark.solutions",
                "password": "LS@Super"
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:50]}...")
            return True
        return False

    def test_login_invalid_email(self):
        """Test login with invalid email"""
        return self.run_test(
            "Login with Invalid Email",
            "POST",
            "auth/login",
            401,
            data={
                "email": "invalid@example.com",
                "password": "LS@Super"
            }
        )[0]

    def test_login_invalid_password(self):
        """Test login with invalid password"""
        return self.run_test(
            "Login with Invalid Password",
            "POST",
            "auth/login",
            401,
            data={
                "email": "superadmin@litspark.solutions",
                "password": "wrongpassword"
            }
        )[0]

    def test_login_missing_fields(self):
        """Test login with missing fields"""
        return self.run_test(
            "Login with Missing Fields",
            "POST",
            "auth/login",
            422,  # Validation error
            data={"email": "superadmin@litspark.solutions"}
        )[0]

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            print("❌ Skipping - No token available")
            return False
        
        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )[0]

    def test_get_current_user_no_token(self):
        """Test getting current user without token"""
        old_token = self.token
        self.token = None
        success = self.run_test(
            "Get Current User (No Token)",
            "GET",
            "auth/me",
            403  # Forbidden without token
        )[0]
        self.token = old_token
        return success

    def test_change_password(self):
        """Test change password endpoint"""
        if not self.token:
            print("❌ Skipping - No token available")
            return False
        
        return self.run_test(
            "Change Password",
            "POST",
            "auth/change-password",
            200,
            data={
                "current_password": "LS@Super",
                "new_password": "NewPassword123!"
            }
        )[0]

    def test_change_password_wrong_current(self):
        """Test change password with wrong current password"""
        if not self.token:
            print("❌ Skipping - No token available")
            return False
        
        return self.run_test(
            "Change Password (Wrong Current)",
            "POST",
            "auth/change-password",
            400,
            data={
                "current_password": "wrongpassword",
                "new_password": "NewPassword123!"
            }
        )[0]

def main():
    print("🥚 Starting Gowda Egg Distributors API Tests")
    print("=" * 50)
    
    tester = GowdaEggAPITester()
    
    # Test sequence
    tests = [
        ("API Root", tester.test_api_root),
        ("Valid Login", tester.test_login_valid),
        ("Invalid Email Login", tester.test_login_invalid_email),
        ("Invalid Password Login", tester.test_login_invalid_password),
        ("Missing Fields Login", tester.test_login_missing_fields),
        ("Get Current User", tester.test_get_current_user),
        ("Get Current User (No Token)", tester.test_get_current_user_no_token),
        ("Change Password", tester.test_change_password),
        ("Change Password (Wrong Current)", tester.test_change_password_wrong_current),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": f"Test crashed: {str(e)}"
            })
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"  - {failure.get('test', 'Unknown')}: {failure.get('error', failure.get('actual', 'Unknown error'))}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())