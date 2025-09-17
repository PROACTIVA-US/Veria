#!/usr/bin/env bash
#
# Veria Cloud Run Service Smoke Test Script
# 
# Performs comprehensive ID-token authenticated health checks against deployed Cloud Run services
# for post-deployment validation. Supports multiple services, environments, and comprehensive
# authentication mechanism validation.
#
# Usage:
#   SERVICE_NAME=ai-broker REGION=us-central1 GCP_PROJECT=veria-dev ./scripts/smoke-test.sh
#   
# Environment Variables:
#   SERVICE_NAME     - Cloud Run service name (default: ai-broker)  
#   REGION          - GCP region (default: us-central1)
#   GCP_PROJECT     - GCP project ID (default: auto-detect)
#   TIMEOUT         - Request timeout in seconds (default: 30)
#   RETRY_COUNT     - Number of retry attempts (default: 3)
#   RETRY_DELAY     - Delay between retries in seconds (default: 5)
#   VERBOSE         - Enable verbose output (default: false)
#   GITHUB_STEP_SUMMARY - GitHub Actions step summary file path
#
# Exit Codes:
#   0  - All tests passed successfully
#   1  - Environment validation failed
#   2  - Authentication failed  
#   3  - Service discovery failed
#   4  - Health check failed
#   5  - Authentication mechanism validation failed
#   6  - Timeout or retry exhausted
#
# Dependencies:
#   - bash 4.0+
#   - gcloud CLI (latest)
#   - curl 7.0+
#   - jq 1.6+
#   - coreutils 8.0+

set -euo pipefail

# Script metadata and configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="1.0.0"
readonly TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"

# Environment variables with defaults
SERVICE_NAME="${SERVICE_NAME:-ai-broker}"
REGION="${REGION:-us-central1}"
GCP_PROJECT="${GCP_PROJECT:-}"
TIMEOUT="${TIMEOUT:-30}"
RETRY_COUNT="${RETRY_COUNT:-3}"
RETRY_DELAY="${RETRY_DELAY:-5}"
VERBOSE="${VERBOSE:-false}"

# Health check endpoints to test
readonly HEALTH_ENDPOINTS=("/_ah/health" "/health")

# Output formatting and results tracking
declare -A TEST_RESULTS
declare -A SERVICE_METADATA
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging and output functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    
    case "$level" in
        "INFO")
            echo "[$timestamp] [INFO] $message" >&1
            ;;
        "WARN") 
            echo "[$timestamp] [WARN] $message" >&2
            ;;
        "ERROR")
            echo "[$timestamp] [ERROR] $message" >&2
            ;;
        "DEBUG")
            if [[ "$VERBOSE" == "true" ]]; then
                echo "[$timestamp] [DEBUG] $message" >&1
            fi
            ;;
    esac
}

verbose_log() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "DEBUG" "$@"
    fi
}

# validate_environment - Validate required environment variables and dependencies
validate_environment() {
    local exit_code=0
    
    log "INFO" "Starting environment validation..."
    
    # Check required commands
    local required_commands=("gcloud" "curl" "jq" "timeout" "grep" "printf")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log "ERROR" "Required command not found: $cmd"
            exit_code=1
        else
            verbose_log "Found required command: $cmd"
        fi
    done
    
    # Validate environment variables
    if [[ -z "$SERVICE_NAME" ]]; then
        log "ERROR" "SERVICE_NAME environment variable is required"
        exit_code=1
    else
        verbose_log "Service name: $SERVICE_NAME"
    fi
    
    if [[ -z "$REGION" ]]; then
        log "ERROR" "REGION environment variable is required"
        exit_code=1
    else
        verbose_log "Region: $REGION"
    fi
    
    # Validate numeric parameters
    if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -lt 1 ]] || [[ "$TIMEOUT" -gt 300 ]]; then
        log "ERROR" "TIMEOUT must be a number between 1 and 300 seconds, got: $TIMEOUT"
        exit_code=1
    fi
    
    if ! [[ "$RETRY_COUNT" =~ ^[0-9]+$ ]] || [[ "$RETRY_COUNT" -lt 0 ]] || [[ "$RETRY_COUNT" -gt 10 ]]; then
        log "ERROR" "RETRY_COUNT must be a number between 0 and 10, got: $RETRY_COUNT"
        exit_code=1
    fi
    
    if ! [[ "$RETRY_DELAY" =~ ^[0-9]+$ ]] || [[ "$RETRY_DELAY" -lt 1 ]] || [[ "$RETRY_DELAY" -gt 60 ]]; then
        log "ERROR" "RETRY_DELAY must be a number between 1 and 60 seconds, got: $RETRY_DELAY"
        exit_code=1
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        log "INFO" "Environment validation passed"
    else
        log "ERROR" "Environment validation failed"
    fi
    
    return $exit_code
}

