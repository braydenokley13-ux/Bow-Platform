/*******************************************************
 * BOW Sports Capital — Platform Core v3 (Stabilized)
 * Claim + Gauntlet + Pass + Verification hardening
 * Timezone: America/New_York
 *******************************************************/

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ADMIN_EMAILS = [
  'braydenokley13@gmail.com',
  'bowsportscapitalpodcast@outlook.com'
];
const SENDER_FALLBACK_NAME = 'BOW Sports Capital';
const OUTLOOK_ALIAS = 'bowsportscapitalpodcast@outlook.com';
const SUBJECT_PREFIX = 'BOW';

const FINISH_TAB = 'Bow Finish Form';
const STORE_TAB = 'XP Store';
const TZ = 'America/New_York';

const FINISH_FORM_ID = 'hkI3FbkUFoSRlznHRwt7fjp9FnxaGY4sxYmIHOjOc8Q';
const STORE_FORM_ID = '1Yi-jrfJaJKMCtVdqMDo-HkoDOFeeehjNYsoc4gxyXVU';

const PASS_TEMPLATE_SLIDES_ID = '1PSwiRbaqHtMDkkbgUeCrJdcXJIb-AguhNA2Ji4TaqUQ';

const GAUNTLET_TIER_RANK = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3
};

const GAUNTLET_XP_BY_LEVEL = {
  1: { BRONZE: 50, SILVER: 75, GOLD: 100 },
  2: { BRONZE: 60, SILVER: 100, GOLD: 150 },
  3: { BRONZE: 75, SILVER: 125, GOLD: 200 }
};

const SHEET_SCHEMAS = {
  Claim_Codes: [
    'code',
    'track',
    'module',
    'lesson',
    'issued_to_email',
    'issued_eligible',
    'is_used',
    'theme',
    'xp',
    'completion_type',
    'tier',
    'email',
    'created_at'
  ],
  Catalog: [
    'track',
    'module_id',
    'lesson_id',
    'lesson_title',
    'xp_value',
    'next_lesson_id',
    'activity_url'
  ],
  XP_Ledger: [
    'ts',
    'email',
    'name',
    'track',
    'outcome',
    'action',
    'module',
    'lesson',
    'points',
    'note',
    'key',
    'ref_code',
    'tier',
    'delta_reason',
    'source'
  ],
  Users: [
    'email',
    'display_name',
    'xp',
    'level',
    'streak_days',
    'last_active',
    'user_id',
    'modules_completed_101',
    'track_101_complete',
    'pass_101',
    'pass_id_101',
    'pass_last_emailed_101',
    'modules_completed_201',
    'track_201_complete',
    'pass_201',
    'pass_id_201',
    'pass_last_emailed_201',
    'level_title',
    'bfc'
  ],
  Level_Titles: ['level', 'xp_required', 'title'],
  Achievements: ['email', 'badge_id', 'awarded_at'],
  Badges: ['badge_id', 'name', 'description', 'icon_url', 'category'],
  Templates: ['template_id', 'subject', 'html', 'enabled'],
  Credentials: [
    'pass_id',
    'email',
    'display_name',
    'track',
    'level',
    'issued_at',
    'status',
    'source'
  ],
  Leaderboard_All: ['rank', 'display_name', 'total_xp', 'level', 'streak'],
  Leaderboard_101: ['rank', 'display_name', 'total_xp', 'level', 'streak'],
  Leaderboard_201: ['rank', 'display_name', 'total_xp', 'level', 'streak'],
  Leaderboard_301: ['rank', 'display_name', 'total_xp', 'level', 'streak'],
  Store_Catalog: [
    'item_id',
    'name',
    'description',
    'category',
    'price_bfc',
    'gives_badge',
    'gives_title',
    'content_link',
    'preview_image',
    'enabled'
  ],
  Inventory: ['email', 'item_id', 'name', 'category', 'acquired_at', 'source', 'notes'],
  Special_Titles: [
    'email',
    'title_id',
    'title_name',
    'title_type',
    'rarity',
    'awarded_at',
    'source',
    'notes'
  ],
  Ops_Log: ['ts', 'event', 'details_json']
};

const HEADER_ALIASES = {
  email: ['email', 'email_address'],
  module: ['module', 'module_id'],
  lesson: ['lesson', 'lesson_id'],
  issued_to_email: ['issued_to_email', 'email', 'issued_email'],
  issued_eligible: ['issued_eligible', 'eligible', 'is_eligible'],
  is_used: ['is_used', 'used', 'redeemed'],
  display_name: ['display_name', 'name'],
  xp_required: ['xp_required', 'xp_req'],
  template_id: ['template_id', 'id'],
  completion_type: ['completion_type', 'type']
};

/* ===================== Utilities ===================== */

const _ss = () => SpreadsheetApp.openById(SPREADSHEET_ID);
const _now = () => new Date();

function normalizeHeaderKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeModuleKey(value) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  if (/^\d+(\.0+)?$/.test(raw)) return String(Number(raw));
  return raw.toUpperCase();
}

function upper(value) {
  return String(value || '').trim().toUpperCase();
}

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback || 0);
}

function normCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function dayKeyNY(dateValue) {
  return Utilities.formatDate(new Date(dateValue), TZ, 'yyyy-MM-dd');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>\"]/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[m];
  });
}

function displayFromEmail(email) {
  return String(email || '').split('@')[0] || 'GM';
}

function buildHeaderIndex(headerRow) {
  const idx = new Map();
  (headerRow || []).forEach(function(h, i) {
    idx.set(normalizeHeaderKey(h), i);
  });

  Object.keys(HEADER_ALIASES).forEach(function(canonical) {
    if (idx.has(canonical)) return;
    const aliases = HEADER_ALIASES[canonical] || [];
    for (let i = 0; i < aliases.length; i++) {
      const alias = normalizeHeaderKey(aliases[i]);
      if (idx.has(alias)) {
        idx.set(canonical, idx.get(alias));
        return;
      }
    }
  });

  return idx;
}

function readSheet(name) {
  const sh = _ss().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);

  const range = sh.getDataRange();
  const values = range.getNumRows() > 0 ? range.getValues() : [];
  const header = values[0] || [];
  const rows = values.slice(1);
  const idx = buildHeaderIndex(header);

  return { sh: sh, header: header, rows: rows, idx: idx };
}

function getColIndex(d, key, required) {
  const k = normalizeHeaderKey(key);
  const c = d.idx.get(k);
  if (required && (c === null || c === undefined)) {
    throw new Error('Missing required column "' + key + '" in sheet "' + d.sh.getName() + '"');
  }
  return c;
}

function getRowValue(row, d, key, fallback) {
  const c = getColIndex(d, key, false);
  if (c === null || c === undefined) return fallback;
  const v = row[c];
  return v === undefined || v === null || v === '' ? fallback : v;
}

function setCellByKey(sheetData, rowNum, key, value) {
  const col = getColIndex(sheetData, key, true);
  sheetData.sh.getRange(rowNum, col + 1).setValue(value);
}

function appendObjectRow(sheetName, obj) {
  const d = readSheet(sheetName);
  if (!d.header.length) throw new Error('Sheet has no header row: ' + sheetName);

  const row = d.header.map(function(h) {
    const k = normalizeHeaderKey(h);
    return Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : '';
  });
  d.sh.appendRow(row);
}

function nvPickAny(nv, labels) {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const hit = nv && nv[label] && nv[label][0];
    if (hit !== undefined && hit !== null && String(hit).trim() !== '') {
      return String(hit).trim();
    }
  }
  return '';
}

function getYesterdayKeyNY() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return dayKeyNY(yesterday);
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function logOps(eventName, payload) {
  try {
    appendObjectRow('Ops_Log', {
      ts: _now(),
      event: eventName,
      details_json: safeStringify(payload)
    });
  } catch (err) {
    Logger.log('Ops_Log write failed: ' + err.message);
  }
}

function sendAdminAlert(subjectSuffix, message, context) {
  const body = [
    String(message || ''),
    context ? '\n\nContext:\n' + safeStringify(context) : ''
  ].join('');

  ADMIN_EMAILS.forEach(function(ad) {
    MailApp.sendEmail(ad, SUBJECT_PREFIX + ' — ' + subjectSuffix, body);
  });
}

/* ===================== Schema Guardrails ===================== */

