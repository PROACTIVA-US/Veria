# Tax Reporting Automation PRD

## Overview
A tax engine that tracks tokenized asset gains/losses and generates tax-ready forms.

## Goals
- Automate tax reporting for tokenized assets.  
- Minimize CPA manual work.  
- Ensure IRS-compliant outputs (starting with US).  

## User Stories
- *As a CPA*, I want Veria to generate 8949/1099/K-1 forms automatically.  
- *As an SMB owner*, I want to know my tax liability in real time.  

## Inputs / Outputs
- **Inputs**: Transaction history, pricing feeds (oracle), tax jurisdiction rules.  
- **Outputs**: IRS-ready forms (8949, 1099, K-1), capital gains/loss reports.  

## Features
- Realized/unrealized gain tracking.  
- Short-term vs long-term gains classification.  
- Automatic form generation.  
- Jurisdiction-specific tax rules engine.  

## APIs / Data Models
- `GET /tax/liability` – current tax liability.  
- `POST /tax/forms/:type` – generate tax forms.  
- `GET /tax/history` – transaction tax history.  

## Success Criteria
- Correct tax classification of tokenized asset transactions.  
- Forms match manual CPA calculations.  
