export function isInvestorPortalEnabled(): boolean {
  return process.env.FEATURE_INVESTOR_PORTAL === 'true' ||
         process.env.NEXT_PUBLIC_FEATURE_INVESTOR_PORTAL === 'true';
}