function ensureSheetWithHeaders(sheetName, requiredHeaders) {
  const ss = _ss();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (sh.getLastRow() === 0 && sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }

  const lastCol = Math.max(sh.getLastColumn(), 1);
  const existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const existingNorm = new Set(existing.map(normalizeHeaderKey));

  const missing = requiredHeaders.filter(function(h) {
    return !existingNorm.has(normalizeHeaderKey(h));
  });

  if (missing.length) {
    sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function verifyCriticalSchema() {
  const critical = {
    Claim_Codes: ['code', 'track', 'module', 'lesson', 'xp', 'is_used'],
    Catalog: ['track', 'module_id', 'lesson_id', 'xp_value'],
    XP_Ledger: ['ts', 'email', 'track', 'module', 'lesson', 'points', 'ref_code'],
    Users: ['email', 'display_name', 'xp', 'level', 'streak_days', 'last_active'],
    Templates: ['template_id', 'subject', 'html', 'enabled'],
    Level_Titles: ['level', 'xp_required', 'title'],
    Credentials: ['pass_id', 'email', 'display_name', 'track', 'level', 'issued_at', 'status']
  };

  const missing = [];

  Object.keys(critical).forEach(function(sheetName) {
    const d = readSheet(sheetName);
    const req = critical[sheetName];
    req.forEach(function(header) {
      if (!d.idx.has(normalizeHeaderKey(header))) {
        missing.push(sheetName + '.' + header);
      }
    });
  });

  const ss = _ss();
  [FINISH_TAB, STORE_TAB].forEach(function(tab) {
    if (!ss.getSheetByName(tab)) missing.push('Missing tab: ' + tab);
  });

  if (missing.length) {
    const msg = 'Critical schema check failed: ' + missing.join(', ');
    sendAdminAlert('Schema issue', msg, { missing: missing });
    throw new Error(msg);
  }
}

function ensureSchema() {
  Object.keys(SHEET_SCHEMAS).forEach(function(sheetName) {
    ensureSheetWithHeaders(sheetName, SHEET_SCHEMAS[sheetName]);
  });

  verifyCriticalSchema();
}

/* ===================== Core Lookups ===================== */

function getLevelTitle(level) {
  const lvl = Number(level);
  if (!lvl) return '';

  const d = readSheet('Level_Titles');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (Number(getRowValue(row, d, 'level', 0)) === lvl) {
      return String(getRowValue(row, d, 'title', '')).trim();
    }
  }
  return '';
}

function levelFromXP(xp) {
  const d = readSheet('Level_Titles');
  let level = 1;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const reqXP = Number(getRowValue(row, d, 'xp_required', 0));
    const lvl = Number(getRowValue(row, d, 'level', 1));
    if (xp >= reqXP && lvl >= level) level = lvl;
  }

  return level;
}

function findClaimRow(code) {
  const want = normCode(code);
  if (!want) return null;

  const d = readSheet('Claim_Codes');
  const hasUsedCol = d.idx.has('is_used');

  for (let r = 0; r < d.rows.length; r++) {
    const row = d.rows[r];
    const rc = normCode(getRowValue(row, d, 'code', ''));
    if (rc !== want) continue;

    const moduleRaw = String(getRowValue(row, d, 'module', '')).trim();
    const moduleKey = normalizeModuleKey(moduleRaw);

    const issuedTo = String(
      getRowValue(row, d, 'issued_to_email', getRowValue(row, d, 'email', ''))
    )
      .trim()
      .toLowerCase();

    const issuedEligibleRaw = upper(getRowValue(row, d, 'issued_eligible', ''));

    return {
      rowNum: r + 2,
      code: rc,
      track: String(getRowValue(row, d, 'track', '')).trim(),
      moduleRaw: moduleRaw,
      moduleKey: moduleKey,
      lesson: Number(getRowValue(row, d, 'lesson', 0)) || 0,
      theme: String(getRowValue(row, d, 'theme', '')).trim(),
      xp: Number(getRowValue(row, d, 'xp', 0)) || 0,
      tier: upper(getRowValue(row, d, 'tier', '')),
      completionType: upper(getRowValue(row, d, 'completion_type', 'LESSON')),
      issuedToEmail: issuedTo,
      issuedEligible: issuedEligibleRaw || (hasUsedCol ? 'YES' : ''),
      isUsed: upper(getRowValue(row, d, 'is_used', 'NO')),
      hasIsUsedColumn: hasUsedCol
    };
  }

  return null;
}

function validateClaimEligibility(claim, email) {
  const userEmail = String(email || '').toLowerCase();
  if (claim.issuedToEmail && claim.issuedToEmail !== userEmail) {
    return { ok: false, reason: 'EMAIL_MISMATCH' };
  }

  if (claim.issuedEligible === 'YES' && claim.isUsed === 'YES') {
    return { ok: false, reason: 'ALREADY_USED' };
  }

  return { ok: true };
}

function findCatalog(track, moduleKey, lessonId) {
  const d = readSheet('Catalog');
  const wantTrack = String(track || '').trim();
  const wantModule = normalizeModuleKey(moduleKey);
  const wantLesson = Number(lessonId || 0);

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const cTrack = String(getRowValue(row, d, 'track', '')).trim();
    const cModule = normalizeModuleKey(getRowValue(row, d, 'module_id', getRowValue(row, d, 'module', '')));
    const cLesson = Number(getRowValue(row, d, 'lesson_id', getRowValue(row, d, 'lesson', 0))) || 0;

    if (cTrack === wantTrack && cModule === wantModule && cLesson === wantLesson) {
      return {
        lesson_title: String(getRowValue(row, d, 'lesson_title', '')),
        xp_value: Number(getRowValue(row, d, 'xp_value', 0)) || 0,
        next_lesson_id: Number(getRowValue(row, d, 'next_lesson_id', 0)) || 0,
        activity_url: String(getRowValue(row, d, 'activity_url', ''))
      };
    }
  }

  return null;
}

function findCatalogByNext(track, moduleKey, nextLessonId) {
  if (!nextLessonId) return null;
  return findCatalog(track, moduleKey, nextLessonId);
}

function getLessonsPerModule() {
  const d = readSheet('Catalog');
  const out = {};

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const track = String(getRowValue(row, d, 'track', '')).trim();
    const moduleKey = normalizeModuleKey(getRowValue(row, d, 'module_id', getRowValue(row, d, 'module', '')));
    const lessonId = Number(getRowValue(row, d, 'lesson_id', getRowValue(row, d, 'lesson', 0))) || 0;
    if (!track || !moduleKey || !lessonId) continue;

    if (!out[track]) out[track] = {};
    if (!out[track][moduleKey]) out[track][moduleKey] = new Set();

    out[track][moduleKey].add(lessonId);
  }

  return out;
}

/* ===================== User XP + Badges ===================== */

function upsertUser(email, xpGain) {
  const d = readSheet('Users');
  const emailKey = String(email || '').toLowerCase();

  let rowNum = -1;
  let curXP = 0;
  let display = '';
  let streak = 0;
  let lastActive = null;

  for (let r = 0; r < d.rows.length; r++) {
    const em = String(getRowValue(d.rows[r], d, 'email', '')).toLowerCase();
    if (em !== emailKey) continue;

    rowNum = r + 2;
    curXP = Number(getRowValue(d.rows[r], d, 'xp', 0)) || 0;
    display = String(getRowValue(d.rows[r], d, 'display_name', ''));
    streak = Number(getRowValue(d.rows[r], d, 'streak_days', 0)) || 0;
    lastActive = getRowValue(d.rows[r], d, 'last_active', null);
    break;
  }

  const safeName = (display || displayFromEmail(email))
    .replace(/[^A-Za-z0-9 _.-]/g, '')
    .trim() || displayFromEmail(email);

  const now = _now();
  const newXP = curXP + Number(xpGain || 0);
  const oldLevel = levelFromXP(curXP);
  const newLevel = levelFromXP(newXP);

  let newStreak = 1;
  const todayKey = dayKeyNY(now);
  const yesterdayKey = getYesterdayKeyNY();

  if (lastActive) {
    const lastDate = new Date(lastActive);
    if (!isNaN(lastDate.getTime())) {
      const lastKey = dayKeyNY(lastDate);
      if (lastKey === todayKey) {
        newStreak = streak || 1;
      } else if (lastKey === yesterdayKey) {
        newStreak = (streak || 0) + 1;
      }
    }
  }

  if (rowNum > 0) {
    setCellByKey(d, rowNum, 'display_name', safeName);
    setCellByKey(d, rowNum, 'xp', newXP);
    setCellByKey(d, rowNum, 'level', newLevel);
    setCellByKey(d, rowNum, 'streak_days', newStreak);
    setCellByKey(d, rowNum, 'last_active', now);
  } else {
    appendObjectRow('Users', {
      email: email,
      display_name: safeName,
      xp: newXP,
      level: newLevel,
      streak_days: 1,
      last_active: now,
      user_id: String(email || '').replace('@', '_at_')
    });
    rowNum = readSheet('Users').sh.getLastRow();
    newStreak = 1;
  }

  return {
    rowNum: rowNum,
    display: safeName,
    totalXP: newXP,
    oldLevel: oldLevel,
    level: newLevel,
    streak: newStreak
  };
}

