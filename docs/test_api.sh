#!/bin/bash
API_URL="http://localhost:8000"

# 1. Login (using valid credentials from main.py startup event if any, or default admin)
# main.py usually creates admin@clinica.com / admin123 on startup
echo "Logging in..."
TOKEN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@clinica.com", "password": "admin123"}')

TOKEN=$(echo $TOKEN_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Login failed: $TOKEN_RESP"
    exit 1
fi

echo "Got Token."

# 2. Create a dummy product
echo "Creating dummy product to delete..."
CREATE_RESP=$(curl -s -X POST "$API_URL/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "ProductoTestCLI", "category": "Insumo", "unit": "unidad", "min_stock": 10}')

PRODUCT_ID=$(echo $CREATE_RESP | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$PRODUCT_ID" ]; then
    echo "Failed to create product: $CREATE_RESP"
    exit 1
fi

echo "Created Product ID: $PRODUCT_ID"

# 3. Try to delete it
echo "Deleting Product ID: $PRODUCT_ID..."
DELETE_RESP=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $TOKEN")

response_body=${DELETE_RESP::-3}
http_code=${DELETE_RESP: -3}

echo "Response Code: $http_code"
echo "Response Body: $response_body"

if [ "$http_code" == "200" ]; then
    echo "SUCCESS: Product deleted."
else
    echo "FAILURE: Could not delete product."
fi
