
  🔐 Required Actions

  IMMEDIATE: Manual DNS Setup Required
  1. Log into GoDaddy
  2. Change nameservers for vislzr.com, veria.us, veria.cc to Cloudflare
  3. Run Cloudflare Terraform to get nameserver values

  Credentials Needed:
  # Provide these values when running Terraform:
  - Cloudflare: Email, API Token, Account ID
  - GCP: Project ID, Service Account JSON
  - Vercel: Team Name, API Token
  - Stripe: Test keys for now
  - Database: Neon URL for dev/staging
  - Monitoring: Sentry DSNs

  🚀 Next Steps

  1. Provide credentials listed above
  2. Update GoDaddy nameservers to Cloudflare
  3. Run Terraform for Cloudflare and GCP
  4. Set GitHub secrets in all repositories
  5. Deploy services via GitHub Actions

  The infrastructure is ready for deployment once credentials are provided. All
  services are configured for scale-to-zero in dev/staging to minimize costs.
