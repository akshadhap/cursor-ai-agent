#!/usr/bin/env node
// Usage: node sync-invites-entity.js <inviterUid> <entityId>
// This script fetches invites for the inviter from the Auth Invites API and
// attempts to set the corresponding Entity API employee status to ACTIVE.

const [,, inviterUid, entityId] = process.argv;
if (!inviterUid || !entityId) {
  console.error('Usage: node sync-invites-entity.js <inviterUid> <entityId>');
  process.exit(2);
}

const AUTH_INVITES_BASE = 'http://localhost:8080';
const ENTITY_API_BASE = 'https://qa-entity-api-api-809768562395.us-central1.run.app';

function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function main() {
  console.log('Inviter:', inviterUid);
  console.log('Entity:', entityId);

  try {
  const invitesRes = await fetchWithTimeout(`${AUTH_INVITES_BASE}/auth/invites/by-inviter?uid=${encodeURIComponent(inviterUid)}`, {}, 10000);
    if (!invitesRes.ok) {
      const txt = await invitesRes.text().catch(() => '');
      throw new Error(`Failed to fetch invites: ${invitesRes.status} ${txt}`);
    }

    const invites = await invitesRes.json();
    console.log(`Fetched ${Array.isArray(invites) ? invites.length : 0} invites`);

    const results = [];

    for (const inv of Array.isArray(invites) ? invites : []) {
      const inviteId = inv.inviteId ?? inv.invite_id;
      const invitedUid = inv.invitedUid ?? inv.invited_uid ?? null;
      const invitedEmail = inv.invitedEmail ?? inv.invited_email ?? null;
      const status = inv.status ?? null;
      const accepted = !!(inv.acceptedAt || inv.accepted_at || (typeof status === 'string' && ['active','SUCCESS','success'].includes(status)));

      if (!accepted) {
        results.push({ inviteId, skipped: true, reason: 'not accepted' });
        continue;
      }

      // Try by invitedUid first
      let updated = false;
      let lastError = null;

      if (invitedUid) {
        try {
          const putRes = await fetchWithTimeout(`${ENTITY_API_BASE}/v1/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(invitedUid)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' }),
          }, 10000);

          if (putRes.ok) {
            results.push({ inviteId, updated: true, by: 'invitedUid' });
            updated = true;
            continue;
          }

          lastError = `PUT by invitedUid returned ${putRes.status}`;
        } catch (e) {
          lastError = String(e);
        }
      }

      if (!updated && invitedEmail) {
        try {
          const listRes = await fetchWithTimeout(`${ENTITY_API_BASE}/v1/entities/${encodeURIComponent(entityId)}/employees`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          }, 10000);

          if (!listRes.ok) {
            const txt = await listRes.text().catch(() => '');
            results.push({ inviteId, updated: false, error: `list employees failed: ${listRes.status} ${txt}` });
            continue;
          }

          const employees = await listRes.json().catch(() => []);
          const match = (employees || []).find(e => (e.email || '').toLowerCase() === (invitedEmail || '').toLowerCase());

          if (!match) {
            results.push({ inviteId, updated: false, error: `no employee matched email ${invitedEmail}` });
            continue;
          }

          const employeeId = match.employeeId ?? match.employee_id ?? match.id ?? null;
          if (!employeeId) {
            results.push({ inviteId, updated: false, error: `matched employee has no id for email ${invitedEmail}` });
            continue;
          }

          const putRes2 = await fetchWithTimeout(`${ENTITY_API_BASE}/v1/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(employeeId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' }),
          }, 10000);

          if (!putRes2.ok) {
            const errText = await putRes2.text().catch(() => '');
            results.push({ inviteId, updated: false, error: `PUT by matched employeeId returned ${putRes2.status}: ${errText}` });
            continue;
          }

          results.push({ inviteId, updated: true, by: 'emailMatch', employeeId });
          continue;
        } catch (e) {
          results.push({ inviteId, updated: false, error: String(e) });
          continue;
        }
      }

      results.push({ inviteId, updated: false, error: lastError ?? 'no invitedUid or invitedEmail' });
    }

    console.log(JSON.stringify({ inviterUid, entityId, results }, null, 2));
    // also print a short summary
    const succeeded = results.filter(r => r.updated).length;
    console.log(`Succeeded updates: ${succeeded}/${results.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Node 18+ has global fetch; if not available, instruct user to run with node 18+
main();
