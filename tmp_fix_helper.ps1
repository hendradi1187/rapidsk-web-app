$p = 'src/pages/TransferCenter.tsx'
$s = Get-Content -Raw $p
$helper = @'
// transfer attempt storage helpers
function readTransferAttemptMap(): Record<string, FailedTransferAttempt> {
  try {
    return JSON.parse(localStorage.getItem(TRANSFER_ATTEMPT_STORAGE_KEY) ?? '{}') as Record<string, FailedTransferAttempt>;
  } catch {
    return {};
  }
}
function writeTransferAttemptMap(value: Record<string, FailedTransferAttempt>) {
  localStorage.setItem(TRANSFER_ATTEMPT_STORAGE_KEY, JSON.stringify(value));
}
'@
$s = [regex]::Replace($s, '\r?\n// transfer attempt storage helpers[\s\S]*$', [Environment]::NewLine + $helper)
Set-Content -Path $p -Value $s -Encoding UTF8
Write-Output patched