function grantBadge(email, badgeId) {
  if (!badgeId) return false;

  const d = readSheet('Achievements');
  const wantEmail = String(email || '').toLowerCase();
  const wantBadge = String(badgeId || '');

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    const bid = String(getRowValue(row, d, 'badge_id', ''));
    if (em === wantEmail && bid === wantBadge) return false;
  }

  appendObjectRow('Achievements', {
    email: email,
    badge_id: badgeId,
    awarded_at: _now()
  });
  return true;
}

function awardAutomaticBadges(email, user, context) {
  if (user.streak === 5) grantBadge(email, 'STREAK_5');
  if (user.streak === 10) grantBadge(email, 'STREAK_10');

  if (user.totalXP >= 1000) grantBadge(email, 'XP_1000');
  if (user.totalXP >= 5000) grantBadge(email, 'XP_5000');

  if (user.level === 10) grantBadge(email, 'LEVEL_10');
  if (user.level === 20) grantBadge(email, 'LEVEL_20');

  grantBadge(email, 'T' + context.track + '_M' + context.moduleId + '_L' + context.lessonId + '_C');

  if (context.theme) {
    grantBadge(
      email,
      'T' + context.track + '_M' + context.moduleId + '_L' + context.lessonId + '_' + upper(context.theme)
    );
  }
}

function updateLevelTitleIfNeeded(rowNum, level) {
  const title = getLevelTitle(level);
  if (!title) return;

  const d = readSheet('Users');
  const col = getColIndex(d, 'level_title', false);
  if (col === null || col === undefined) return;

  const current = d.sh.getRange(rowNum, col + 1).getValue();
  if (String(current || '') !== title) {
    d.sh.getRange(rowNum, col + 1).setValue(title);
  }
}

/* ===================== Email ===================== */

function getTemplate(templateId) {
  const d = readSheet('Templates');
  const want = String(templateId || '').trim();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const id = String(getRowValue(row, d, 'template_id', '')).trim();
    const enabled = String(getRowValue(row, d, 'enabled', 'TRUE')).toLowerCase() !== 'false';
    if (id === want && enabled) {
      return {
        subject: String(getRowValue(row, d, 'subject', '')).trim(),
        html: String(getRowValue(row, d, 'html', ''))
      };
    }
  }

  return null;
}

function renderTemplate(html, data) {
  return String(html || '').replace(/\$\{(\w+)\}/g, function(_, key) {
    return escapeHtml(data[key] === undefined || data[key] === null ? '' : data[key]);
  });
}

function safeSendEmail(to, subject, html) {
  try {
    const aliases = GmailApp.getAliases() || [];
    const hasOutlookAlias = aliases
      .map(function(a) { return String(a).toLowerCase(); })
      .includes(OUTLOOK_ALIAS.toLowerCase());

    if (hasOutlookAlias) {
      GmailApp.sendEmail(to, subject, '', {
        htmlBody: html,
        from: OUTLOOK_ALIAS,
        name: SENDER_FALLBACK_NAME,
        replyTo: OUTLOOK_ALIAS
      });
      return;
    }
  } catch (err) {
    Logger.log('Gmail alias send failed, falling back: ' + err.message);
  }

  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: html,
    name: SENDER_FALLBACK_NAME,
    replyTo: OUTLOOK_ALIAS
  });
}

function sendTemplate(to, templateId, data) {
  const t = getTemplate(templateId);
  if (!t) {
    safeSendEmail(
      to,
      SUBJECT_PREFIX + ' — Notice',
      '<div style="font:15px system-ui">Hi ' + escapeHtml(data.name || 'GM') + ', your update was processed.</div>'
    );
    return;
  }

  safeSendEmail(to, renderTemplate(t.subject, data), renderTemplate(t.html, data));
}

function ensureTemplateSeed(templateId, subject, html, enabled) {
  const d = readSheet('Templates');
  const want = String(templateId || '').trim();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'template_id', '')).trim() === want) return;
  }

  appendObjectRow('Templates', {
    template_id: templateId,
    subject: subject,
    html: html,
    enabled: enabled ? 'TRUE' : 'FALSE'
  });
}

function seedTemplatesIfMissing() {
  ensureTemplateSeed(
    'FINISH_OK',
    SUBJECT_PREFIX + ' — You earned ${earnedXP} XP!',
    '<div style="font:15px system-ui"><h2>Great work, ${name}</h2><p>You finished Track ${track} · Module ${module} · Lesson ${lesson}.</p><p><b>XP Earned:</b> ${earnedXP} | <b>Total XP:</b> ${totalXP}</p><p><b>Level:</b> ${level} ${levelTitle}</p></div>',
    true
  );
  ensureTemplateSeed(
    'ALREADY_CLAIMED',
    SUBJECT_PREFIX + ' — Already claimed',
    '<div style="font:15px system-ui"><p>Hi ${name}, you already claimed XP for Track ${track} · Module ${module} · Lesson ${lesson}.</p></div>',
    true
  );
  ensureTemplateSeed(
    'CODE_MISMATCH',
    SUBJECT_PREFIX + ' — Code belongs to a different track',
    '<div style="font:15px system-ui"><p>Hi ${name}, that code belongs to Track ${claimTrack}, not Track ${track}.</p></div>',
    true
  );
  ensureTemplateSeed(
    'CODE_UNKNOWN',
    SUBJECT_PREFIX + ' — We could not find that code',
    '<div style="font:15px system-ui"><p>Hi ${name}, we could not find code <b>${code}</b>. Please check and try again.</p></div>',
    true
  );
  ensureTemplateSeed(
    'CODE_NOT_ELIGIBLE',
    SUBJECT_PREFIX + ' — Code is not eligible',
    '<div style="font:15px system-ui"><p>Hi ${name}, code <b>${code}</b> is not eligible for your account or is already used.</p></div>',
    true
  );
  ensureTemplateSeed(
    'GAUNTLET_TIER_NOT_HIGHER',
    SUBJECT_PREFIX + ' — Gauntlet tier must improve',
    '<div style="font:15px system-ui"><p>Hi ${name}, you already earned ${previousTier} for Gauntlet Level ${level}. Submit a higher tier to earn more XP.</p></div>',
    true
  );
  ensureTemplateSeed(
    'LEVEL_UP',
    SUBJECT_PREFIX + ' — Level ${level} unlocked!',
    '<div style="font:15px system-ui"><h2>Level ${level} unlocked</h2><p>${levelTitle}</p><p>Total XP: ${totalXP}</p></div>',
    true
  );
  ensureTemplateSeed(
    'MISSING_FIELDS',
    SUBJECT_PREFIX + ' — Please fix your submission',
    '<div style="font:15px system-ui"><p>We received your Finish Form but some required fields were missing. Please include Email, Track, and Claim Code.</p></div>',
    true
  );
  ensureTemplateSeed(
    'STORE_ITEM_UNKNOWN',
    SUBJECT_PREFIX + ' — Store item not found',
    '<div style="font:15px system-ui"><p>Hi ${name}, the selected store item could not be found: ${itemId}.</p></div>',
    true
  );
  ensureTemplateSeed(
    'STORE_NO_USER',
    SUBJECT_PREFIX + ' — Create your account first',
    '<div style="font:15px system-ui"><p>Hi ${name}, we could not find your user record yet. Complete a claim first, then try purchasing ${itemName}.</p></div>',
    true
  );
  ensureTemplateSeed(
    'STORE_ALREADY_OWNED',
    SUBJECT_PREFIX + ' — Item already owned',
    '<div style="font:15px system-ui"><p>Hi ${name}, you already own ${itemName}.</p></div>',
    true
  );
  ensureTemplateSeed(
    'STORE_NOT_ENOUGH_BFC',
    SUBJECT_PREFIX + ' — Not enough BFC',
    '<div style="font:15px system-ui"><p>Hi ${name}, ${itemName} costs ${price} BFC and your balance is ${balance} BFC. You need ${needed} more.</p></div>',
    true
  );
  ensureTemplateSeed(
    'STORE_PURCHASE_OK',
    SUBJECT_PREFIX + ' — Purchase confirmed',
    '<div style="font:15px system-ui"><p>Hi ${name}, your purchase is complete.</p><p><b>Item:</b> ${itemName}</p><p><b>Cost:</b> ${price}</p><p><b>New Balance:</b> ${balance}</p><p>${itemDesc}</p><p>${contentLink}</p></div>',
    true
  );
}

/* ===================== Passes + Credentials ===================== */

