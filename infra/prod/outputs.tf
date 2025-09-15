output "hello_url" {
  description = "Cloud Run URL for the hello service"
  value       = google_cloud_run_v2_service.hello.uri
}
output "health_url" {
  description = "Health endpoint"
  value       = "${google_cloud_run_v2_service.hello.uri}/_ah/health"
}
