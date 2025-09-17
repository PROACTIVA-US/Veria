# Blitzy Acceptance Checklist (Must Pass to Deploy)

- [ ] Build & push (linux/amd64) — success
- [ ] Cloud Run deploy **by digest**, **no unauthenticated**
- [ ] ID‑token smoke test passes (private‑only)
- [ ] **Policy simulation suite**: allow/deny/quotas/redaction — pass
- [ ] **Deny‑list drill**: freeze blocks in ≤1s; unfreeze requires dual‑control
- [ ] Deploy report includes: URL, digest, revision, traffic, **policy ruleset hash**, **deny‑list size**, **quota summary**
