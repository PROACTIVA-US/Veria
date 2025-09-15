# Blitzy Handoff Checklist

## Pre-Deploy Verification

- [ ] Confirm GitHub secrets are present:
  ```bash
  gh secret list
  # Should show: GCP_PROJECT_ID, GCP_SA_EMAIL, WORKLOAD_IDENTITY_PROVIDER
  ```

- [ ] Re-run OIDC smoketest workflow:
  ```bash
  gh workflow run oidc-smoketest.yml
  gh run list --workflow=oidc-smoketest.yml --limit=1
  ```

## Deployment

- [ ] Trigger CD (push to main or create tag):
  ```bash
  # Option 1: Push to main
  git push origin main

  # Option 2: Create release tag
  git tag -a v0.1.3 -m "Release description"
  git push origin v0.1.3
  ```

- [ ] Monitor CD workflow:
  ```bash
  gh run list --workflow=cd.yml --limit=1
  gh run watch <RUN_ID>
  ```

## Post-Deploy Verification

- [ ] Record deployment details:
  ```bash
  # Get image digest
  gcloud artifacts docker images list \
    --repository=veria \
    --location=us-central1 \
    --format='table(digest,tags)' \
    --limit=1

  # Get revision name
  gcloud run services describe ai-broker \
    --region=us-central1 \
    --format='value(status.latestReadyRevisionName)'

  # Get service URL
  gcloud run services describe ai-broker \
    --region=us-central1 \
    --format='value(status.url)'

  # Get traffic split
  gcloud run services describe ai-broker \
    --region=us-central1 \
    --format='yaml(status.traffic)'
  ```

- [ ] Confirm Cloud Logging shows runs for ai-broker:
  ```bash
  gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-broker" \
    --limit=10 \
    --format='table(timestamp,severity,textPayload)'
  ```

## Testing (if service is public)

- [ ] Test health endpoint:
  ```bash
  SERVICE_URL=$(gcloud run services describe ai-broker --region=us-central1 --format='value(status.url)')
  curl -sSf "$SERVICE_URL/health"
  ```

- [ ] Test API endpoint:
  ```bash
  curl -sSf -X POST "$SERVICE_URL/ai/graph/suggest" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"test","provider":"local"}'
  ```

## Rollback Plan

- [ ] If issues occur, rollback to previous revision:
  ```bash
  # List all revisions
  gcloud run revisions list \
    --service=ai-broker \
    --region=us-central1 \
    --format='table(name,traffic,createTime)'

  # Rollback (replace PREVIOUS_REVISION with actual name)
  gcloud run services update-traffic ai-broker \
    --region=us-central1 \
    --to-revisions=PREVIOUS_REVISION=100
  ```

## Success Criteria

- [ ] CD workflow completes successfully
- [ ] New Cloud Run revision is serving 100% traffic
- [ ] Health check returns 200 OK (if public)
- [ ] No errors in Cloud Logging
- [ ] Service responds to requests (if public)

## Notes

- All deployments use OIDC/WIF (no JSON keys)
- Images are deployed by digest only
- Service is private by default (requires authentication)
- To make public: Add allUsers with roles/run.invoker