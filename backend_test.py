import requests
import sys
import json
from datetime import datetime, timedelta

class MRBPlatformTester:
    def __init__(self, base_url="https://lead-distributor-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.supplier_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_lead_id = None
        self.created_supplier_id = None
        self.created_product_id = None
        self.created_sp_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@mrb.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin user: {response.get('user', {}).get('name', 'Unknown')}")
            return True
        return False

    def test_supplier_registration(self):
        """Test supplier registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Supplier Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": f"test_supplier_{timestamp}@test.com",
                "password": "TestPass123!",
                "name": f"Test Supplier {timestamp}",
                "company_name": "Test Scaffolding Co",
                "phone": f"98765{timestamp}",
                "supplier_type": "hybrid",
                "cities_served": ["Mumbai", "Delhi"]
            }
        )
        if success and 'token' in response:
            self.supplier_token = response['token']
            self.created_supplier_id = response.get('user', {}).get('id')
            print(f"   Supplier ID: {self.created_supplier_id}")
            return True
        return False

    def test_public_endpoints(self):
        """Test public endpoints"""
        tests = [
            ("Get Products", "GET", "products", 200),
            ("Get Cities", "GET", "public/cities", 200),
            ("Get Public Suppliers", "GET", "public/suppliers", 200),
        ]
        
        all_passed = True
        for name, method, endpoint, expected in tests:
            success, response = self.run_test(name, method, endpoint, expected)
            if not success:
                all_passed = False
            elif name == "Get Products" and response:
                print(f"   Found {len(response)} products")
        return all_passed

    def test_buyer_lead_creation(self):
        """Test buyer lead creation (no auth required)"""
        timestamp = datetime.now().strftime('%H%M%S')
        start_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        success, response = self.run_test(
            "Create Lead (Buyer)",
            "POST",
            "leads",
            200,
            data={
                "buyer_phone": f"9876543{timestamp[-3:]}",
                "buyer_name": f"Test Buyer {timestamp}",
                "buyer_company": "Test Construction Co",
                "city": "Mumbai",
                "start_date": start_date,
                "end_date": end_date,
                "items": [
                    {"product_name": "Scaffolding Pipe (MS Pipe)", "quantity": 100},
                    {"product_name": "Right Angle Clamp", "quantity": 50}
                ],
                "source": "platform"
            }
        )
        if success and response.get('id'):
            self.created_lead_id = response['id']
            print(f"   Lead ID: {self.created_lead_id}")
            print(f"   Repeat buyer: {response.get('is_repeat_buyer', False)}")
            return True
        return False

    def test_admin_lead_management(self):
        """Test admin lead management"""
        if not self.admin_token or not self.created_lead_id:
            print("❌ Admin token or lead ID not available")
            return False

        # Get all leads
        success, response = self.run_test(
            "Get All Leads",
            "GET",
            "leads",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        print(f"   Found {len(response)} leads")

        # Verify lead
        success, response = self.run_test(
            "Verify Lead",
            "PUT",
            f"leads/{self.created_lead_id}/verify",
            200,
            data={"status": "verified"},
            token=self.admin_token
        )
        if not success:
            return False
        print(f"   Lead status: {response.get('status')}")

        return True

    def test_admin_metrics(self):
        """Test admin metrics API"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False

        success, response = self.run_test(
            "Get Admin Metrics",
            "GET",
            "admin/metrics",
            200,
            token=self.admin_token
        )
        if success:
            metrics = response
            print(f"   Total leads: {metrics.get('total_leads', 0)}")
            print(f"   Verified: {metrics.get('verified', 0)}")
            print(f"   Total suppliers: {metrics.get('total_suppliers', 0)}")
            return True
        return False

    def test_supplier_dashboard(self):
        """Test supplier dashboard APIs"""
        if not self.supplier_token:
            print("❌ Supplier token not available")
            return False

        tests = [
            ("Get Supplier Leads", "GET", "supplier/leads", 200),
            ("Get Supplier Badges", "GET", "supplier/badges", 200),
            ("Get Supplier Profile", "GET", "supplier/profile", 200),
        ]
        
        all_passed = True
        for name, method, endpoint, expected in tests:
            success, response = self.run_test(name, method, endpoint, expected, token=self.supplier_token)
            if not success:
                all_passed = False
            elif name == "Get Supplier Leads":
                print(f"   Found {len(response)} leads for supplier")
            elif name == "Get Supplier Badges":
                print(f"   Performance score: {response.get('performance_score', 0)}%")
                print(f"   Total won: {response.get('total_won', 0)}")
        
        return all_passed

    def test_admin_suppliers(self):
        """Test admin suppliers API"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False

        success, response = self.run_test(
            "Get All Suppliers",
            "GET",
            "admin/suppliers",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} suppliers")
            return True
        return False

    def test_product_crud(self):
        """Test product CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False

        # Create product
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data={"name": "Test Scaffolding Item", "category": "Test", "description": "Test product"},
            token=self.admin_token
        )
        if not success:
            return False
        
        self.created_product_id = response.get('id')
        print(f"   Created product ID: {self.created_product_id}")

        # Update product
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.created_product_id}",
            200,
            data={"name": "Updated Test Item", "is_active": True},
            token=self.admin_token
        )
        if not success:
            return False

        # Delete product
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{self.created_product_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_service_provider_crud(self):
        """Test service provider CRUD operations"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False

        # Create service provider
        success, response = self.run_test(
            "Create Service Provider",
            "POST",
            "service-providers",
            200,
            data={
                "name": "Test Labor Provider",
                "category": "labor",
                "phone": "9876543210",
                "city": "Mumbai",
                "description": "Test labor provider"
            },
            token=self.admin_token
        )
        if not success:
            return False
        
        self.created_sp_id = response.get('id')
        print(f"   Created SP ID: {self.created_sp_id}")

        # Get all service providers
        success, response = self.run_test(
            "Get Service Providers",
            "GET",
            "service-providers",
            200,
            token=self.admin_token
        )
        if not success:
            return False
        print(f"   Found {len(response)} service providers")

        # Delete service provider
        success, response = self.run_test(
            "Delete Service Provider",
            "DELETE",
            f"service-providers/{self.created_sp_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_lead_assignment(self):
        """Test lead assignment to suppliers"""
        if not self.admin_token or not self.created_lead_id or not self.created_supplier_id:
            print("❌ Required tokens/IDs not available for assignment test")
            return False

        # Get suppliers for assignment
        success, suppliers_response = self.run_test(
            "Get Suppliers for Assignment",
            "GET",
            "admin/suppliers",
            200,
            token=self.admin_token
        )
        if not success or len(suppliers_response) < 1:
            print("❌ Not enough suppliers for assignment test")
            return False

        # Try to assign (need 5-7 suppliers, but we might not have enough)
        supplier_ids = [s['id'] for s in suppliers_response[:min(5, len(suppliers_response))]]
        
        # If we don't have 5 suppliers, this should fail with proper error
        expected_status = 200 if len(supplier_ids) >= 5 else 400
        
        success, response = self.run_test(
            "Assign Lead to Suppliers",
            "POST",
            f"leads/{self.created_lead_id}/assign",
            expected_status,
            data={"supplier_ids": supplier_ids},
            token=self.admin_token
        )
        
        if expected_status == 400:
            print(f"   Expected failure due to insufficient suppliers ({len(supplier_ids)} < 5)")
            return True
        elif success:
            print(f"   Assigned to {len(supplier_ids)} suppliers")
            return True
        return False

def main():
    print("🚀 Starting MRB Listing Platform API Tests")
    print("=" * 50)
    
    tester = MRBPlatformTester()
    
    # Test sequence
    test_sequence = [
        ("Public Endpoints", tester.test_public_endpoints),
        ("Admin Login", tester.test_admin_login),
        ("Supplier Registration", tester.test_supplier_registration),
        ("Buyer Lead Creation", tester.test_buyer_lead_creation),
        ("Admin Lead Management", tester.test_admin_lead_management),
        ("Admin Metrics", tester.test_admin_metrics),
        ("Admin Suppliers", tester.test_admin_suppliers),
        ("Supplier Dashboard", tester.test_supplier_dashboard),
        ("Product CRUD", tester.test_product_crud),
        ("Service Provider CRUD", tester.test_service_provider_crud),
        ("Lead Assignment", tester.test_lead_assignment),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} FAILED")
            else:
                print(f"✅ {test_name} PASSED")
        except Exception as e:
            failed_tests.append(test_name)
            print(f"❌ {test_name} FAILED with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if failed_tests:
        print(f"\n❌ Failed test categories:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n🎉 All test categories passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())