function generatePassId(track, tier) {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const tierCode = String(tier || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase();
  return 'BOW-' + track + '-' + tierCode + '-' + rand;
}

function buildPassData(track, passLevel, displayName, passId) {
  const issueDate = Utilities.formatDate(new Date(), TZ, 'MMMM d, yyyy');

  if (String(track) === '101') {
    const ladder101 = ['Scout', 'Analyst', 'Associate', 'Director'];
    const idx = ladder101.indexOf(passLevel);
    const nextPass = idx >= 0 && idx < ladder101.length - 1 ? ladder101[idx + 1] : '';

    return {
      name: displayName,
      passName: 'BOW ' + passLevel + ' Credential',
      track: '101',
      trackName: 'Rookie GM Foundations',
      issueDate: issueDate,
      nextPass: nextPass,
      accentColor: '#22c55e',
      passId: passId
    };
  }

  const ladder201 = ['Analyst', 'Associate', 'Senior Associate', 'Director'];
  const idx201 = ladder201.indexOf(passLevel);
  const nextPass201 = idx201 >= 0 && idx201 < ladder201.length - 1 ? ladder201[idx201 + 1] : '';

  return {
    name: displayName,
    passName: 'BOW ' + passLevel + ' Credential',
    track: '201',
    trackName: 'Front Office',
    issueDate: issueDate,
    nextPass: nextPass201,
    accentColor: '#2563eb',
    passId: passId
  };
}

function generatePassPDF(data) {
  const copyName = 'BOW_' + data.track + '_' + data.passName.replace(/\s+/g, '_') + '_' + data.name;
  const copy = DriveApp.getFileById(PASS_TEMPLATE_SLIDES_ID).makeCopy(copyName);

  const pres = SlidesApp.openById(copy.getId());
  const slide = pres.getSlides()[0];

  slide.replaceAllText('{{NAME}}', data.name);
  slide.replaceAllText('{{PASS_NAME}}', data.passName);
  slide.replaceAllText('{{TRACK}}', data.track);
  slide.replaceAllText('{{TRACK_NAME}}', data.trackName);
  slide.replaceAllText('{{ISSUE_DATE}}', data.issueDate);
  slide.replaceAllText('{{NEXT_PASS}}', data.nextPass || '');
  slide.replaceAllText('{{PASS_ID}}', data.passId || '');

  if (data.accentColor) {
    slide.getShapes().forEach(function(shape) {
      if (shape.getWidth() < 100) {
        shape.getFill().setSolidFill(data.accentColor);
      }
    });
  }

  pres.saveAndClose();
  const pdfBlob = copy.getAs(MimeType.PDF);
  DriveApp.getFileById(copy.getId()).setTrashed(true);
  return pdfBlob;
}

function sendPassEmail(email, data, pdfBlob) {
  const subject = 'Your ' + data.passName + ' is unlocked';
  const html = [
    '<div style="font:15px system-ui">',
    '<h2>Nice work, ' + escapeHtml(data.name) + '.</h2>',
    '<p>You unlocked the <b>' + escapeHtml(data.passName) + '</b>.</p>',
    '<p>Your credential PDF is attached.</p>',
    data.nextPass ? '<p><b>Next:</b> ' + escapeHtml(data.nextPass) + '</p>' : '',
    '<p>Credential ID: <b>' + escapeHtml(data.passId || '') + '</b></p>',
    '<p>— BOW Sports Capital</p>',
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: html,
    attachments: [pdfBlob],
    name: SENDER_FALLBACK_NAME,
    replyTo: OUTLOOK_ALIAS
  });
}

function upsertCredential(passInfo) {
  const d = readSheet('Credentials');
  const wantPassId = String(passInfo.passId || '').trim().toUpperCase();
  if (!wantPassId) return;

  for (let r = 0; r < d.rows.length; r++) {
    const row = d.rows[r];
    const pid = String(getRowValue(row, d, 'pass_id', '')).trim().toUpperCase();
    if (pid !== wantPassId) continue;

    const rowNum = r + 2;
    setCellByKey(d, rowNum, 'email', passInfo.email);
    setCellByKey(d, rowNum, 'display_name', passInfo.displayName);
    setCellByKey(d, rowNum, 'track', passInfo.track);
    setCellByKey(d, rowNum, 'level', passInfo.level);
    setCellByKey(d, rowNum, 'issued_at', passInfo.issuedAt || _now());
    setCellByKey(d, rowNum, 'status', passInfo.status || 'ACTIVE');
    setCellByKey(d, rowNum, 'source', passInfo.source || 'SYSTEM');
    return;
  }

  appendObjectRow('Credentials', {
    pass_id: wantPassId,
    email: passInfo.email,
    display_name: passInfo.displayName,
    track: passInfo.track,
    level: passInfo.level,
    issued_at: passInfo.issuedAt || _now(),
    status: passInfo.status || 'ACTIVE',
    source: passInfo.source || 'SYSTEM'
  });
}

function ensurePassForTrack(usersData, rowNum, email, displayName, track, newPass) {
  if (!newPass) return;

  const trackKey = String(track);
  const passCol = trackKey === '101' ? 'pass_101' : 'pass_201';
  const passIdCol = trackKey === '101' ? 'pass_id_101' : 'pass_id_201';
  const lastEmailCol = trackKey === '101' ? 'pass_last_emailed_101' : 'pass_last_emailed_201';

  const passColIdx = getColIndex(usersData, passCol, true);
  const passIdColIdx = getColIndex(usersData, passIdCol, true);
  const lastEmailColIdx = getColIndex(usersData, lastEmailCol, true);

  const oldPass = String(usersData.sh.getRange(rowNum, passColIdx + 1).getValue() || '').trim();
  let passId = String(usersData.sh.getRange(rowNum, passIdColIdx + 1).getValue() || '').trim();
  const lastEmailed = String(usersData.sh.getRange(rowNum, lastEmailColIdx + 1).getValue() || '').trim();

  let changedTier = false;
  if (oldPass !== newPass) {
    usersData.sh.getRange(rowNum, passColIdx + 1).setValue(newPass);
    changedTier = true;
    passId = '';
  }

  if (!passId) {
    passId = generatePassId(trackKey, newPass);
    usersData.sh.getRange(rowNum, passIdColIdx + 1).setValue(passId);
  }

  upsertCredential({
    passId: passId,
    email: email,
    displayName: displayName,
    track: trackKey,
    level: newPass,
    issuedAt: _now(),
    status: 'ACTIVE',
    source: changedTier ? 'PASS_ISSUED' : 'PASS_SYNC'
  });

  if (changedTier && lastEmailed !== newPass) {
    try {
      const passData = buildPassData(trackKey, newPass, displayName, passId);
      const pdf = generatePassPDF(passData);
      sendPassEmail(email, passData, pdf);
      usersData.sh.getRange(rowNum, lastEmailColIdx + 1).setValue(newPass);
    } catch (err) {
      sendAdminAlert('Pass email error', String(err && err.stack || err), {
        email: email,
        track: trackKey,
        pass: newPass,
        passId: passId
      });
    }
  }
}

/* ===================== Claim Logic ===================== */

function hasUserUsedRefCode(email, code) {
  const d = readSheet('XP_Ledger');
  const wantEmail = String(email || '').toLowerCase();
  const wantCode = normCode(code);

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    const ref = normCode(getRowValue(row, d, 'ref_code', ''));
    if (em === wantEmail && ref === wantCode) return true;
  }

  return false;
}

function alreadyClaimedStandardLesson(email, track, moduleKey, lessonId) {
  const d = readSheet('XP_Ledger');
  const wantEmail = String(email || '').toLowerCase();
  const wantTrack = String(track || '');
  const wantModule = normalizeModuleKey(moduleKey);
  const wantLesson = Number(lessonId || 0);

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== wantEmail) continue;

    const tr = String(getRowValue(row, d, 'track', ''));
    const mod = normalizeModuleKey(getRowValue(row, d, 'module', ''));
    const les = Number(getRowValue(row, d, 'lesson', 0)) || 0;

    if (tr === wantTrack && mod === wantModule && les === wantLesson) {
      return true;
    }
  }

  return false;
}

function normalizeTier(tier) {
  const t = upper(tier);
  return GAUNTLET_TIER_RANK[t] ? t : '';
}

function gauntletXP(level, tier) {
  const lvl = Number(level || 0);
  const t = normalizeTier(tier);
  if (!lvl || !t) return 0;
  const table = GAUNTLET_XP_BY_LEVEL[lvl] || {};
  return Number(table[t] || 0);
}

function inferGauntletTierFromPoints(level, points) {
  const lvl = Number(level || 0);
  const pts = Number(points || 0);
  const table = GAUNTLET_XP_BY_LEVEL[lvl] || {};

  if (Number(table.GOLD || 0) === pts) return 'GOLD';
  if (Number(table.SILVER || 0) === pts) return 'SILVER';
  if (Number(table.BRONZE || 0) === pts) return 'BRONZE';
  return '';
}