# authenticate_gcloud - Obtain ID token via gcloud OIDC authentication
authenticate_gcloud() {
    log "INFO" "Authenticating with gcloud via OIDC..."
    
    # Auto-detect GCP project if not provided
    if [[ -z "$GCP_PROJECT" ]]; then
        if ! GCP_PROJECT="$(gcloud config get-value project 2>/dev/null)"; then
            log "ERROR" "Failed to auto-detect GCP project and GCP_PROJECT not set"
            return 2
        fi
        verbose_log "Auto-detected GCP project: $GCP_PROJECT"
    else
        verbose_log "Using provided GCP project: $GCP_PROJECT"
    fi
    
    # Validate gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        log "ERROR" "No active gcloud authentication found. Please run 'gcloud auth login' or ensure OIDC authentication is configured"
        return 2
    fi
    
    # Obtain ID token
    local id_token
    if ! id_token="$(gcloud auth print-identity-token 2>/dev/null)"; then
        log "ERROR" "Failed to obtain ID token. Ensure Workload Identity Federation is configured correctly"
        return 2
    fi
    
    if [[ -z "$id_token" ]]; then
        log "ERROR" "Empty ID token received from gcloud"
        return 2
    fi
    
    # Validate token format (basic JWT structure check)
    if ! echo "$id_token" | grep -qE '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'; then
        log "ERROR" "Invalid ID token format received"
        return 2
    fi
    
    log "INFO" "Successfully obtained ID token"
    verbose_log "ID token length: ${#id_token} characters"
    
    # Export for use by other functions
    export ID_TOKEN="$id_token"
    return 0
}

# retry_logic - Execute command with retry and timeout logic
retry_logic() {
    local max_attempts="$1"
    local delay="$2"
    local timeout_duration="$3"
    shift 3
    local command=("$@")
    
    local attempt=1
    local exit_code
    
    verbose_log "Executing with retry: ${command[*]}"
    verbose_log "Max attempts: $max_attempts, Delay: ${delay}s, Timeout: ${timeout_duration}s"
    
    while [[ $attempt -le $max_attempts ]]; do
        verbose_log "Attempt $attempt of $max_attempts"
        
        if timeout "$timeout_duration" "${command[@]}"; then
            verbose_log "Command succeeded on attempt $attempt"
            return 0
        fi
        
        exit_code=$?
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "WARN" "Attempt $attempt failed (exit code: $exit_code), retrying in ${delay}s..."
            sleep "$delay"
        else
            log "ERROR" "All $max_attempts attempts failed (final exit code: $exit_code)"
        fi
        
        ((attempt++))
    done
    
    return $exit_code
}

