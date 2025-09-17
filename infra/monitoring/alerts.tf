# Terraform configuration for Cloud Monitoring alert policies
# Implements production-ready alerting with configurable thresholds and notification routing
# Part of Veria observability infrastructure (PR B)

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.37.0"
    }
  }
}

# Data source to get project information for alert policy configuration
data "google_project" "current" {}

# Local references to metrics created by metrics.tf
# These metrics are created by the metrics.tf file in the same directory
locals {
  # Metric names that will be created by metrics.tf
  error_rate_metric_name = "veria/ai-broker/error_rate"
  p95_latency_metric_name = "veria/ai-broker/p95_latency"
  request_count_metric_name = "veria/ai-broker/request_count"
  availability_metric_name = "veria/ai-broker/availability"
}

# Data sources for notification channels
# These channels should be configured in the GCP console or via separate Terraform configuration
data "google_monitoring_notification_channel" "email" {
  display_name = "Engineering Team Email"
  type        = "email"
  
  # If the notification channel doesn't exist, the alert will still be created
  # but notifications will not be sent until channels are configured
}

data "google_monitoring_notification_channel" "slack" {
  display_name = "Slack Alerts Channel"
  type        = "slack"
  
  # Optional - fallback to email if Slack is not configured
}

data "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty Incidents"
  type        = "pagerduty"
  
  # Optional - for critical escalations
}

