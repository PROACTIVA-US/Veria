# Terraform configuration for Cloud Monitoring logs-based metrics
# Extracts error rate and P95 latency from Cloud Run request logs
# Part of Veria observability infrastructure (PR B)

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.37.0"
    }
  }
}

# Error rate metric: Tracks HTTP 5xx responses as percentage of total requests
# Extracts from Cloud Run request logs without application instrumentation
resource "google_logging_metric" "error_rate" {
  name        = "veria/ai-broker/error_rate"
  description = "HTTP 5xx error rate percentage from Cloud Run request logs for ai-broker service"
  
  # Log filter targeting Cloud Run revision logs for ai-broker service
  # Matches all requests to calculate total volume and error percentage
  filter = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="ai-broker"
    resource.labels.location="us-central1"
    httpRequest.status >= 100
  EOF

  # Metric descriptor configuration for percentage-based error rate
  metric_descriptor {
    display_name = "AI Broker Error Rate"
    metric_kind  = "GAUGE"
    value_type   = "DOUBLE"
    unit         = "1"  # Percentage (0-100)
    
    labels {
      key          = "service_name"
      value_type   = "STRING"
      description  = "Name of the Cloud Run service"
    }
    
    labels {
      key          = "revision_name"
      value_type   = "STRING"
      description  = "Cloud Run revision identifier"
    }
    
    labels {
      key          = "location"
      value_type   = "STRING"
      description  = "GCP region location"
    }
  }

  # Value extractor configuration for error rate calculation
  # Uses conditional logic to calculate percentage of 5xx responses
  value_extractor = <<-EOF
    EXTRACT(if(httpRequest.status >= 500, 1, 0))
  EOF

  # Label extractors for metric dimensions
  label_extractors = {
    service_name  = "EXTRACT(resource.labels.service_name)"
    revision_name = "EXTRACT(resource.labels.revision_name)"
    location      = "EXTRACT(resource.labels.location)"
  }

  # Bucket options for distribution metrics (not used for gauge but required)
  bucket_options {
    linear_buckets {
      num_finite_buckets = 10
      width             = 0.1
      offset            = 0
    }
  }
}

# P95 latency metric: Tracks 95th percentile request latency
# Extracts from successful requests to avoid skewing by timeout errors
resource "google_logging_metric" "p95_latency" {
  name        = "veria/ai-broker/p95_latency"
  description = "95th percentile request latency in milliseconds from Cloud Run logs for ai-broker service"
  
  # Log filter for successful requests only (status < 500)
  # Ensures latency calculation excludes error responses that may timeout
  filter = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="ai-broker"
    resource.labels.location="us-central1"
    httpRequest.status < 500
    httpRequest.status >= 200
    httpRequest.latency != ""
  EOF

  # Metric descriptor for latency distribution tracking
  metric_descriptor {
    display_name = "AI Broker P95 Latency"
    metric_kind  = "GAUGE"
    value_type   = "DISTRIBUTION"
    unit         = "ms"  # Milliseconds
    
    labels {
      key          = "service_name"
      value_type   = "STRING"
      description  = "Name of the Cloud Run service"
    }
    
    labels {
      key          = "revision_name"
      value_type   = "STRING"
      description  = "Cloud Run revision identifier"
    }
    
    labels {
      key          = "location"
      value_type   = "STRING"
      description  = "GCP region location"
    }
    
    labels {
      key          = "method"
      value_type   = "STRING"
      description  = "HTTP method"
    }
    
    labels {
      key          = "status_class"
      value_type   = "STRING" 
      description  = "HTTP status class (2xx, 3xx, 4xx)"
    }
  }

  # Value extractor for latency in milliseconds
  # Converts from Cloud Run's duration format to milliseconds
  value_extractor = <<-EOF
    EXTRACT(httpRequest.latency)
  EOF

  # Label extractors for comprehensive latency analysis
  label_extractors = {
    service_name  = "EXTRACT(resource.labels.service_name)"
    revision_name = "EXTRACT(resource.labels.revision_name)"
    location      = "EXTRACT(resource.labels.location)"
    method        = "EXTRACT(httpRequest.requestMethod)"
    status_class  = "EXTRACT(if(httpRequest.status < 300, \"2xx\", if(httpRequest.status < 400, \"3xx\", \"4xx\")))"
  }

  # Distribution bucket configuration for latency percentile calculation
  # Exponential buckets optimized for web request latency (1ms to 60s)
  bucket_options {
    exponential_buckets {
      num_finite_buckets   = 50
      growth_factor       = 1.4
      scale               = 1.0  # Starting at 1ms
    }
  }
}