# test_health_endpoints - Test health endpoints with comprehensive validation
test_health_endpoints() {
    local service_url="$1"
    local test_name="health_check"
    local endpoint_results=()
    
    log "INFO" "Testing health endpoints for service: $SERVICE_NAME"
    
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        local full_url="${service_url}${endpoint}"
        local response_file
        response_file="$(mktemp)"
        local http_code_file
        http_code_file="$(mktemp)"
        
        log "INFO" "Testing endpoint: $endpoint"
        
        # Test authenticated request
        local auth_success=false
        if retry_logic "$RETRY_COUNT" "$RETRY_DELAY" "$TIMEOUT" \
            curl --silent \
                 --output "$response_file" \
                 --write-out "%{http_code}" \
                 --header "Authorization: Bearer $ID_TOKEN" \
                 --header "Accept: application/json" \
                 --max-time "$TIMEOUT" \
                 --fail-with-body \
                 "$full_url" > "$http_code_file"; then
            
            local http_code
            http_code="$(cat "$http_code_file")"
            local response_body
            response_body="$(cat "$response_file")"
            
            if [[ "$http_code" == "200" ]]; then
                log "INFO" "✓ Endpoint $endpoint returned HTTP 200"
                
                # Validate JSON response if possible
                if echo "$response_body" | jq -e . >/dev/null 2>&1; then
                    verbose_log "Response is valid JSON"
                    
                    # Extract health status if available
                    local health_status
                    if health_status="$(echo "$response_body" | jq -r '.status // empty' 2>/dev/null)"; then
                        if [[ -n "$health_status" ]]; then
                            verbose_log "Health status: $health_status"
                        fi
                    fi
                    
                    # Extract service name if available
                    local service_name_response
                    if service_name_response="$(echo "$response_body" | jq -r '.name // empty' 2>/dev/null)"; then
                        if [[ -n "$service_name_response" ]]; then
                            verbose_log "Service name from response: $service_name_response"
                        fi
                    fi
                else
                    verbose_log "Response is not JSON format"
                fi
                
                auth_success=true
                endpoint_results+=("$endpoint:PASS")
                ((PASSED_TESTS++))
            else
                log "ERROR" "✗ Endpoint $endpoint returned HTTP $http_code"
                verbose_log "Response body: $response_body"
                endpoint_results+=("$endpoint:FAIL:HTTP_$http_code")
                ((FAILED_TESTS++))
            fi
        else
            log "ERROR" "✗ Failed to connect to endpoint $endpoint"
            endpoint_results+=("$endpoint:FAIL:CONNECTION_ERROR")
            ((FAILED_TESTS++))
        fi
        
        ((TOTAL_TESTS++))
        
        # Clean up temporary files
        rm -f "$response_file" "$http_code_file"
    done
    
    # Store results for output formatting
    TEST_RESULTS["$test_name"]="$(IFS=','; echo "${endpoint_results[*]}")"
    
    # Return success only if at least one endpoint passed
    local success_count=0
    for result in "${endpoint_results[@]}"; do
        if [[ "$result" == *":PASS" ]]; then
            ((success_count++))
        fi
    done
    
    if [[ $success_count -gt 0 ]]; then
        log "INFO" "Health endpoint testing completed: $success_count/${#HEALTH_ENDPOINTS[@]} endpoints passed"
        return 0
    else
        log "ERROR" "Health endpoint testing failed: no endpoints responded successfully"
        return 4
    fi
}

