output "service_url" {
  value       = google_cloud_run_v2_service.svc.uri
  description = "Default Cloud Run URL"
}
output "service_account_email" {
  value       = google_service_account.cr_sa.email
}