# AI Broker Error Rate Alert Policy
# Triggers when HTTP 5xx error rate exceeds 2% over 5 minutes
# Priority: P2/High - Requires immediate investigation
resource "google_monitoring_alert_policy" "error_rate_alert" {
  display_name          = "AI Broker Error Rate Alert"
  documentation {
    content = <<-EOT
# AI Broker Error Rate Alert

## Description
This alert triggers when the AI Broker service error rate exceeds 2% over a 5-minute period. Error rates are calculated from HTTP 5xx responses extracted from Cloud Run request logs.

## Threshold
- **Metric**: `veria/ai-broker/error_rate`
- **Threshold**: > 2% (0.02)
- **Duration**: 5 minutes (300 seconds)
- **Comparison**: Greater than

## Severity
- **Priority**: P2 - High
- **Response SLA**: 15 minutes

## Runbook
1. **Immediate Actions**:
   - Check Cloud Run service health status
   - Review recent deployments for correlation
   - Examine Cloud Run logs for error patterns
   - Verify external dependencies (database, KYC providers)

2. **Investigation Steps**:
   - Query Cloud Monitoring for error distribution by endpoint
   - Check if errors are concentrated in specific revisions
   - Review application logs for exception details
   - Validate service account permissions and quotas

3. **Escalation**:
   - If error rate continues > 5%, escalate to P1 Critical
   - If unable to identify root cause within 30 minutes, escalate to senior engineer
   - If external dependency failure confirmed, engage vendor support

## Mitigation Options
- **Immediate**: Roll back to previous healthy revision if recent deployment
- **Service Recovery**: Restart service instances via Cloud Run console
- **Traffic Shaping**: Implement circuit breaker patterns for failing endpoints
- **External Dependencies**: Switch to backup KYC provider if available

## Monitoring Links
- [Cloud Run Service Dashboard](https://console.cloud.google.com/run/detail/us-central1/ai-broker)
- [Cloud Monitoring Metrics Explorer](https://console.cloud.google.com/monitoring/metrics-explorer)
- [Application Logs](https://console.cloud.google.com/logs/query)
    EOT
    mime_type = "text/markdown"
  }

  # Conditions define when the alert should trigger
  conditions {
    display_name = "Error Rate Threshold Exceeded"
    
    condition_threshold {
      # Filter to match the error rate metric
      filter = "resource.type=\"logging_metric\" AND metric.type=\"logging.googleapis.com/user/${local.error_rate_metric_name}\""
      
      # Aggregation configuration for error rate percentage
      aggregations {
        alignment_period     = "300s"  # 5-minute aggregation window
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields = [
          "resource.labels.service_name",
          "resource.labels.location"
        ]
      }
      
      # Threshold configuration
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 0.02  # 2% error rate threshold
      duration        = "300s"  # Must exceed threshold for 5 minutes
      
      # Trigger configuration
      trigger {
        count = 1  # Trigger on first threshold breach
      }
    }
  }

  # Alert policy configuration
  combiner              = "OR"  # Any condition can trigger the alert
  enabled              = true
  auto_close           = "86400s"  # Auto-close after 24 hours
  
  # Notification channels for alert routing
  notification_channels = compact([
    try(data.google_monitoring_notification_channel.email.name, null),
    try(data.google_monitoring_notification_channel.slack.name, null)
  ])

  # Alert policy labels for organization and filtering
  user_labels = {
    service_name    = "ai-broker"
    environment     = "production"
    severity        = "high"
    priority        = "p2"
    alert_type      = "performance"
    component       = "application"
    auto_generated  = "true"
    managed_by      = "terraform"
    runbook_url     = "https://github.com/PROACTIVA-US/Veria/wiki/Runbooks#error-rate-alerts"
  }

  # Alert policy metadata
  alert_strategy {
    # Rate limiting to prevent alert fatigue
    notification_rate_limit {
      period = "300s"  # Maximum one notification per 5 minutes
    }
    
    # Auto close configuration
    auto_close = "86400s"  # Auto-close after 24 hours of no violations
  }
}

# AI Broker P95 Latency Alert Policy  
# Triggers when P95 latency exceeds 2000ms over 10 minutes
# Priority: P3/Medium - Indicates performance degradation
resource "google_monitoring_alert_policy" "p95_latency_alert" {
  display_name          = "AI Broker P95 Latency Alert"
  documentation {
    content = <<-EOT
# AI Broker P95 Latency Alert

## Description
This alert triggers when the AI Broker service P95 latency exceeds 2000ms over a 10-minute period. Latency is calculated from Cloud Run request logs for successful requests (HTTP 2xx-4xx).

## Threshold
- **Metric**: `veria/ai-broker/p95_latency`
- **Threshold**: > 2000ms (2000 milliseconds)
- **Duration**: 10 minutes (600 seconds)
- **Comparison**: Greater than

## Severity
- **Priority**: P3 - Medium
- **Response SLA**: 4 hours

## Runbook
1. **Initial Assessment**:
   - Check current request volume and patterns
   - Review resource utilization (CPU, memory)
   - Verify auto-scaling behavior and instance counts
   - Check for any ongoing maintenance or deployments

2. **Performance Analysis**:
   - Examine latency distribution across endpoints
   - Identify slow database queries or external API calls
   - Check Cloud Run cold start frequency
   - Review caching effectiveness and hit rates

3. **Root Cause Investigation**:
   - Query application logs for slow operations
   - Check database connection pool utilization
   - Verify external service response times (KYC providers)
   - Review recent code changes for performance regressions

## Mitigation Strategies
- **Short-term**: Increase Cloud Run instance limits to reduce cold starts
- **Resource Scaling**: Adjust CPU/memory allocation based on utilization patterns
- **Database Optimization**: Optimize slow queries or increase connection limits
- **Caching**: Implement or improve caching for frequently accessed data
- **Circuit Breakers**: Add timeouts and circuit breakers for external API calls

## Performance Targets
- **SLA Target**: P95 latency < 1500ms under normal load
- **Degraded Performance**: P95 latency 1500-2000ms (monitoring only)
- **Alert Threshold**: P95 latency > 2000ms (requires investigation)
- **Critical Threshold**: P95 latency > 5000ms (escalate to P2)

## Monitoring Links
- [Cloud Run Metrics Dashboard](https://console.cloud.google.com/run/detail/us-central1/ai-broker)
- [Database Performance](https://console.cloud.google.com/sql/instances)
- [Latency Distribution Charts](https://console.cloud.google.com/monitoring/dashboards)
    EOT
    mime_type = "text/markdown"
  }

  # Alert conditions for P95 latency threshold
  conditions {
    display_name = "P95 Latency Threshold Exceeded"
    
    condition_threshold {
      # Filter to match the P95 latency metric
      filter = "resource.type=\"logging_metric\" AND metric.type=\"logging.googleapis.com/user/${local.p95_latency_metric_name}\""
      
      # Aggregation configuration for latency percentiles
      aggregations {
        alignment_period     = "600s"  # 10-minute aggregation window
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
        group_by_fields = [
          "resource.labels.service_name",
          "resource.labels.location"
        ]
      }
      
      # Threshold configuration
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 2000  # 2000ms P95 latency threshold
      duration        = "600s"  # Must exceed threshold for 10 minutes
      
      # Trigger configuration
      trigger {
        count = 1  # Trigger on first threshold breach
      }
    }
  }

  # Alert policy configuration
  combiner              = "OR"  # Any condition can trigger the alert
  enabled              = true
  auto_close           = "86400s"  # Auto-close after 24 hours
  
  # Notification channels for alert routing (email only for medium priority)
  notification_channels = compact([
    try(data.google_monitoring_notification_channel.email.name, null)
  ])

  # Alert policy labels for organization and filtering  
  user_labels = {
    service_name    = "ai-broker"
    environment     = "production"
    severity        = "medium"
    priority        = "p3"
    alert_type      = "performance"
    component       = "application"
    auto_generated  = "true"
    managed_by      = "terraform"
    runbook_url     = "https://github.com/PROACTIVA-US/Veria/wiki/Runbooks#latency-alerts"
  }

  # Alert policy metadata
  alert_strategy {
    # Rate limiting to prevent alert spam
    notification_rate_limit {
      period = "900s"  # Maximum one notification per 15 minutes for medium priority
    }
    
    # Auto close configuration
    auto_close = "86400s"  # Auto-close after 24 hours of no violations
  }
}

# Service Unavailable Alert Policy
# Triggers when health check availability drops below 99%
# Priority: P1/Critical - Indicates service outage
resource "google_monitoring_alert_policy" "availability_alert" {
  display_name          = "AI Broker Service Unavailable Alert"
  documentation {
    content = <<-EOT
# AI Broker Service Unavailable Alert

## Description
This alert triggers when the AI Broker service availability drops below 99% based on health check responses. This indicates a potential service outage or severe degradation.

## Threshold
- **Metric**: `veria/ai-broker/availability`
- **Threshold**: < 99% (0.99)
- **Duration**: 2 minutes (120 seconds)
- **Comparison**: Less than

## Severity
- **Priority**: P1 - Critical
- **Response SLA**: Immediate (5 minutes)

## Immediate Actions
1. **Check Service Status**: Verify Cloud Run service is running and healthy
2. **Check Recent Deployments**: Roll back if recent deployment correlation
3. **External Dependencies**: Verify database and external API availability
4. **Infrastructure**: Check GCP service status and quotas

## Escalation
- **Immediate**: Page on-call engineer
- **5 minutes**: Escalate to senior engineer if no response
- **15 minutes**: Escalate to engineering manager
- **30 minutes**: Engage incident commander

## Recovery Procedures
1. **Service Restart**: Restart Cloud Run service instances
2. **Rollback**: Deploy previous known-good revision
3. **Infrastructure**: Scale up resources or switch regions if needed
4. **Communication**: Update status page and notify stakeholders
    EOT
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "Service Availability Below Threshold"
    
    condition_threshold {
      filter = "resource.type=\"logging_metric\" AND metric.type=\"logging.googleapis.com/user/${local.availability_metric_name}\""
      
      aggregations {
        alignment_period     = "120s"  # 2-minute aggregation window
        per_series_aligner   = "ALIGN_RATE" 
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields = [
          "resource.labels.service_name",
          "resource.labels.location"
        ]
      }
      
      comparison      = "COMPARISON_LESS_THAN"
      threshold_value = 0.99  # 99% availability threshold
      duration        = "120s"  # Must be below threshold for 2 minutes
      
      trigger {
        count = 1
      }
    }
  }

  combiner              = "OR"
  enabled              = true
  auto_close           = "3600s"  # Auto-close after 1 hour for critical alerts
  
  # Critical alerts go to all notification channels including PagerDuty
  notification_channels = compact([
    try(data.google_monitoring_notification_channel.email.name, null),
    try(data.google_monitoring_notification_channel.slack.name, null),
    try(data.google_monitoring_notification_channel.pagerduty.name, null)
  ])

  user_labels = {
    service_name    = "ai-broker"
    environment     = "production" 
    severity        = "critical"
    priority        = "p1"
    alert_type      = "availability"
    component       = "infrastructure"
    auto_generated  = "true"
    managed_by      = "terraform"
    runbook_url     = "https://github.com/PROACTIVA-US/Veria/wiki/Runbooks#availability-alerts"
  }

  alert_strategy {
    notification_rate_limit {
      period = "60s"  # Critical alerts can notify every minute
    }
    auto_close = "3600s"  # Auto-close after 1 hour for critical issues
  }
}

# Request Volume Anomaly Alert Policy
# Triggers on sudden traffic spikes or drops that may indicate issues
# Priority: P4/Low - Informational monitoring
resource "google_monitoring_alert_policy" "request_volume_anomaly" {
  display_name          = "AI Broker Request Volume Anomaly"
  documentation {
    content = <<-EOT
# AI Broker Request Volume Anomaly Alert

## Description
This alert triggers when request volume deviates significantly from normal patterns. This can indicate traffic anomalies, DDoS attacks, or service issues.

## Threshold
- **Metric**: `veria/ai-broker/request_count`
- **Anomaly Detection**: Statistical deviation from baseline
- **Sensitivity**: Medium (filters minor fluctuations)

## Severity
- **Priority**: P4 - Low/Informational
- **Response SLA**: 24 hours

## Investigation Steps
1. **Traffic Analysis**: Review traffic patterns and sources
2. **Security Check**: Look for signs of abuse or attack
3. **Performance Impact**: Check if volume affects latency/errors
4. **Business Context**: Correlate with marketing campaigns or events

## Actions
- **High Traffic**: Verify auto-scaling is working properly
- **Low Traffic**: Check for routing or DNS issues
- **Suspicious Patterns**: Review logs for potential security threats
    EOT
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "Request Volume Anomaly Detected"
    
    condition_threshold {
      filter = "resource.type=\"logging_metric\" AND metric.type=\"logging.googleapis.com/user/${local.request_count_metric_name}\""
      
      aggregations {
        alignment_period     = "300s"  # 5-minute windows
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields = [
          "resource.labels.service_name"
        ]
      }
      
      # This will be configured based on historical data
      # For now, using a simple threshold approach
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 1000  # Requests per 5-minute window
      duration        = "300s"
      
      trigger {
        count = 1
      }
    }
  }

  combiner              = "OR"
  enabled              = false  # Disabled until baseline is established
  auto_close           = "86400s"
  
  # Informational alerts only go to email
  notification_channels = compact([
    try(data.google_monitoring_notification_channel.email.name, null)
  ])

  user_labels = {
    service_name    = "ai-broker"
    environment     = "production"
    severity        = "low"
    priority        = "p4"
    alert_type      = "anomaly"
    component       = "traffic"
    auto_generated  = "true"
    managed_by      = "terraform"
    runbook_url     = "https://github.com/PROACTIVA-US/Veria/wiki/Runbooks#volume-anomaly-alerts"
  }

  alert_strategy {
    notification_rate_limit {
      period = "3600s"  # Maximum one notification per hour for low priority
    }
    auto_close = "86400s"
  }
}

# Output alert policy names for dashboard and external reference
output "error_rate_alert_name" {
  description = "Full name of the error rate alert policy"
  value       = google_monitoring_alert_policy.error_rate_alert.name
}

output "p95_latency_alert_name" {
  description = "Full name of the P95 latency alert policy"  
  value       = google_monitoring_alert_policy.p95_latency_alert.name
}

output "availability_alert_name" {
  description = "Full name of the availability alert policy"
  value       = google_monitoring_alert_policy.availability_alert.name
}

output "request_volume_anomaly_alert_name" {
  description = "Full name of the request volume anomaly alert policy"
  value       = google_monitoring_alert_policy.request_volume_anomaly.name
}

# Local values for alert configuration management
locals {
  # Alert severity mapping for consistent labeling
  alert_severities = {
    critical = "p1"
    high     = "p2" 
    medium   = "p3"
    low      = "p4"
  }

  # SLA response times by priority
  response_slas = {
    p1 = "5 minutes"   # Critical - immediate response
    p2 = "15 minutes"  # High - rapid response  
    p3 = "4 hours"     # Medium - business hours response
    p4 = "24 hours"    # Low - informational
  }

  # Common alert labels applied to all policies
  common_alert_labels = {
    service_name   = "ai-broker"
    environment    = "production"
    auto_generated = "true"
    managed_by     = "terraform"
    project_id     = data.google_project.current.project_id
    region         = "us-central1"
  }

  # Alert thresholds matching metrics.tf configuration
  alert_thresholds = {
    error_rate_threshold     = 0.02    # 2% error rate
    p95_latency_threshold   = 2000     # 2000ms P95 latency  
    availability_threshold  = 0.99     # 99% availability
    high_volume_threshold   = 1000     # 1000 requests per 5-minute window
  }

  # Alert duration windows
  alert_durations = {
    error_rate_window    = "300s"   # 5-minute window for error rate
    p95_latency_window   = "600s"   # 10-minute window for P95 latency
    availability_window  = "120s"   # 2-minute window for availability  
    volume_anomaly_window = "300s"   # 5-minute window for volume anomalies
  }

  # Notification rate limits by priority
  rate_limits = {
    critical = "60s"    # Critical alerts every minute
    high     = "300s"   # High alerts every 5 minutes
    medium   = "900s"   # Medium alerts every 15 minutes  
    low      = "3600s"  # Low alerts every hour
  }

  # Auto-close durations by priority
  auto_close_durations = {
    critical = "3600s"   # Close critical alerts after 1 hour
    high     = "86400s"  # Close high alerts after 24 hours
    medium   = "86400s"  # Close medium alerts after 24 hours
    low      = "86400s"  # Close low alerts after 24 hours
  }
}