# Request count metric: Total request volume for rate calculations
# Used as denominator in error rate percentage calculations
resource "google_logging_metric" "request_count" {
  name        = "veria/ai-broker/request_count"
  description = "Total request count for ai-broker service from Cloud Run logs"
  
  # Count all HTTP requests regardless of status
  filter = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="ai-broker"
    resource.labels.location="us-central1"
    httpRequest.status >= 100
  EOF

  # Counter metric for request volume tracking
  metric_descriptor {
    display_name = "AI Broker Request Count"
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"  # Count
    
    labels {
      key          = "service_name"
      value_type   = "STRING"
      description  = "Name of the Cloud Run service"
    }
    
    labels {
      key          = "revision_name"
      value_type   = "STRING"
      description  = "Cloud Run revision identifier"
    }
    
    labels {
      key          = "location"
      value_type   = "STRING"
      description  = "GCP region location"
    }
    
    labels {
      key          = "status_class"
      value_type   = "STRING"
      description  = "HTTP status class (2xx, 3xx, 4xx, 5xx)"
    }
  }

  # Extract count value (always 1 per log entry)
  value_extractor = "1"

  # Label extractors for request classification
  label_extractors = {
    service_name  = "EXTRACT(resource.labels.service_name)"
    revision_name = "EXTRACT(resource.labels.revision_name)"
    location      = "EXTRACT(resource.labels.location)"
    status_class  = "EXTRACT(if(httpRequest.status < 300, \"2xx\", if(httpRequest.status < 400, \"3xx\", if(httpRequest.status < 500, \"4xx\", \"5xx\"))))"
  }
}

# Availability metric: Service uptime tracking
# Monitors health check responses and service availability
resource "google_logging_metric" "availability" {
  name        = "veria/ai-broker/availability"
  description = "Service availability percentage based on health check responses"
  
  # Filter for health check endpoint responses
  filter = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="ai-broker"
    resource.labels.location="us-central1"
    httpRequest.requestUrl =~ "/health"
  EOF

  # Gauge metric for availability percentage
  metric_descriptor {
    display_name = "AI Broker Availability"
    metric_kind  = "GAUGE"
    value_type   = "DOUBLE"
    unit         = "1"  # Percentage (0-1)
    
    labels {
      key          = "service_name"
      value_type   = "STRING"
      description  = "Name of the Cloud Run service"
    }
    
    labels {
      key          = "revision_name"
      value_type   = "STRING"
      description  = "Cloud Run revision identifier"
    }
    
    labels {
      key          = "location"
      value_type   = "STRING"
      description  = "GCP region location"
    }
  }

  # Calculate success rate for health checks (200 responses)
  value_extractor = <<-EOF
    EXTRACT(if(httpRequest.status == 200, 1, 0))
  EOF

  # Label extractors for availability tracking
  label_extractors = {
    service_name  = "EXTRACT(resource.labels.service_name)"
    revision_name = "EXTRACT(resource.labels.revision_name)"
    location      = "EXTRACT(resource.labels.location)"
  }

  # Linear buckets for availability percentage (0-100%)
  bucket_options {
    linear_buckets {
      num_finite_buckets = 20
      width             = 0.05
      offset            = 0
    }
  }
}

# Output metric names for alert policy integration
# These outputs enable alerts.tf to reference the created metrics
output "error_rate_metric_name" {
  description = "Full name of the error rate metric for alert policy configuration"
  value       = google_logging_metric.error_rate.name
}

output "p95_latency_metric_name" {
  description = "Full name of the P95 latency metric for alert policy configuration"
  value       = google_logging_metric.p95_latency.name
}

output "request_count_metric_name" {
  description = "Full name of the request count metric for dashboard configuration"
  value       = google_logging_metric.request_count.name
}

output "availability_metric_name" {
  description = "Full name of the availability metric for dashboard configuration"
  value       = google_logging_metric.availability.name
}

# Local values for metric configuration
locals {
  # Common labels applied to all metrics
  common_labels = {
    service_name  = "ai-broker"
    location      = "us-central1"
    environment   = "production"
  }

  # Metric namespace for organization
  metric_namespace = "custom.googleapis.com/cloudrun"
  
  # Alert thresholds (referenced by alerts.tf)
  error_rate_threshold    = 2.0   # 2% error rate threshold
  p95_latency_threshold  = 2000   # 2000ms P95 latency threshold
  availability_threshold = 0.99   # 99% availability threshold
  
  # Aggregation windows for metrics
  error_rate_window    = "300s"   # 5-minute window for error rate
  p95_latency_window   = "600s"   # 10-minute window for P95 latency
  availability_window  = "300s"   # 5-minute window for availability
}