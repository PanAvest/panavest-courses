#!/bin/bash
set -euo pipefail

FILE="app/admin/page.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found. Run this from the repo root."
  exit 1
fi

echo "🔧 Patching Users action buttons (Reset PW + Delete)..."
# Add buttons after every 'Confirm Link' button (table + modal)
perl -0777 -pe 's/(Confirm Link<\/button>)/$1 <button onClick={()=>void generateResetLink(u\.email)} disabled={!u\.email} className="px-3 py-1\.5 rounded-lg ring-1 ring-\[color:var\(--color-light\)\] text-xs">Reset PW<\/button> <button onClick={()=>void act(u\.id,"delete")} disabled={userActionBusy === `delete:\${u\.id}`} className="px-3 py-1\.5 rounded-lg bg-red-700 text-white text-xs">Delete<\/button>/g' -i "$FILE"

# The modal uses selectedUser.* — add a second pass for that context too
perl -0777 -pe 's/(Confirm Link<\/button>)/$1 <button onClick={()=>void generateResetLink(selectedUser\.email)} disabled={!selectedUser\.email} className="px-3 py-1\.5 rounded-lg ring-1 ring-\[color:var\(--color-light\)\] text-sm disabled:opacity-50">Reset PW<\/button> <button onClick={()=>void act(selectedUser\.id,"delete")} disabled={userActionBusy === `delete:\${selectedUser\.id}`} className="px-3 py-1\.5 rounded-lg bg-red-700 text-white text-sm disabled:opacity-50">Delete<\/button>/g' -i "$FILE"

# Only add generateResetLink() if it doesn't exist
if ! grep -q "async function generateResetLink" "$FILE"; then
  echo "🧩 Inserting generateResetLink()..."
  perl -0777 -pe '
    s|/\* ---------------- Quick Prices ---------------- \*/|
/** Generate password reset link and copy to clipboard */
async function generateResetLink(email?: string) {
  if (!email) return;
  const r = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "generate_reset_link", email })
  });
  const d = await r.json();
  const link = (d && typeof d === "object") ? (d as Record<string, unknown>)["link"] : null;
  if (typeof link === "string") {
    await navigator.clipboard.writeText(link);
    alert("Reset link copied");
  } else {
    alert("Could not generate reset link");
  }
}

$&|s' -i "$FILE"
fi

echo "🛡️  Extending act() to support delete (with confirm)..."
# Add "delete" to the union type of act()
perl -0777 -pe 's/(async function act\(userId: string, endpoint: "ban" \| "unban" \| "revoke" \| "clear-history"\))/\1 \| "delete"/' -i "$FILE"

# Insert a confirm guard at the start of act() body for delete
perl -0777 -pe 's|(async function act\([^\)]*\)\s*\{)|$1\n  if (endpoint === "delete") { if (!confirm("Permanently delete user?")) return; }|s' -i "$FILE"

echo "✅ Patch applied. Committing…"
git add "$FILE" || true
git commit -m "Admin: add Reset Password + Delete user actions (UI) and reset-link helper" || true
git push origin main || true

echo "🎉 Done."
