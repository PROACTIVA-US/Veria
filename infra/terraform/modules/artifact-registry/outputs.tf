# Artifact Registry Retention Policy Outputs
# This module exposes retention policy identifiers, configuration details, 
# and audit logging endpoints for monitoring integration and compliance systems.

# Map of repository names to their cleanup policy resource IDs
# Used by parent modules to reference specific retention policies
output "cleanup_policy_ids" {
  description = "Map of repository names to their cleanup policy resource identifiers"
  value = try({
    for repo_name, policy in google_artifact_registry_repository.repositories : 
    repo_name => policy.id
  }, {})
  sensitive = false
}

# Structured data exposing current retention policy settings
# Provides configuration details for monitoring and compliance reporting
output "retention_configuration" {
  description = "Current retention policy settings as structured data for compliance reporting"
  value = try({
    for repo_name, repo in google_artifact_registry_repository.repositories : 
    repo_name => {
      repository_id     = repo.repository_id
      location         = repo.location
      cleanup_policies = [
        for policy in repo.cleanup_policies : {
          id                    = policy.id
          action               = policy.action
          condition            = policy.condition
          most_recent_versions = try(policy.most_recent_versions, null)
          keep_tag_prefixes    = try(policy.keep_tag_prefixes, null)
          package_name_prefixes = try(policy.package_name_prefixes, null)
        }
      ]
      retention_days = try(var.retention_days, 30)
      dry_run_mode  = try(var.dry_run, false)
    }
  }, {})
  sensitive = false
}

# List of all repositories with applied retention policies
# Used for monitoring coverage and compliance validation
output "affected_repositories" {
  description = "List of all repositories with applied retention policies"
  value = try([
    for repo_name, repo in google_artifact_registry_repository.repositories : {
      name         = repo.repository_id
      location     = repo.location
      full_name    = "${repo.location}-docker.pkg.dev/${var.project_id}/${repo.repository_id}"
      policy_count = length(repo.cleanup_policies)
      format       = repo.format
    }
  ], [])
  sensitive = false
}

# Cloud Logging filter expression for policy execution events
# Enables monitoring systems to track policy execution and audit events
output "audit_log_filter" {
  description = "Cloud Logging filter expression for tracking retention policy execution events"
  value = try(join(" OR ", [
    for repo_name, repo in google_artifact_registry_repository.repositories :
    "resource.type=\"artifactregistry.googleapis.com/Repository\" AND protoPayload.resourceName=\"projects/${var.project_id}/locations/${repo.location}/repositories/${repo.repository_id}\""
  ]), "resource.type=\"artifactregistry.googleapis.com/Repository\"")
  sensitive = false
}

# Policy execution status showing dry_run vs enforced state
# Critical for compliance validation and operational monitoring
output "policy_execution_status" {
  description = "Policy execution status indicating dry_run vs enforced state for each repository"
  value = try({
    for repo_name, repo in google_artifact_registry_repository.repositories :
    repo_name => {
      repository_name = repo.repository_id
      dry_run_enabled = try(var.dry_run, false)
      enforcement_mode = try(var.dry_run, false) ? "DRY_RUN" : "ENFORCED"
      policy_active   = length(repo.cleanup_policies) > 0
      last_updated    = repo.update_time
    }
  }, {})
  sensitive = false
}

# Estimated next cleanup schedule based on policy configuration
# Provides operational teams with cleanup timing predictions
output "next_cleanup_schedule" {
  description = "Estimated next policy execution times for operational planning"
  value = try({
    for repo_name, repo in google_artifact_registry_repository.repositories :
    repo_name => {
      repository_name = repo.repository_id
      # Artifact Registry cleanup typically runs daily
      estimated_next_run = "Daily at approximately 00:00 UTC"
      cleanup_frequency = "24 hours"
      # Age-based policies execute when images exceed the age threshold
      age_based_cleanup = try(var.retention_days, 30) > 0 ? "${try(var.retention_days, 30)} days after image push" : "Not configured"
      # Version-based cleanup maintains specified number of versions
      version_based_cleanup = try(var.keep_versions, null) != null ? "Keep ${try(var.keep_versions, null)} most recent versions" : "Not configured"
    }
  }, {})
  sensitive = false
}

# Estimated storage savings from retention policy enforcement
# Helps with cost analysis and storage capacity planning
output "estimated_storage_savings" {
  description = "Calculated potential storage space freed by retention policies"
  value = try({
    for repo_name, repo in google_artifact_registry_repository.repositories :
    repo_name => {
      repository_name = repo.repository_id
      # Note: Actual savings depend on image sizes and repository usage patterns
      # These are estimates based on typical container registry patterns
      estimated_daily_cleanup = "Estimated based on repository activity patterns"
      cleanup_eligibility = try(var.retention_days, 30) > 0 ? "Images older than ${try(var.retention_days, 30)} days" : "Version-based cleanup only"
      savings_method = [
        try(var.retention_days, 30) > 0 ? "Age-based deletion (${try(var.retention_days, 30)} day retention)" : null,
        try(var.keep_versions, null) != null ? "Version-based cleanup (keep ${try(var.keep_versions, null)} versions)" : null
      ]
      # Monitoring recommendation for actual storage usage tracking
      monitoring_recommendation = "Monitor actual storage usage via Cloud Monitoring metrics"
    }
  }, {})
  sensitive = false
}

# Path to Cloud Audit Log entries for compliance evidence
# Provides compliance teams with audit trail locations
output "compliance_evidence_path" {
  description = "Cloud Audit Log entry paths for retention policy compliance evidence"
  value = try({
    log_name = "projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Fdata_access"
    filter_expression = "resource.type=\"artifactregistry.googleapis.com/Repository\" AND operation.id=\"artifactregistry.cleanup\""
    # Cloud Console link for audit log access
    console_link = "https://console.cloud.google.com/logs/query;query=resource.type%3D%22artifactregistry.googleapis.com%2FRepository%22%20AND%20operation.id%3D%22artifactregistry.cleanup%22;timeRange=PT1H;project=${var.project_id}"
    # BigQuery export table if configured
    bigquery_table = try(var.audit_log_bigquery_table, "Audit log BigQuery export not configured")
    # Retention period for audit logs
    audit_retention = "400 days (default Cloud Audit Logs retention)"
  }, {
    log_name = "Cloud Audit Logs not accessible"
    filter_expression = "Insufficient permissions or logs not enabled"
  })
  sensitive = false
}

# Timestamp of policy creation for change tracking
# Essential for audit trails and change management processes
output "policy_creation_timestamp" {
  description = "Timestamps of retention policy creation for audit and change tracking"
  value = try({
    for repo_name, repo in google_artifact_registry_repository.repositories :
    repo_name => {
      repository_created = repo.create_time
      repository_updated = repo.update_time
      # Terraform resource creation tracking
      terraform_apply_time = timestamp()
      # Policy effective date
      policy_effective_date = try(var.policy_start_date, timestamp())
      # Change tracking information
      managed_by = "Terraform Infrastructure as Code"
      module_version = try(var.module_version, "1.0.0")
    }
  }, {})
  sensitive = false
}