function bestGauntletTierFromLedger(email, track, level) {
  const d = readSheet('XP_Ledger');
  const wantEmail = String(email || '').toLowerCase();
  const wantTrack = String(track || '');
  const wantLesson = Number(level || 0);

  let bestTier = '';
  let bestRank = 0;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== wantEmail) continue;

    const tr = String(getRowValue(row, d, 'track', ''));
    const mod = normalizeModuleKey(getRowValue(row, d, 'module', ''));
    const les = Number(getRowValue(row, d, 'lesson', 0)) || 0;

    if (tr !== wantTrack || mod !== 'GAUNTLET' || les !== wantLesson) continue;

    let tier = normalizeTier(getRowValue(row, d, 'tier', ''));
    if (!tier) {
      tier = inferGauntletTierFromPoints(wantLesson, getRowValue(row, d, 'points', 0));
    }

    const rank = GAUNTLET_TIER_RANK[tier] || 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestTier = tier;
    }
  }

  return {
    tier: bestTier,
    rank: bestRank,
    xp: bestTier ? gauntletXP(wantLesson, bestTier) : 0
  };
}

function evaluateGauntletDeltaClaim(email, track, level, newTier) {
  const tier = normalizeTier(newTier);
  const newRank = GAUNTLET_TIER_RANK[tier] || 0;
  if (!newRank) {
    return { ok: false, reason: 'INVALID_TIER' };
  }

  const fullXP = gauntletXP(level, tier);
  if (!fullXP) {
    return { ok: false, reason: 'INVALID_GAUNTLET_LEVEL' };
  }

  const best = bestGauntletTierFromLedger(email, track, level);
  if (best.rank >= newRank) {
    return {
      ok: false,
      reason: 'TIER_NOT_HIGHER',
      previousTier: best.tier || 'NONE'
    };
  }

  const deltaXP = best.rank > 0 ? (fullXP - best.xp) : fullXP;
  if (deltaXP <= 0) {
    return {
      ok: false,
      reason: 'TIER_NOT_HIGHER',
      previousTier: best.tier || 'NONE'
    };
  }

  return {
    ok: true,
    deltaXP: deltaXP,
    fullXP: fullXP,
    previousTier: best.tier || '',
    previousRank: best.rank,
    newTier: tier,
    deltaReason: best.rank > 0 ? ('UPGRADE_' + best.tier + '_TO_' + tier) : 'FIRST_GAUNTLET_CLAIM'
  };
}

/* ===================== Completion + Pass Recompute ===================== */

function buildClaimMetaMap() {
  const d = readSheet('Claim_Codes');
  const map = new Map();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const code = normCode(getRowValue(row, d, 'code', ''));
    if (!code) continue;

    map.set(code, {
      completionType: upper(getRowValue(row, d, 'completion_type', 'LESSON')),
      tier: normalizeTier(getRowValue(row, d, 'tier', '')),
      moduleKey: normalizeModuleKey(getRowValue(row, d, 'module', '')),
      lesson: Number(getRowValue(row, d, 'lesson', 0)) || 0,
      track: String(getRowValue(row, d, 'track', '')).trim()
    });
  }

  return map;
}

function blankTrackProgress() {
  return {
    lessonsByModule: {},
    moduleFinals: new Set(),
    trackComplete: false,
    gauntletLevels: new Set(),
    bestGauntletTierByLevel: {}
  };
}

function ensureTrackProgress(progressObj, track) {
  if (!progressObj[track]) progressObj[track] = blankTrackProgress();
  return progressObj[track];
}

function countCompletedModules(trackKey, pTrack, lessonsPerModule) {
  const requiredMap = lessonsPerModule[trackKey] || {};
  const completedModules = new Set();
  let count = 0;

  Object.keys(requiredMap).forEach(function(moduleKey) {
    if (moduleKey === 'GAUNTLET') return;

    const required = requiredMap[moduleKey] ? requiredMap[moduleKey].size : 0;
    const completed = pTrack.lessonsByModule[moduleKey] ? pTrack.lessonsByModule[moduleKey].size : 0;

    if (required > 0 && completed >= required) {
      count += 1;
      completedModules.add(moduleKey);
    }
  });

  pTrack.moduleFinals.forEach(function(moduleKey) {
    if (moduleKey === 'GAUNTLET') return;
    if (!completedModules.has(moduleKey)) {
      count += 1;
      completedModules.add(moduleKey);
    }
  });

  return count;
}

function mapPass101(modulesCompleted, trackComplete) {
  if (trackComplete) return 'Director';
  if (modulesCompleted >= 3) return 'Associate';
  if (modulesCompleted >= 2) return 'Analyst';
  if (modulesCompleted >= 1) return 'Scout';
  return '';
}

function mapPass201(modulesCompleted, trackComplete) {
  if (trackComplete) return 'Director';
  if (modulesCompleted >= 3) return 'Senior Associate';
  if (modulesCompleted >= 2) return 'Associate';
  if (modulesCompleted >= 1) return 'Analyst';
  return '';
}

function recomputeCompletionAndPasses() {
  ensureSchema();

  const lessonsPerModule = getLessonsPerModule();
  const claimMetaMap = buildClaimMetaMap();
  const ledger = readSheet('XP_Ledger');
  const users = readSheet('Users');

  const progressByEmail = new Map();

  for (let i = 0; i < ledger.rows.length; i++) {
    const row = ledger.rows[i];
    const email = String(getRowValue(row, ledger, 'email', '')).toLowerCase();
    const track = String(getRowValue(row, ledger, 'track', '')).trim();
    if (!email || !track) continue;

    if (!progressByEmail.has(email)) progressByEmail.set(email, {});
    const pUser = progressByEmail.get(email);
    const pTrack = ensureTrackProgress(pUser, track);

    const moduleKey = normalizeModuleKey(getRowValue(row, ledger, 'module', ''));
    const lessonId = Number(getRowValue(row, ledger, 'lesson', 0)) || 0;
    const refCode = normCode(getRowValue(row, ledger, 'ref_code', ''));

    const claimMeta = claimMetaMap.get(refCode);
    const completionType = upper(claimMeta ? claimMeta.completionType : 'LESSON') || 'LESSON';
    const tierFromLedger = normalizeTier(getRowValue(row, ledger, 'tier', ''));
    const tier = tierFromLedger || (claimMeta ? claimMeta.tier : '');

    if (completionType === 'TRACK_FINAL') {
      pTrack.trackComplete = true;
      continue;
    }

    if (completionType === 'MODULE_FINAL') {
      if (moduleKey) pTrack.moduleFinals.add(moduleKey);
      continue;
    }

    if (moduleKey && lessonId) {
      if (!pTrack.lessonsByModule[moduleKey]) pTrack.lessonsByModule[moduleKey] = new Set();
      pTrack.lessonsByModule[moduleKey].add(lessonId);

      if (moduleKey === 'GAUNTLET') {
        pTrack.gauntletLevels.add(lessonId);
        const prior = pTrack.bestGauntletTierByLevel[lessonId] || '';
        const priorRank = GAUNTLET_TIER_RANK[prior] || 0;
        const nextRank = GAUNTLET_TIER_RANK[tier] || 0;
        if (nextRank > priorRank) pTrack.bestGauntletTierByLevel[lessonId] = tier;
      }
    }
  }

  for (let r = 0; r < users.rows.length; r++) {
    const rowNum = r + 2;
    const row = users.rows[r];

    const email = String(getRowValue(row, users, 'email', '')).toLowerCase();
    if (!email) continue;

    const displayName = String(getRowValue(row, users, 'display_name', '') || displayFromEmail(email));

    const pUser = progressByEmail.get(email) || {};
    const p101 = pUser['101'] || blankTrackProgress();
    const p201 = pUser['201'] || blankTrackProgress();

    const m101 = countCompletedModules('101', p101, lessonsPerModule);
    const t101 = !!p101.trackComplete;
    const newPass101 = mapPass101(m101, t101);

    setCellByKey(users, rowNum, 'modules_completed_101', m101);
    setCellByKey(users, rowNum, 'track_101_complete', t101);
    ensurePassForTrack(users, rowNum, email, displayName, '101', newPass101);

    const m201 = countCompletedModules('201', p201, lessonsPerModule);
    const t201 = !!p201.trackComplete;
    const newPass201 = mapPass201(m201, t201);

    setCellByKey(users, rowNum, 'modules_completed_201', m201);
    setCellByKey(users, rowNum, 'track_201_complete', t201);
    ensurePassForTrack(users, rowNum, email, displayName, '201', newPass201);

    if (p201.gauntletLevels.size >= 3) {
      grantBadge(email, 'GAUNTLET_MASTER');
    }
  }
}

/* ===================== Finish Handler ===================== */

