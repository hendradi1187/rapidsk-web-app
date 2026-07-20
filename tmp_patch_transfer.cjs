const fs = require('fs');
const p = 'src/pages/TransferCenter.tsx';
let s = fs.readFileSync(p, 'utf8');
const helperBlock = `// transfer attempt storage helpers\nfunction readTransferAttemptMap(): Record<string, FailedTransferAttempt> {\n  try {\n    return JSON.parse(localStorage.getItem(TRANSFER_ATTEMPT_STORAGE_KEY) ?? \"{}\") as Record<string, FailedTransferAttempt>;\n  } catch {\n    return {};\n  }\n}\nfunction writeTransferAttemptMap(value: Record<string, FailedTransferAttempt>) {\n  localStorage.setItem(TRANSFER_ATTEMPT_STORAGE_KEY, JSON.stringify(value));\n}`;
s = s.replace(/\r?\n\/\/ transfer attempt storage helpers[\s\S]*$/, '\n' + helperBlock + '\n');
