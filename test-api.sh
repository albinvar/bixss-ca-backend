#!/bin/bash

echo "=== Testing CA Management System API ==="
echo ""

# Test health endpoint
echo "1. Testing Health Endpoint..."
curl -s http://localhost:3000/health | python -m json.tool
echo ""

# Register a user
echo "2. Testing User Registration..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234","name":"Test User","role":"CA"}' \
  | python -m json.tool
echo ""

# Login
echo "3. Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}')

echo $LOGIN_RESPONSE | python -m json.tool
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"//' | sed 's/"$//')

# Get profile
echo "4. Testing Get Profile (Authenticated)..."
curl -s http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool
echo ""

# Get all users
echo "5. Testing Get All Users (Authenticated)..."
curl -s "http://localhost:3000/api/users?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool
echo ""

echo "=== All tests completed ==="
