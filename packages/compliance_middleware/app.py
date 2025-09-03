
from fastapi import FastAPI, Request, Response, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os, time

app = FastAPI(title="Compliance Middleware", version="0.1.0")

class Decision(BaseModel):
    allowed: bool
    reason: str
    risk_score: float
    redactions: list[str] = []

def lineage_meta(req: Request) -> dict:
    return {
        "ts": time.time(),
        "path": req.url.path,
        "method": req.method,
        "x_req_id": req.headers.get("x-request-id"),
        "jurisdiction": req.headers.get("x-jurisdiction", "US"),
        "asset": req.headers.get("x-asset", "UST"),
    }

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/decide")
async def decide(req: Request):
    meta = lineage_meta(req)
    # Placeholder policy: block if non-US jurisdiction for now (example), else allow.
    allowed = meta["jurisdiction"] in {"US", "EU", "SG"}
    risk = 0.2 if allowed else 0.9
    reason = "Allowed by default policy" if allowed else "Jurisdiction not in allowlist"
    return Decision(allowed=allowed, reason=reason, risk_score=risk)

@app.post("/audit")
async def audit(entry: dict, x_user: str | None = Header(default=None)):
    # Stub: Write to audit log (stdout for now), with basic redaction
    redactions = []
    if "ssn" in entry:
        entry["ssn"] = "***REDACTED***"
        redactions.append("ssn")
    print("[AUDIT]", {"user": x_user, "entry": entry})
    return {"ok": True, "redactions": redactions}