function onFinishSubmit(e) {
  const lock = LockService.getScriptLock();
  const ctx = {
    handler: 'onFinishSubmit',
    timestamp: new Date().toISOString()
  };

  try {
    lock.waitLock(30000);
    ensureSchema();

    if (!e || !e.range || e.range.getSheet().getName() !== FINISH_TAB) return;

    const nv = e.namedValues || {};
    const email = nvPickAny(nv, ['Email', 'Email Address']);
    const code = nvPickAny(nv, ['Code', 'Claim Code']);
    const track = nvPickAny(nv, ['Track']);
    const modStr = nvPickAny(nv, ['Module']);
    const lessonStr = nvPickAny(nv, ['Lesson']);
    const rawName = nvPickAny(nv, ['Name', 'Display Name']);

    ctx.email = email;
    ctx.code = code;
    ctx.track = track;

    if (!email || !code || !track) {
      sendAdminAlert('Finish: missing fields', 'Required fields missing.', ctx);
      if (email) {
        sendTemplate(email, 'MISSING_FIELDS', { name: displayFromEmail(email) });
      }
      logOps('finish_missing_fields', ctx);
      return;
    }

    const claim = findClaimRow(code);
    if (!claim) {
      sendTemplate(email, 'CODE_UNKNOWN', {
        name: rawName || displayFromEmail(email),
        code: code
      });
      logOps('finish_code_unknown', ctx);
      return;
    }

    const eligibility = validateClaimEligibility(claim, email);
    if (!eligibility.ok) {
      sendTemplate(email, 'CODE_NOT_ELIGIBLE', {
        name: rawName || displayFromEmail(email),
        code: code
      });
      logOps('finish_code_not_eligible', {
        email: email,
        code: code,
        reason: eligibility.reason
      });
      return;
    }

    if (String(claim.track) !== String(track)) {
      sendTemplate(email, 'CODE_MISMATCH', {
        name: rawName || displayFromEmail(email),
        code: code,
        track: track,
        claimTrack: claim.track
      });
      logOps('finish_code_mismatch', {
        email: email,
        code: code,
        submittedTrack: track,
        claimTrack: claim.track
      });
      return;
    }

    const moduleKey = claim.moduleKey || normalizeModuleKey(modStr) || '1';
    const lessonId = claim.lesson || toNum(lessonStr, 1);
    const cleanName = (rawName || displayFromEmail(email)).replace(/[^A-Za-z0-9 _.-]/g, '').trim() || displayFromEmail(email);

    ctx.module = moduleKey;
    ctx.lesson = lessonId;

    if (hasUserUsedRefCode(email, code)) {
      sendTemplate(email, 'ALREADY_CLAIMED', {
        name: cleanName,
        track: track,
        module: moduleKey,
        lesson: lessonId
      });
      logOps('finish_duplicate_ref_code', ctx);
      return;
    }

    const catalogHit = findCatalog(track, moduleKey, lessonId);
    const fallbackXP = String(track) === '101' ? 100 : (String(track) === '201' ? 150 : (String(track) === '301' ? 200 : 150));
    const baseXP = Number(claim.xp) || (catalogHit ? Number(catalogHit.xp_value || 0) : 0) || fallbackXP;

    let awardedXP = baseXP;
    let tierToLog = '';
    let deltaReason = '';

    if (moduleKey === 'GAUNTLET') {
      const tier = normalizeTier(claim.tier || nvPickAny(nv, ['Tier']));
      if (!tier) {
        sendTemplate(email, 'CODE_NOT_ELIGIBLE', {
          name: cleanName,
          code: code
        });
        logOps('finish_gauntlet_missing_tier', ctx);
        return;
      }

      tierToLog = tier;
      const delta = evaluateGauntletDeltaClaim(email, track, lessonId, tier);
      if (!delta.ok) {
        sendTemplate(email, 'GAUNTLET_TIER_NOT_HIGHER', {
          name: cleanName,
          level: lessonId,
          previousTier: delta.previousTier || 'a higher tier'
        });
        logOps('finish_gauntlet_tier_not_higher', {
          email: email,
          level: lessonId,
          tier: tier,
          reason: delta.reason,
          previousTier: delta.previousTier || ''
        });
        return;
      }

      awardedXP = delta.deltaXP;
      deltaReason = delta.deltaReason;
    } else {
      if (alreadyClaimedStandardLesson(email, track, moduleKey, lessonId)) {
        sendTemplate(email, 'ALREADY_CLAIMED', {
          name: cleanName,
          track: track,
          module: moduleKey,
          lesson: lessonId
        });
        logOps('finish_duplicate_lesson', ctx);
        return;
      }
    }

    const ts = _now();
    appendObjectRow('XP_Ledger', {
      ts: ts,
      email: email,
      name: cleanName,
      track: track,
      outcome: 'OK',
      action: 'CLAIM_CODE',
      module: moduleKey,
      lesson: lessonId,
      points: awardedXP,
      note: 'T' + track,
      key: track + '-' + moduleKey + '-' + lessonId,
      ref_code: normCode(code),
      tier: tierToLog,
      delta_reason: deltaReason,
      source: 'FINISH_FORM'
    });

    if (claim.issuedEligible === 'YES' && claim.hasIsUsedColumn) {
      const claimSheet = readSheet('Claim_Codes');
      setCellByKey(claimSheet, claim.rowNum, 'is_used', 'YES');
    }

    const user = upsertUser(email, awardedXP);
    updateLevelTitleIfNeeded(user.rowNum, user.level);

    awardAutomaticBadges(email, user, {
      track: track,
      moduleId: moduleKey,
      lessonId: lessonId,
      theme: claim.theme
    });

    const nextCatalog = catalogHit ? findCatalogByNext(track, moduleKey, catalogHit.next_lesson_id) : null;

    sendTemplate(email, 'FINISH_OK', {
      name: user.display,
      track: track,
      module: moduleKey,
      lesson: lessonId,
      earnedXP: awardedXP,
      totalXP: user.totalXP,
      level: user.level,
      levelTitle: getLevelTitle(user.level),
      streak: user.streak,
      nextUrl: nextCatalog ? nextCatalog.activity_url : '',
      nextLabel: nextCatalog ? ('Module ' + moduleKey + ' · Lesson ' + catalogHit.next_lesson_id) : ''
    });

    if (user.level > user.oldLevel) {
      sendTemplate(email, 'LEVEL_UP', {
        name: user.display,
        level: user.level,
        levelTitle: getLevelTitle(user.level),
        totalXP: user.totalXP
      });
    }

    recomputeCompletionAndPasses();
    rebuildLeaderboards();

    logOps('finish_success', {
      email: email,
      code: code,
      track: track,
      module: moduleKey,
      lesson: lessonId,
      awardedXP: awardedXP,
      tier: tierToLog
    });
  } catch (err) {
    const msg = String(err && err.stack || err);
    sendAdminAlert('Finish error', msg, ctx);
    logOps('finish_error', { context: ctx, error: msg });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/* ===================== Leaderboards ===================== */

function rebuildLeaderboards() {
  const users = readSheet('Users');

  const all = users.rows
    .map(function(row) {
      return {
        name: String(getRowValue(row, users, 'display_name', '')),
        xp: Number(getRowValue(row, users, 'xp', 0)) || 0,
        level: Number(getRowValue(row, users, 'level', 0)) || 0,
        streak: Number(getRowValue(row, users, 'streak_days', 0)) || 0,
        email: String(getRowValue(row, users, 'email', '')).toLowerCase()
      };
    })
    .sort(function(a, b) { return b.xp - a.xp; })
    .slice(0, 50);

  function writeBoard(tabName, rows) {
    const sh = readSheet(tabName).sh;
    sh.clear();
    sh.getRange(1, 1, 1, 5).setValues([['Rank', 'Display Name', 'Total XP', 'Level', 'Streak']]);
    if (!rows.length) return;

    const data = rows.map(function(r, idx) {
      return [idx + 1, r.name, r.xp, r.level, r.streak];
    });
    sh.getRange(2, 1, data.length, 5).setValues(data);
  }

  writeBoard('Leaderboard_All', all);

  const ledger = readSheet('XP_Ledger');
  const byTrack = { '101': new Map(), '201': new Map(), '301': new Map() };

  for (let i = 0; i < ledger.rows.length; i++) {
    const row = ledger.rows[i];
    const tr = String(getRowValue(row, ledger, 'track', '')).trim();
    const em = String(getRowValue(row, ledger, 'email', '')).toLowerCase();
    const pts = Number(getRowValue(row, ledger, 'points', 0)) || 0;
    if (byTrack[tr] && em && pts > 0) {
      byTrack[tr].set(em, (byTrack[tr].get(em) || 0) + pts);
    }
  }

  const userMap = new Map(
    users.rows.map(function(row) {
      const email = String(getRowValue(row, users, 'email', '')).toLowerCase();
      return [
        email,
        {
          name: String(getRowValue(row, users, 'display_name', '') || displayFromEmail(email)),
          level: Number(getRowValue(row, users, 'level', 0)) || 0,
          streak: Number(getRowValue(row, users, 'streak_days', 0)) || 0
        }
      ];
    })
  );

  function buildTrackLeaderboard(track) {
    const merged = [];
    byTrack[track].forEach(function(xp, email) {
      const u = userMap.get(email) || { name: displayFromEmail(email), level: 0, streak: 0 };
      merged.push({ name: u.name, xp: xp, level: u.level, streak: u.streak });
    });

    merged.sort(function(a, b) { return b.xp - a.xp; });
    return merged.slice(0, 50);
  }

  writeBoard('Leaderboard_101', buildTrackLeaderboard('101'));
  writeBoard('Leaderboard_201', buildTrackLeaderboard('201'));
  writeBoard('Leaderboard_301', buildTrackLeaderboard('301'));
}

function recomputeLevels() {
  const users = readSheet('Users');
  for (let i = 0; i < users.rows.length; i++) {
    const rowNum = i + 2;
    const xp = Number(getRowValue(users.rows[i], users, 'xp', 0)) || 0;
    setCellByKey(users, rowNum, 'level', levelFromXP(xp));
  }
}

function nightlyMaintenance() {
  try {
    ensureSchema();
    recomputeLevels();
    recomputeCompletionAndPasses();
    rebuildLeaderboards();
    logOps('nightly_maintenance_ok', { ts: new Date().toISOString() });
  } catch (err) {
    const msg = String(err && err.stack || err);
    sendAdminAlert('Nightly maintenance error', msg);
    logOps('nightly_maintenance_error', { error: msg });
  }
}

/* ===================== Setup ===================== */

function setup() {
  ensureSchema();

  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('onFinishSubmit')
    .forSpreadsheet(SPREADSHEET_ID)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('processStorePurchase')
    .forSpreadsheet(SPREADSHEET_ID)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('nightlyMaintenance')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .inTimezone(TZ)
    .create();

  seedTemplatesIfMissing();
  logOps('setup_completed', {
    finishFormId: FINISH_FORM_ID,
    storeFormId: STORE_FORM_ID,
    spreadsheetId: SPREADSHEET_ID
  });
}

/* ===================== Admin Helpers ===================== */

function rebuild_now() {
  rebuildLeaderboards();
}

function recount_levels_now() {
  recomputeLevels();
}

function recompute_passes_now() {
  recomputeCompletionAndPasses();
}

/* ===================== Store Helpers ===================== */

function getStoreItem(itemId) {
  const d = readSheet('Store_Catalog');
  const want = String(itemId || '').trim();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const id = String(getRowValue(row, d, 'item_id', '')).trim();
    const enabled = String(getRowValue(row, d, 'enabled', 'TRUE')).toLowerCase() !== 'false';
    if (id === want && enabled) {
      return {
        itemId: id,
        name: String(getRowValue(row, d, 'name', '')).trim(),
        desc: String(getRowValue(row, d, 'description', '')).trim(),
        category: upper(getRowValue(row, d, 'category', '')),
        priceBFC: Number(getRowValue(row, d, 'price_bfc', 0)) || 0,
        givesBadge: String(getRowValue(row, d, 'gives_badge', '')).trim(),
        givesTitle: String(getRowValue(row, d, 'gives_title', '')).trim(),
        contentLink: String(getRowValue(row, d, 'content_link', '')).trim(),
        previewImage: String(getRowValue(row, d, 'preview_image', '')).trim()
      };
    }
  }

  return null;
}

function getUserBFC(email) {
  const d = readSheet('Users');
  const want = String(email || '').toLowerCase();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== want) continue;

    return {
      row: i + 2,
      bfc: Number(getRowValue(row, d, 'bfc', 0)) || 0,
      display: String(getRowValue(row, d, 'display_name', '') || displayFromEmail(email))
    };
  }

  return null;
}

