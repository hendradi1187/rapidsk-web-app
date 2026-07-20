$p = 'src/pages/TransferCenter.tsx'
$s = Get-Content -Raw $p
$helper = @'
// transfer attempt storage helpers
function readTransferAttemptMap(): Record<string, FailedTransferAttempt> {
  try {
    return JSON.parse(localStorage.getItem(TRANSFER_ATTEMPT_STORAGE_KEY) ?? \"{}\") as Record<string, FailedTransferAttempt>;
  } catch {
    return {};
  }
}
function writeTransferAttemptMap(value: Record<string, FailedTransferAttempt>) {
  localStorage.setItem(TRANSFER_ATTEMPT_STORAGE_KEY, JSON.stringify(value));
}
'@
$s = [regex]::Replace($s, '\r?\n// transfer attempt storage helpers[\s\S]*$', \"`r`n$helper\")
$needle = @'
  const ensureAgreementReady = async (contract: { id: string }, forceCreate = false) => {
    if (!domainId) throw new Error(\"Domain belum aktif.\");
    const freshAgreements = await agreementsApi.list(domainId);
    let agreement = forceCreate ? null : pickBestAgreement(contract.id, freshAgreements);
    if (!agreement) {
      agreement = await agreementsApi.create(domainId, {
        contract_id: contract.id,
        effective_from: new Date().toISOString(),
        effective_to: new Date(Date.now() + 5 * 365 * 86400000).toISOString(),
      });
    }
    if (String(agreement.status).toUpperCase() !== \"ACTIVE\") {
      agreement = await agreementsApi.updateStatus(domainId, { id: agreement.id, contract_id: contract.id }, \"ACTIVE\");
    }
    return agreement;
  };
