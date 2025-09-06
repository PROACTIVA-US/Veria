# Policy-as-Code Schema (v0.1)

```yaml
version: 0.1
metadata:
  name: "US T-Bill Access"
  jurisdiction: ["US"]
  applies_to: ["subscription", "transfer"]
requirements:
  kyc: tier2
  sanctions: none
  accreditation:
    required: true
    accepted_proofs: ["letter_cpa", "bank_balance", "income_docs"]
transfer_controls:
  hold_period_days: 30
  allowed_jurisdictions: ["US", "CA", "UK", "SG", "EU"]
  disallowed_entities: ["OFAC"]
limits:
  per_investor_usd_daily: 500000
  per_investor_usd_total: 1000000
```