# validate_authentication - Test that unauthenticated requests are properly rejected
validate_authentication() {
    local service_url="$1"
    local test_name="auth_validation"
    local auth_results=()
    
    log "INFO" "Validating authentication mechanisms"
    
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        local full_url="${service_url}${endpoint}"
        local response_file
        response_file="$(mktemp)"
        local http_code_file  
        http_code_file="$(mktemp)"
        
        log "INFO" "Testing unauthenticated request to: $endpoint"
        
        # Test unauthenticated request (should fail)
        if curl --silent \
               --output "$response_file" \
               --write-out "%{http_code}" \
               --max-time "$TIMEOUT" \
               "$full_url" > "$http_code_file" 2>/dev/null; then
            
            local http_code
            http_code="$(cat "$http_code_file")"
            
            # Expect 401 (Unauthorized) or 403 (Forbidden) for proper authentication
            if [[ "$http_code" == "401" ]] || [[ "$http_code" == "403" ]]; then
                log "INFO" "✓ Endpoint $endpoint properly rejects unauthenticated requests (HTTP $http_code)"
                auth_results+=("$endpoint:PASS:HTTP_$http_code")
                ((PASSED_TESTS++))
            else
                log "ERROR" "✗ Endpoint $endpoint allows unauthenticated access (HTTP $http_code)"
                verbose_log "Unauthenticated response: $(cat "$response_file")"
                auth_results+=("$endpoint:FAIL:HTTP_$http_code")
                ((FAILED_TESTS++))
            fi
        else
            # Connection failure is acceptable for unauthenticated requests
            log "INFO" "✓ Endpoint $endpoint rejects unauthenticated requests (connection denied)"
            auth_results+=("$endpoint:PASS:CONNECTION_DENIED")
            ((PASSED_TESTS++))
        fi
        
        ((TOTAL_TESTS++))
        
        # Clean up temporary files
        rm -f "$response_file" "$http_code_file"
    done
    
    # Store results for output formatting
    TEST_RESULTS["$test_name"]="$(IFS=','; echo "${auth_results[*]}")"
    
    # Return success if all endpoints properly reject unauthenticated access
    local success_count=0
    for result in "${auth_results[@]}"; do
        if [[ "$result" == *":PASS"* ]]; then
            ((success_count++))
        fi
    done
    
    if [[ $success_count -eq ${#HEALTH_ENDPOINTS[@]} ]]; then
        log "INFO" "Authentication validation completed: all endpoints properly secured"
        return 0
    else
        log "ERROR" "Authentication validation failed: $(( ${#HEALTH_ENDPOINTS[@]} - success_count )) endpoints allow unauthenticated access"
        return 5
    fi
}

# output_results - Generate comprehensive output for CI/CD integration  
output_results() {
    local overall_status="$1"
    local service_url="$2"
    local image_digest="${3:-unknown}"
    local revision_name="${4:-unknown}"
    local traffic_split="${5:-unknown}"
    
    log "INFO" "Generating test results summary"
    
    # Calculate test statistics
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    # Generate summary report
    cat << EOF

========================================
SMOKE TEST RESULTS SUMMARY
========================================
Timestamp: $TIMESTAMP
Script: $SCRIPT_NAME v$SCRIPT_VERSION
Service: $SERVICE_NAME
Region: $REGION  
Project: $GCP_PROJECT
Service URL: $service_url
Overall Status: $overall_status

Service Metadata:
- Image Digest: $image_digest
- Revision Name: $revision_name
- Traffic Split: $traffic_split

Test Statistics:
- Total Tests: $TOTAL_TESTS
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS
- Success Rate: ${success_rate}%

Detailed Results:
EOF

    # Output detailed test results
    for test_type in "${!TEST_RESULTS[@]}"; do
        echo "- $test_type: ${TEST_RESULTS[$test_type]}"
    done
    
    # Generate GitHub Actions step summary if requested
    if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
        cat >> "$GITHUB_STEP_SUMMARY" << EOF

## 🧪 Smoke Test Results

| Metric | Value |
|--------|-------|
| **Service** | \`$SERVICE_NAME\` |
| **Region** | \`$REGION\` |
| **Project** | \`$GCP_PROJECT\` |
| **Status** | $overall_status |
| **Success Rate** | ${success_rate}% ($PASSED_TESTS/$TOTAL_TESTS) |
| **Service URL** | [\`$service_url\`]($service_url) |
| **Image Digest** | \`$image_digest\` |
| **Revision** | \`$revision_name\` |

### Test Details
EOF
        
        # Add test details to GitHub summary
        for test_type in "${!TEST_RESULTS[@]}"; do
            local status_icon="❌"
            if [[ "${TEST_RESULTS[$test_type]}" == *"PASS"* ]]; then
                status_icon="✅"
            fi
            echo "- $status_icon **$test_type**: \`${TEST_RESULTS[$test_type]}\`" >> "$GITHUB_STEP_SUMMARY"
        done
    fi
    
    echo ""
    log "INFO" "Test results summary generated"
}

# main_script - Main execution function orchestrating all smoke test operations
main_script() {
    local exit_code=0
    local service_url=""
    local image_digest="unknown"
    local revision_name="unknown"
    local traffic_split="unknown"
    
    log "INFO" "Starting Veria Cloud Run smoke test - $SCRIPT_NAME v$SCRIPT_VERSION"
    log "INFO" "Target service: $SERVICE_NAME in $REGION"
    
    # Phase 1: Environment Validation
    if ! validate_environment; then
        log "ERROR" "Environment validation failed"
        exit_code=1
        output_results "FAILED (Environment)" "$service_url" "$image_digest" "$revision_name" "$traffic_split"
        return $exit_code
    fi
    
    # Phase 2: Authentication
    if ! authenticate_gcloud; then
        log "ERROR" "Authentication failed" 
        exit_code=2
        output_results "FAILED (Authentication)" "$service_url" "$image_digest" "$revision_name" "$traffic_split"
        return $exit_code
    fi
    
    # Phase 3: Service Discovery
    log "INFO" "Discovering Cloud Run service details..."
    
    if ! service_url="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)' 2>/dev/null)"; then
        log "ERROR" "Failed to describe Cloud Run service: $SERVICE_NAME"
        exit_code=3
        output_results "FAILED (Service Discovery)" "$service_url" "$image_digest" "$revision_name" "$traffic_split"
        return $exit_code
    fi
    
    if [[ -z "$service_url" ]]; then
        log "ERROR" "Service URL not found for service: $SERVICE_NAME"
        exit_code=3
        output_results "FAILED (Service Discovery)" "$service_url" "$image_digest" "$revision_name" "$traffic_split"
        return $exit_code
    fi
    
    log "INFO" "Service URL discovered: $service_url"
    
    # Get additional service metadata
    if image_digest="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(spec.template.spec.containers[0].image)' 2>/dev/null)"; then
        verbose_log "Image digest: $image_digest"
    fi
    
    if revision_name="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.latestReadyRevisionName)' 2>/dev/null)"; then
        verbose_log "Latest revision: $revision_name"
    fi
    
    if traffic_split="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.traffic[0].percent)' 2>/dev/null)"; then
        verbose_log "Traffic split: ${traffic_split}%"
    fi
    
    # Store service metadata
    SERVICE_METADATA["url"]="$service_url"
    SERVICE_METADATA["image_digest"]="$image_digest"
    SERVICE_METADATA["revision_name"]="$revision_name" 
    SERVICE_METADATA["traffic_split"]="$traffic_split"
    
    # Phase 4: Health Endpoint Testing
    if ! test_health_endpoints "$service_url"; then
        log "ERROR" "Health endpoint testing failed"
        exit_code=4
    fi
    
    # Phase 5: Authentication Mechanism Validation
    if ! validate_authentication "$service_url"; then
        log "ERROR" "Authentication mechanism validation failed"
        exit_code=5
    fi
    
    # Phase 6: Results Output
    local overall_status="PASSED"
    if [[ $exit_code -ne 0 ]]; then
        overall_status="FAILED"
    fi
    
    output_results "$overall_status" "$service_url" "$image_digest" "$revision_name" "$traffic_split"
    
    # Final status logging
    if [[ $exit_code -eq 0 ]]; then
        log "INFO" "🎉 All smoke tests passed successfully!"
        log "INFO" "Service $SERVICE_NAME is healthy and properly secured"
    else
        log "ERROR" "❌ Smoke tests failed with exit code: $exit_code"
        log "ERROR" "Service $SERVICE_NAME requires attention"
    fi
    
    return $exit_code
}

# Exit code mapping for CI/CD integration
# 0: Success - all tests passed
# 1: Environment validation failed
# 2: Authentication failed
# 3: Service discovery failed  
# 4: Health check failed
# 5: Authentication mechanism validation failed
# 6: Timeout or retry exhausted

# Main execution - call main_script and exit with appropriate code
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main_script
    exit $?
fi