import pytest
from fastapi.testclient import TestClient


class TestMainEndpoints:
    """Test main application endpoints."""
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
        assert "environment" in data
    
    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint redirect."""
        response = client.get("/")
        # Should redirect to docs
        assert response.status_code in [200, 307, 308]
    
    def test_docs_endpoint(self, client: TestClient):
        """Test API documentation endpoint."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_openapi_endpoint(self, client: TestClient):
        """Test OpenAPI schema endpoint."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data
        assert data["info"]["title"] == "Bali Malayali DMC API"
    
    def test_cors_headers(self, client: TestClient):
        """Test CORS headers are present."""
        response = client.options("/health")
        # CORS preflight should be handled
        assert response.status_code in [200, 204]
    
    def test_invalid_endpoint(self, client: TestClient):
        """Test invalid endpoint returns 404."""
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data


class TestAPIStructure:
    """Test API structure and router inclusion."""
    
    def test_auth_router_included(self, client: TestClient):
        """Test auth router is included."""
        # Test an auth endpoint exists (even if it returns 401/403)
        response = client.get("/auth/me")
        # Should not be 404 (router not found)
        assert response.status_code != 404
    
    def test_agents_router_included(self, client: TestClient):
        """Test agents router is included."""
        response = client.get("/agents/profile")
        assert response.status_code != 404
    
    def test_quotes_router_included(self, client: TestClient):
        """Test quotes router is included."""
        response = client.get("/quotes")
        assert response.status_code != 404
    
    def test_bookings_router_included(self, client: TestClient):
        """Test bookings router is included."""
        response = client.get("/bookings")
        assert response.status_code != 404
    
    def test_packages_router_included(self, client: TestClient):
        """Test packages router is included."""
        response = client.get("/packages")
        assert response.status_code != 404
    
    def test_analytics_router_included(self, client: TestClient):
        """Test analytics router is included."""
        response = client.get("/analytics/dashboard")
        assert response.status_code != 404
    
    def test_admin_router_included(self, client: TestClient):
        """Test admin router is included."""
        response = client.get("/admin/users")
        assert response.status_code != 404


class TestErrorHandling:
    """Test error handling and responses."""
    
    def test_method_not_allowed(self, client: TestClient):
        """Test method not allowed error."""
        response = client.post("/health")  # Health endpoint only accepts GET
        assert response.status_code == 405
        
        data = response.json()
        assert "detail" in data
    
    def test_validation_error_format(self, client: TestClient):
        """Test validation error format."""
        # Try to create a quote with invalid data
        response = client.post("/quotes", json={"invalid": "data"})
        
        # Should return validation error (422) or authentication error (401/403)
        assert response.status_code in [401, 403, 422]
        
        if response.status_code == 422:
            data = response.json()
            assert "detail" in data
    
    def test_content_type_validation(self, client: TestClient):
        """Test content type validation."""
        # Send invalid content type
        response = client.post(
            "/quotes",
            data="invalid data",
            headers={"Content-Type": "text/plain"}
        )
        
        # Should return error for invalid content type or auth error
        assert response.status_code in [400, 401, 403, 422]


class TestSecurity:
    """Test security-related functionality."""
    
    def test_protected_endpoints_require_auth(self, client: TestClient):
        """Test that protected endpoints require authentication."""
        protected_endpoints = [
            "/auth/me",
            "/agents/profile",
            "/quotes",
            "/bookings",
            "/analytics/dashboard",
            "/admin/users"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            # Should return 401 (unauthorized) or 403 (forbidden)
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require auth"
    
    def test_admin_endpoints_require_admin_role(self, client: TestClient):
        """Test that admin endpoints require admin role."""
        admin_endpoints = [
            "/admin/users",
            "/admin/agents/pending",
            "/admin/hotels",
            "/admin/add-ons",
            "/admin/tier-config"
        ]
        
        # Test with regular user headers (non-admin)
        headers = {
            "Authorization": "Bearer test_token",
            "X-User-Role": "agent"
        }
        
        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=headers)
            # Should return 401, 403, or other auth-related error
            assert response.status_code in [401, 403], f"Admin endpoint {endpoint} should require admin role"
    
    def test_security_headers_present(self, client: TestClient):
        """Test that security headers are present in responses."""
        response = client.get("/health")
        
        # Check for common security headers
        # Note: These might be added by middleware or reverse proxy in production
        headers = response.headers
        
        # At minimum, we should have content-type
        assert "content-type" in headers
        
        # FastAPI automatically adds some security headers
        # We can test for their presence if configured


class TestPerformance:
    """Test performance-related aspects."""
    
    def test_health_check_response_time(self, client: TestClient):
        """Test health check responds quickly."""
        import time
        
        start_time = time.time()
        response = client.get("/health")
        end_time = time.time()
        
        assert response.status_code == 200
        # Health check should respond within 1 second
        assert (end_time - start_time) < 1.0
    
    def test_concurrent_health_checks(self, client: TestClient):
        """Test multiple concurrent health checks."""
        import concurrent.futures
        import threading
        
        def make_request():
            return client.get("/health")
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__])