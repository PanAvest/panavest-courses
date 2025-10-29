#!/bin/bash

FILE="app/admin/page.tsx"

# === Add Reset Password and Delete User buttons inside Users table ===
gsed -i "/Confirm Link/ a \
<button onClick={()=>void generateResetLink(u.email)} disabled={!u.email} className=\"px-3 py-1.5 rounded-lg ring-1 ring-[color:var(--color-light)] text-xs\">Reset PW</button> \
<button onClick={()=>void act(u.id,\"delete\")} disabled={userActionBusy===\`delete:\${u.id}\`} className=\"px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs\">Delete</button>" "$FILE"

# === Add generateResetLink() method ===
gsed -i "/async function generateConfirmLink/a \
async function generateResetLink(email?:string){ if(!email)return; const r = await fetch('/api/admin/users', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'generate_reset_link', email }) }); const d = await r.json(); const link = d?.link; if(link){ await navigator.clipboard.writeText(link); alert('Reset link copied'); } else alert('Could not generate link'); }" "$FILE"

# === Add Delete User action ===
gsed -i "/async function act/a \
if(endpoint==='delete'){ if(!confirm('Permanently delete user?')) return; }" "$FILE"

# === Add Final Exam section placeholder below Chapter Quiz ===
gsed -i "/Section title=\"Chapter Quiz\"/a \
<Section title=\"Final Exam (Course-wide)\"> \
<div className=\"text-sm text-muted\">Final Exam builder coming here ✅</div> \
</Section>" "$FILE"