function setUserBFC(rowNum, bfc) {
  const d = readSheet('Users');
  setCellByKey(d, rowNum, 'bfc', bfc);
}

function userOwnsItem(email, itemId, category) {
  if (upper(category) === 'GM_CARD') return false;

  const d = readSheet('Inventory');
  const wantEmail = String(email || '').toLowerCase();
  const wantItem = String(itemId || '').trim();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    const id = String(getRowValue(row, d, 'item_id', '')).trim();
    if (em === wantEmail && id === wantItem) return true;
  }

  return false;
}

function findSpecialTitleMeta(titleId) {
  const d = readSheet('Special_Titles');
  const want = String(titleId || '').trim();

  if (!want) return null;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const marker = String(getRowValue(row, d, 'email', '')).trim();
    const tid = String(getRowValue(row, d, 'title_id', '')).trim();

    if (marker === '__MASTER_LIST__' && tid === want) {
      return {
        titleId: tid,
        titleName: String(getRowValue(row, d, 'title_name', '')).trim(),
        titleType: String(getRowValue(row, d, 'title_type', '')).trim(),
        rarity: String(getRowValue(row, d, 'rarity', '')).trim()
      };
    }
  }

  return null;
}

function grantSpecialTitle(email, titleId, source) {
  const meta = findSpecialTitleMeta(titleId);
  if (!meta) return false;

  const d = readSheet('Special_Titles');
  const wantEmail = String(email || '').toLowerCase();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    const tid = String(getRowValue(row, d, 'title_id', '')).trim();
    if (em === wantEmail && tid === meta.titleId) return false;
  }

  appendObjectRow('Special_Titles', {
    email: email,
    title_id: meta.titleId,
    title_name: meta.titleName,
    title_type: meta.titleType,
    rarity: meta.rarity,
    awarded_at: _now(),
    source: source || 'STORE',
    notes: ''
  });

  return true;
}

function processStorePurchase(e) {
  try {
    ensureSchema();

    if (!e || !e.range || e.range.getSheet().getName() !== STORE_TAB) return;

    const nv = e.namedValues || {};
    const email = nvPickAny(nv, ['Email Address', 'Email']);
    const itemId = nvPickAny(nv, ['Choose Item to Purchase', 'Item']);
    const confirm = upper(nvPickAny(nv, ['Confirm Purchase']));

    if (!email || !itemId || confirm !== 'YES') {
      sendAdminAlert('Store: incomplete submission', 'Missing fields in store purchase.', {
        email: email,
        itemId: itemId,
        confirm: confirm
      });
      return;
    }

    const item = getStoreItem(itemId);
    if (!item) {
      sendTemplate(email, 'STORE_ITEM_UNKNOWN', {
        name: displayFromEmail(email),
        itemId: itemId
      });
      return;
    }

    const user = getUserBFC(email);
    if (!user) {
      sendTemplate(email, 'STORE_NO_USER', {
        name: displayFromEmail(email),
        itemName: item.name
      });
      return;
    }

    if (userOwnsItem(email, item.itemId, item.category)) {
      sendTemplate(email, 'STORE_ALREADY_OWNED', {
        name: user.display,
        itemName: item.name
      });
      return;
    }

    if (item.priceBFC > 0 && user.bfc < item.priceBFC) {
      sendTemplate(email, 'STORE_NOT_ENOUGH_BFC', {
        name: user.display,
        itemName: item.name,
        price: item.priceBFC,
        balance: user.bfc,
        needed: item.priceBFC - user.bfc
      });
      return;
    }

    const newBFC = item.priceBFC > 0 ? user.bfc - item.priceBFC : user.bfc;
    if (item.priceBFC > 0) setUserBFC(user.row, newBFC);

    appendObjectRow('Inventory', {
      email: email,
      item_id: item.itemId,
      name: item.name,
      category: item.category,
      acquired_at: _now(),
      source: 'STORE',
      notes: ''
    });

    if (item.givesBadge) grantBadge(email, item.givesBadge);
    if (item.givesTitle) grantSpecialTitle(email, item.givesTitle, 'STORE');

    sendTemplate(email, 'STORE_PURCHASE_OK', {
      name: user.display,
      itemName: item.name,
      price: item.priceBFC,
      balance: newBFC,
      itemDesc: item.desc,
      contentLink: item.contentLink || ''
    });

    logOps('store_purchase_ok', {
      email: email,
      itemId: item.itemId,
      price: item.priceBFC,
      newBFC: newBFC
    });
  } catch (err) {
    const msg = String(err && err.stack || err);
    sendAdminAlert('Store error', msg);
    logOps('store_purchase_error', { error: msg });
  }
}

/* ===================== Credentials Verify Web ===================== */

function findCredentialByPassId(passId) {
  const d = readSheet('Credentials');
  const want = String(passId || '').trim().toUpperCase();
  if (!want) return null;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const pid = String(getRowValue(row, d, 'pass_id', '')).trim().toUpperCase();
    if (pid !== want) continue;

    return {
      passId: pid,
      email: String(getRowValue(row, d, 'email', '')),
      name: String(getRowValue(row, d, 'display_name', '')),
      track: String(getRowValue(row, d, 'track', '')),
      level: String(getRowValue(row, d, 'level', '')),
      issuedAt: getRowValue(row, d, 'issued_at', ''),
      status: String(getRowValue(row, d, 'status', 'ACTIVE')),
      source: String(getRowValue(row, d, 'source', ''))
    };
  }

  return null;
}

