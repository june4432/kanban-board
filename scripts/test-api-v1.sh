#!/bin/bash

# API v1 Endpoint Test Script
# Tests all v1 endpoints with API Key authentication

API_KEY="sk_live_lkNMr7i4mM9ECnm4I_zuFBrUaT3ObnrS"
BASE_URL="http://localhost:3000/api/v1"
AUTH_HEADER="Authorization: Bearer $API_KEY"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test header
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to print test result
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local method=$1
    local endpoint=$2
    local status=$3
    local expected=$4

    echo -e "\n${YELLOW}Test #$TOTAL_TESTS: $method $endpoint${NC}"

    if [ "$status" == "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Status: $status"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC} - Expected: $expected, Got: $status"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to make API call and check status
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "$AUTH_HEADER" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi

    # Split response and status code
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    print_test "$method" "$endpoint" "$status_code" "$expected_status"

    # Print response body (truncated if too long)
    if [ ${#body} -gt 200 ]; then
        echo "Response: ${body:0:200}..."
    else
        echo "Response: $body"
    fi
}

# Start testing
echo -e "${GREEN}Starting API v1 Endpoint Tests${NC}"
echo -e "API Key: ${API_KEY:0:20}..."
echo -e "Base URL: $BASE_URL"

# ========================================
# Projects Endpoints
# ========================================
print_header "PROJECTS ENDPOINTS"

# GET /api/v1/projects
test_endpoint "GET" "/projects" "200"

# GET /api/v1/projects with filters
test_endpoint "GET" "/projects?page=1&pageSize=10" "200"

# POST /api/v1/projects (create new project)
PROJECT_DATA='{"name":"API Test Project","description":"Created via API","isPublic":false}'
create_response=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$PROJECT_DATA" "$BASE_URL/projects")
project_status=$(echo "$create_response" | tail -n1)
project_body=$(echo "$create_response" | sed '$d')
print_test "POST" "/projects" "$project_status" "201"
echo "Response: $project_body"

# Extract project ID if created successfully
if [ "$project_status" == "201" ]; then
    PROJECT_ID=$(echo "$project_body" | grep -o '"projectId":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Created project ID: $PROJECT_ID${NC}"

    # GET /api/v1/projects/[id]
    test_endpoint "GET" "/projects/$PROJECT_ID" "200"

    # PATCH /api/v1/projects/[id]
    UPDATE_DATA='{"name":"API Test Project (Updated)"}'
    test_endpoint "PATCH" "/projects/$PROJECT_ID" "200" "$UPDATE_DATA"

    # GET /api/v1/projects/[id]/board
    test_endpoint "GET" "/projects/$PROJECT_ID/board" "200"
fi

# ========================================
# Cards Endpoints
# ========================================
print_header "CARDS ENDPOINTS"

# First, we need to get a project with boards
# Using test-project-1 that we know exists
TEST_PROJECT="test-project-1"

# GET /api/v1/cards
test_endpoint "GET" "/cards?projectId=$TEST_PROJECT" "200"

# POST /api/v1/cards (create new card)
CARD_DATA='{"title":"API Test Card","description":"Created via API","columnId":"board-test-project-1-todo","projectId":"'$TEST_PROJECT'","priority":"medium"}'
create_card_response=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$CARD_DATA" "$BASE_URL/cards")
card_status=$(echo "$create_card_response" | tail -n1)
card_body=$(echo "$create_card_response" | sed '$d')
print_test "POST" "/cards" "$card_status" "201"
echo "Response: $card_body"

# Extract card ID if created successfully
if [ "$card_status" == "201" ]; then
    CARD_ID=$(echo "$card_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Created card ID: $CARD_ID${NC}"

    # GET /api/v1/cards/[id]
    test_endpoint "GET" "/cards/$CARD_ID?projectId=$TEST_PROJECT" "200"

    # PATCH /api/v1/cards/[id] (API uses PATCH, not PUT)
    UPDATE_CARD_DATA='{"title":"API Test Card (Updated)","priority":"high"}'
    test_endpoint "PATCH" "/cards/$CARD_ID?projectId=$TEST_PROJECT" "200" "$UPDATE_CARD_DATA"

    # POST /api/v1/cards/[id]/move
    MOVE_DATA='{"columnId":"board-test-project-1-in-progress","position":0}'
    test_endpoint "POST" "/cards/$CARD_ID/move?projectId=$TEST_PROJECT" "200" "$MOVE_DATA"

    # DELETE /api/v1/cards/[id] (returns 204 No Content on success)
    test_endpoint "DELETE" "/cards/$CARD_ID?projectId=$TEST_PROJECT" "204"
fi

# ========================================
# Organizations Endpoints
# ========================================
print_header "ORGANIZATIONS ENDPOINTS"

# GET /api/v1/organizations
test_endpoint "GET" "/organizations" "200"

# POST /api/v1/organizations (create new organization)
ORG_DATA='{"name":"API Test Org","description":"Created via API"}'
create_org_response=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$ORG_DATA" "$BASE_URL/organizations")
org_status=$(echo "$create_org_response" | tail -n1)
org_body=$(echo "$create_org_response" | sed '$d')
print_test "POST" "/organizations" "$org_status" "201"
echo "Response: $org_body"

# Extract org ID if created successfully
if [ "$org_status" == "201" ]; then
    ORG_ID=$(echo "$org_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Created organization ID: $ORG_ID${NC}"

    # GET /api/v1/organizations/[id]
    test_endpoint "GET" "/organizations/$ORG_ID" "200"

    # PATCH /api/v1/organizations/[id]
    UPDATE_ORG_DATA='{"name":"API Test Org (Updated)"}'
    test_endpoint "PATCH" "/organizations/$ORG_ID" "200" "$UPDATE_ORG_DATA"

    # GET /api/v1/organizations/[id]/members
    test_endpoint "GET" "/organizations/$ORG_ID/members" "200"

    # DELETE /api/v1/organizations/[id] (returns 204 No Content on success)
    test_endpoint "DELETE" "/organizations/$ORG_ID" "204"
fi

# ========================================
# API Keys Endpoints
# ========================================
print_header "API KEYS ENDPOINTS"

# GET /api/v1/api-keys
test_endpoint "GET" "/api-keys" "200"

# Note: We're already using an API key, so we can see its usage
# The API key ID would need to be known to test individual endpoints

# ========================================
# Summary
# ========================================
print_header "TEST SUMMARY"

echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
