#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BrowserAPITester:
    def __init__(self, base_url="https://briskbrowser.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.test_user = "testuser123"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        
    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - FAILED: {details}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, params=params)
            
            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success:
                try:
                    error_data = response.json()
                    details += f" - {error_data}"
                except:
                    details += f" - {response.text[:200]}"
            
            self.log_test(name, success, details if not success else "")
            return success, response.json() if success and response.content else {}
            
        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with valid username
        success, response = self.run_test(
            "Login with valid username",
            "POST", 
            "auth/login",
            200,
            data={"username": self.test_user}
        )
        
        # Test login with empty username
        self.run_test(
            "Login with empty username",
            "POST",
            "auth/login", 
            400,
            data={"username": ""}
        )
        
        return success

    def test_bookmarks_flow(self):
        """Test bookmark management"""
        print("\n📚 Testing Bookmarks...")
        
        # Get initial bookmarks
        self.run_test(
            "Get bookmarks",
            "GET",
            "bookmarks",
            200,
            params={"user": self.test_user}
        )
        
        # Create a bookmark
        bookmark_data = {
            "url": "https://example.com",
            "title": "Test Bookmark",
            "favicon": "https://example.com/favicon.ico"
        }
        
        success, response = self.run_test(
            "Create bookmark",
            "POST",
            "bookmarks",
            200,
            data=bookmark_data,
            params={"user": self.test_user}
        )
        
        bookmark_id = None
        if success and 'bookmark' in response:
            bookmark_id = response['bookmark']['id']
        
        # Delete the bookmark if created
        if bookmark_id:
            self.run_test(
                "Delete bookmark",
                "DELETE",
                f"bookmarks/{bookmark_id}",
                200,
                params={"user": self.test_user}
            )
        
        # Try to delete non-existent bookmark
        self.run_test(
            "Delete non-existent bookmark",
            "DELETE",
            "bookmarks/nonexistent",
            404,
            params={"user": self.test_user}
        )

    def test_history_flow(self):
        """Test history management"""
        print("\n📜 Testing History...")
        
        # Get history
        self.run_test(
            "Get history",
            "GET",
            "history",
            200,
            params={"user": self.test_user}
        )
        
        # Add history entry
        history_data = {
            "url": "https://test.com",
            "title": "Test Page"
        }
        
        self.run_test(
            "Add history entry",
            "POST",
            "history",
            200,
            data=history_data,
            params={"user": self.test_user}
        )
        
        # Clear history
        self.run_test(
            "Clear history",
            "DELETE",
            "history",
            200,
            params={"user": self.test_user}
        )

    def test_preferences_flow(self):
        """Test user preferences"""
        print("\n⚙️ Testing Preferences...")
        
        # Get preferences
        self.run_test(
            "Get preferences",
            "GET",
            "preferences",
            200,
            params={"user": self.test_user}
        )
        
        # Update theme
        prefs_data = {
            "theme": "tech-dark",
            "settings": {"test": "value"}
        }
        
        self.run_test(
            "Update preferences",
            "PUT",
            "preferences",
            200,
            data=prefs_data,
            params={"user": self.test_user}
        )

    def test_sessions_flow(self):
        """Test session management"""
        print("\n💾 Testing Sessions...")
        
        # Get sessions
        self.run_test(
            "Get sessions",
            "GET",
            "sessions",
            200,
            params={"user": self.test_user}
        )
        
        # Create session
        session_data = {
            "name": "Test Session",
            "tabs": [
                {"url": "https://google.com", "title": "Google"},
                {"url": "https://github.com", "title": "GitHub"}
            ]
        }
        
        success, response = self.run_test(
            "Create session",
            "POST",
            "sessions",
            200,
            data=session_data,
            params={"user": self.test_user}
        )
        
        session_id = None
        if success and 'session' in response:
            session_id = response['session']['id']
        
        # Delete session if created
        if session_id:
            self.run_test(
                "Delete session",
                "DELETE",
                f"sessions/{session_id}",
                200,
                params={"user": self.test_user}
            )
        
        # Try to delete non-existent session
        self.run_test(
            "Delete non-existent session",
            "DELETE",
            "sessions/nonexistent",
            404,
            params={"user": self.test_user}
        )

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Browser API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {self.test_user}")
        
        # Test authentication first
        auth_success = self.test_auth_flow()
        if not auth_success:
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Run all other tests
        self.test_bookmarks_flow()
        self.test_history_flow() 
        self.test_preferences_flow()
        self.test_sessions_flow()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = BrowserAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())