function doGet(e) {
  ensureSchema();

  const passId = e && e.parameter ? String(e.parameter.id || '').trim() : '';
  const credential = passId ? findCredentialByPassId(passId) : null;

  const html = passId
    ? renderResultHtml(credential, passId)
    : renderSearchHtml();

  return HtmlService
    .createHtmlOutput(html)
    .setTitle('BOW Credential Verification')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderSearchHtml() {
  return [
    '<div style="font-family:system-ui;max-width:460px;margin:40px auto;padding:16px;">',
    '<h2>BOW Credential Verification</h2>',
    '<form method="GET">',
    '<input name="id" placeholder="Enter Credential ID" style="width:100%;padding:10px;font-size:16px;" />',
    '<button style="margin-top:12px;padding:10px;width:100%;">Verify</button>',
    '</form>',
    '</div>'
  ].join('');
}

function renderResultHtml(credential, passId) {
  if (!credential) {
    return [
      '<div style="font-family:system-ui;max-width:460px;margin:40px auto;padding:16px;">',
      '<h2>Credential Not Found</h2>',
      '<p>No credential found for ID <b>' + escapeHtml(passId) + '</b>.</p>',
      '<p>Please verify the ID and try again.</p>',
      '</div>'
    ].join('');
  }

  if (upper(credential.status) !== 'ACTIVE') {
    return [
      '<div style="font-family:system-ui;max-width:460px;margin:40px auto;padding:16px;">',
      '<h2>Credential Status</h2>',
      '<p><b>Status:</b> ' + escapeHtml(credential.status) + '</p>',
      '<p>This credential is not currently active.</p>',
      '</div>'
    ].join('');
  }

  const issuedDate = credential.issuedAt
    ? Utilities.formatDate(new Date(credential.issuedAt), TZ, 'MMMM d, yyyy')
    : 'Unknown';

  return [
    '<div style="font-family:system-ui;max-width:460px;margin:40px auto;padding:16px;">',
    '<h2>Credential Verified</h2>',
    '<p><b>Name:</b> ' + escapeHtml(credential.name) + '</p>',
    '<p><b>Track:</b> ' + escapeHtml(credential.track) + '</p>',
    '<p><b>Credential:</b> ' + escapeHtml(credential.level) + '</p>',
    '<p><b>Issued:</b> ' + escapeHtml(issuedDate) + '</p>',
    '<p style="margin-top:16px;font-size:12px;color:#666;">Credential ID: ' + escapeHtml(credential.passId) + '</p>',
    '</div>'
  ].join('');
}

/* ===================== Gauntlet Web Endpoint ===================== */

function doPost(e) {
  try {
    ensureSchema();

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    const required = ['email', 'tier', 'level', 'score'];
    for (let i = 0; i < required.length; i++) {
      const field = required[i];
      if (data[field] === undefined || data[field] === null || String(data[field]).trim() === '') {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, error: 'Missing required field: ' + field }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (data.simulationType && upper(data.simulationType) !== 'GAUNTLET') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Unsupported simulationType: ' + data.simulationType }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const result = processGauntletSubmission_(data);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const msg = String(err && err.message || err);
    logOps('doPost_error', { error: msg });

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: msg }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function bestGauntletTierInClaims(email, level) {
  const d = readSheet('Claim_Codes');
  const wantEmail = String(email || '').toLowerCase();
  const wantLevel = Number(level || 0);

  let bestTier = '';
  let bestRank = 0;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const tr = String(getRowValue(row, d, 'track', '')).trim();
    const mod = normalizeModuleKey(getRowValue(row, d, 'module', ''));
    const les = Number(getRowValue(row, d, 'lesson', 0)) || 0;
    if (tr !== '201' || mod !== 'GAUNTLET' || les !== wantLevel) continue;

    const owner = String(
      getRowValue(row, d, 'issued_to_email', getRowValue(row, d, 'email', ''))
    ).toLowerCase();

    if (owner !== wantEmail) continue;

    const tier = normalizeTier(getRowValue(row, d, 'tier', ''));
    const rank = GAUNTLET_TIER_RANK[tier] || 0;

    if (rank > bestRank) {
      bestRank = rank;
      bestTier = tier;
    }
  }

  return { tier: bestTier, rank: bestRank };
}

function processGauntletSubmission_(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const score = Number(data.score || 0);
  const tier = normalizeTier(data.tier);
  const level = Number(data.level || 0);

  if (!email || !tier || !level) {
    return { success: false, reason: 'INVALID_INPUT', message: 'email, tier, and level are required.' };
  }

  if (![1, 2, 3].includes(level)) {
    return { success: false, reason: 'INVALID_LEVEL', message: 'Gauntlet level must be 1, 2, or 3.' };
  }

  const best = bestGauntletTierInClaims(email, level);
  const newRank = GAUNTLET_TIER_RANK[tier] || 0;

  if (best.rank >= newRank) {
    return {
      success: false,
      reason: 'TIER_NOT_HIGHER',
      message: 'You already earned ' + best.tier + ' for Gauntlet Level ' + level + '. Submit a higher tier to generate a new code.',
      previousTier: best.tier,
      currentTier: tier
    };
  }

  const emailBase = String(email.split('@')[0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const initials = emailBase.substring(0, 2) || 'GM';
  const code = 'GAUNTLET-L' + level + '-' + tier + '-' + String(Math.round(score)) + '-' + initials + '-' + generateRandomSuffix_(6);
  const xp = gauntletXP(level, tier);

  appendObjectRow('Claim_Codes', {
    code: code,
    track: '201',
    module: 'GAUNTLET',
    lesson: level,
    issued_to_email: email,
    email: email,
    issued_eligible: 'YES',
    is_used: 'NO',
    theme: 'Gauntlet Level ' + level,
    xp: xp,
    completion_type: 'LESSON',
    tier: tier,
    created_at: _now()
  });

  try {
    sendGauntletConfirmationEmail_(email, code, tier, xp, level, data.gameData || null);
  } catch (err) {
    logOps('gauntlet_email_error', {
      email: email,
      code: code,
      error: String(err && err.message || err)
    });
  }

  logOps('gauntlet_claim_code_created', {
    email: email,
    level: level,
    tier: tier,
    xp: xp,
    code: code
  });

  return {
    success: true,
    claimCode: code,
    tier: tier,
    xp: xp,
    level: level,
    message: 'Claim code generated successfully. Submit it in Bow Finish Form to receive XP.',
    autoSubmitted: false
  };
}

function generateRandomSuffix_(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function sendGauntletConfirmationEmail_(email, claimCode, tier, xp, level, gameData) {
  const subject = 'BOW Gauntlet L' + level + ' - ' + tier + ' Tier Earned';

  const scoreLine = gameData
    ? ('<li><strong>Final Score:</strong> ' + escapeHtml(
        gameData.totalProfit !== undefined && gameData.totalProfit !== null
          ? ('$' + Number(gameData.totalProfit).toFixed(2))
          : (gameData.score !== undefined ? gameData.score : '')
      ) + '</li>')
    : '';

  const htmlBody = [
    '<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8f9fa;padding:20px;">',
    '<div style="background:#1e40af;color:#fff;padding:24px;border-radius:10px 10px 0 0;">',
    '<h1 style="margin:0;font-size:26px;">Gauntlet Level ' + level + ' Complete</h1>',
    '<p style="margin:8px 0 0 0;opacity:.9;">BOW Sports Capital Mastery Layer</p>',
    '</div>',
    '<div style="background:#fff;padding:24px;border-radius:0 0 10px 10px;">',
    '<h2 style="color:#1e40af;margin-top:0;">Tier Earned: ' + escapeHtml(tier) + '</h2>',
    '<p><strong>Your Claim Code:</strong></p>',
    '<p style="font-size:22px;font-weight:700;letter-spacing:1px;color:#1e40af;">' + escapeHtml(claimCode) + '</p>',
    '<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:8px;margin:16px 0;">',
    '<p style="margin:0;"><strong>Important:</strong> Submit this code in <b>Bow Finish Form</b> to receive XP.</p>',
    '</div>',
    '<h3 style="color:#1e40af;">Results</h3>',
    '<ul style="line-height:1.8;">',
    '<li><strong>XP Available:</strong> ' + xp + '</li>',
    '<li><strong>Tier:</strong> ' + escapeHtml(tier) + '</li>',
    scoreLine,
    '</ul>',
    '<p style="margin-top:24px;"><strong>— BOW Sports Capital</strong></p>',
    '</div>',
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    name: SENDER_FALLBACK_NAME,
    replyTo: OUTLOOK_ALIAS
  });
}

function testWebAppEndpoint() {
  const testData = {
    email: 'test@example.com',
    simulationType: 'GAUNTLET',
    level: 1,
    score: 125,
    tier: 'SILVER',
    timestamp: new Date().toISOString(),
    gameData: {
      totalProfit: 125.5,
      totalSold: 250
    }
  };

  const result = processGauntletSubmission_(testData);
  Logger.log(result);
}
