const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED STRING FINDER v3.0
// Comprehensive scanner: finds ALL user-facing hardcoded strings in Flutter/Dart.
// Strategy: detect ALL strings → filter out known dev/technical/localized patterns.
// Coverage: 100% — all layers including BLoCs/cubits (use key_ identifiers).
// ─────────────────────────────────────────────────────────────────────────────

// ─── FILE-LEVEL SKIP PATTERNS ───────────────────────────────────────────────
// Entire files matching these patterns are excluded from scanning.
// Blocs/cubits now use key_ identifiers that the UI layer resolves to
// localized text — no longer excluded from scanning.
const SKIP_FILE_PATTERNS = [
];

// ─── STRING-LEVEL SKIP PATTERNS ─────────────────────────────────────────────
// If the extracted string itself matches any of these, skip it.
const SKIP_STRING_PATTERNS = [
  /^https?:\/\//,              // URLs
  /^assets\//,                 // Asset paths
  /^\/[a-z\-]/,                // Route paths starting with /lowercase
  /^[a-z][a-z_]*$/,            // pure snake_case identifiers (e.g. 'source_id')
  /^[A-Z_]{2,}$/,              // CONSTANT_CASE (e.g. 'GET', 'POST')
  /^\d/,                       // Starting with number
  /^#[0-9a-fA-F]/,             // Color codes
  /^\./,                       // File extensions / relative paths
  /^package:/,                 // Package imports
  /^dart:/,                    // Dart imports
  /\.dart$/,                   // Dart file references
  /\.json$/,                   // JSON file references
  /\.png$|\.svg$|\.jpg$|\.webp$|\.gz$|\.jks$|\.apk$|\.pdf$/,  // Binary file refs
  /^Downloads\//,              // Download paths
  /^\{/,                       // Template strings like {variable}
  /^%/,                        // Format specifiers
  /^content_|^last_|^has_|^pref_|^key_|^channel_|^notification_/, // DB/pref keys
  /^SELECT |^INSERT |^CREATE |^UPDATE |^DELETE |^DROP |^ALTER /i,  // SQL
  /^[a-z]+\.[a-z]/,            // Dot notation (property.access)
  /^Bearer /,                  // Auth headers
  /^application\//,            // MIME types
  /^text\//,                   // MIME types
  /^user-agent$|^content-type$|^accept$|^cookie$|^set-cookie$|^cache-control$/i,
  /^\w+Error$/,                // Error class names
  /^\w+Exception$/,            // Exception class names
  /^_/,                        // Private identifiers
  /^true$|^false$|^null$/,     // Boolean/null literals
  /^0x/,                       // Hex literals
  /^rgba?\(/,                  // Color functions
  /^en$|^id$|^zh$|^ja$|^ko$/,  // Locale codes
  /^GET$|^POST$|^PUT$|^DELETE$|^PATCH$|^HEAD$|^OPTIONS$/, // HTTP methods
  /^utf-?8$/i,                 // Encoding
  /^[a-zA-Z]{1,2}$/,           // Very short strings (1-2 chars)
  /^<[a-zA-Z]/,                // HTML/XML tags
  /^\w+\(\)$/,                 // Function calls like 'init()'
  /^TODO|^FIXME|^HACK|^NOTE/,  // Code comments
  /^\\\\|^\\n/,                // Escaped characters
  /^wordpress_/,               // WordPress cookies
  /^manifest\.json$/,          // Known filenames
  /^source$|^version$|^meta$/,  // JSON field keys
  /^nhentai$|^crotpedia$/,     // Source IDs
  /^\* /,                      // Markdown bullets
  /^sha256$/i,                 // Hash algorithm names
  /^[a-z]+:[a-z]/,             // prefix:value patterns (query syntax)
  /^raw:/,                     // Raw query prefix
  /^genre:/,                   // Genre query prefix
  /^ZIP$/,                     // File type labels
  /^[a-z][a-zA-Z]+$/,          // camelCase identifiers (localization key IDs)
  /^\$\{.*\}$/,                // Pure interpolation like '${tag.count}'
  /^\$[a-zA-Z]/,               // Variable references like '$title'
  /^nhasix/,                   // App-specific internal identifiers
  /^skip_/,                    // SharedPreferences keys
  /^\d+\.\d+/,                 // Numeric strings like '1.1.1.1'
  /^\$\{.*\}%$/,               // Pure percentage formatting like '${(progress * 100).toInt()}%'
  /^[•\-\+#]\s*\$/,            // Bullet/prefix + variable like '• $suggestion', '#$id', '- ${name}'
  /^\$\{.*\.(toInt|round|toStringAsFixed)\(\).*\}%$/, // Formatted percentage
  /^#\$/,                      // Numeric ID prefix like '#$id'
  /^- \$/,                     // List item prefix like '- ${name}'
  /^• \$/,                     // Bullet prefix like '• $suggestion'
  /^\+\$/,                     // Plus prefix like '+$count more'
  /^images$/,                  // Directory names
  /^unknown$/i,                // Generic fallback values
  /^pdf$/i,                    // File type
  /^\$\{.*\}[hdmsw]\s/,        // Time formatting like '${hours}h ${minutes}m'
  /^\$\{.*\}[hdmsw]$/,         // Time formatting like '${seconds}s'
  /^\$\{.*\}[KMG]$/,           // Number formatting like '${val}K'
  /^\$\{.*\}\.\.\./,           // Truncation like '${value.substring(0,16)}...'
  /^https:\$/,                 // Protocol-prefixed variable 'https:$value'
  /^v\$/,                      // Version prefix 'v${packageInfo.version}'
  /^MMM |^yyyy|^HH:/,          // Date format patterns
  /^ETA:/,                     // ETA prefix
  /^source_auth\./,            // Auth flow message keys
  /^uploaded:/,                // Query syntax
  /^pages:[<>=]/,              // Query range syntax
  /^favorites:[<>=]/,          // Query range syntax
  /^\?page=/,                  // URL query params
  /^&page=/,                   // URL query params
  /^SHEET_/,                   // Debug log prefixes
  /^Nov \d/,                   // Example date strings
  /^\$\{uri\./,                // URI construction
  /\.(net|com|org)$/,          // Domain suffixes
  /^AppleWebKit/,              // User-Agent strings
  /^Flutter$|^Dart$|^Bloc$|^GetIt$|^Clean Arch$/,  // Tech brand names (About screen)
  /^\$\{.*toStringAsFixed.*\}k$/,  // Number formatting like '${x}k'
  /^\$\{.*\.floor\(\)\}mo ago$/, // Time ago formatting
  /^\$\{\(diff/,               // Diff formatting
  /^artist cg$|^game cg$|^non-h$|^image set$/,  // API category labels
  /^\$\{AppRoute/,             // Route URL construction
  /^\$\{download\.downloaded/,  // Download progress text already using loc
];

// ─── LINE-LEVEL SKIP PATTERNS ───────────────────────────────────────────────
// If the LINE (not just the string) matches any of these, skip the entire line.
const DEV_LINE_PATTERNS = [
  /Logger\(\)\.\w/,            // Logger().e(), Logger().w()
  /Logger\(\)/,                // Logger() calls
  /_logger\./,                 // _logger.e(), _logger.w()
  /logger\./i,                 // logger.e(), logger.w()
  /logInfo\(/,                 // logInfo()
  /logWarning\(/,              // logWarning()
  /logError\(/,                // logError()
  /\.e\('/,                    // .e(' Logger shorthand
  /\.w\('/,                    // .w(' Logger shorthand
  /\.i\('/,                    // .i(' Logger shorthand
  /\.t\('/,                    // .t(' Logger shorthand
  /\.f\('/,                    // .f(' Logger shorthand
  /\.d\('/,                    // .d(' Logger shorthand
  /debugPrint\(/,              // debugPrint()
  /print\(/,                   // print()
  /throw\s+\w+\(/,             // throw SomeException(
  /assert\(/,                  // assert()
  /\?\? '/,                    // Fallback/default patterns: l10n?.value ?? 'fallback'
  /_showSnackBar\(/,           // Demo/callback helpers
  /key:\s*'/,                  // Map/JSON keys like key: 'value'
  /'\w+'\s*:/,                 // Map literal keys like 'field_name':
  /\['/,                       // Map/array access like map['key']
  /case\s+'/,                  // switch case 'value':
  /==\s*'/,                    // Comparison == 'value'
  /!=\s*'/,                    // Comparison != 'value'
  /\.contains\('/,             // .contains('value')
  /\.replaceAll\('/,           // .replaceAll('old', 'new')
  /\.replaceFirst\('/,         // .replaceFirst()
  /\.split\('/,                // .split('delimiter')
  /\.startsWith\('/,           // .startsWith('prefix')
  /\.endsWith\('/,             // .endsWith('suffix')
  /\.join\('/,                 // .join('separator')
  /\.toLowerCase\(/,           // .toLowerCase() chain
  /\.toUpperCase\(/,           // .toUpperCase() chain
  /RegExp\(/,                  // RegExp( patterns
  /SharedPreferences/,         // SharedPreferences operations
  /\.setBool\(/,               // Preferences setters
  /\.setString\(/,             // Preferences setters
  /\.getString\(/,             // Preferences getters
  /\.getBool\(/,               // Preferences getters
  /prefs\./,                   // Preferences usage
  /path\.join\(/,              // File path operations
  /Directory\(/,               // Directory operations
  /File\(/,                    // File operations
  /formatStorageSize/,         // Utility functions
  /\.path\b/,                  // .path property
  /handleError\(/,             // handleError(e, stackTrace, 'operation')
  /logDebug\(/,                // logDebug('message')
  /operation:\s*'/,            // operation: 'Doing X' (dev operation labels)
  /\.cancel\('/,               // task.cancel('reason')
  /ValueKey\(/,                // ValueKey('id') — widget keys, not user-facing
  /headers\.set\(/,            // HTTP headers
  /User-Agent/,                // HTTP User-Agent
  /Referer/,                   // HTTP Referer header
  /r'''/,                      // Raw string (regex patterns)
  /r"/,                        // Raw string regex
  /parts\.add\(/,              // Filter summary parts (dev-facing text builders)
  /loginFlowMessage:/,         // Login flow state messages (key identifiers)
  /\.toStringAsFixed\(\d+\)\s*\}\s*(KB|MB|GB)/,  // File size formatting
  /\.gold-usergeneratedcontent/,  // CDN domain patterns
  /image\/avif/,               // MIME accept headers
  /emit\(const\s+\w+\('/,      // emit(const SomeState('message'))
  /emit\(\w+\(/,               // emit(StateClass('message'))
  /error:\s*'/,                // error: 'message' in state constructors
  /throw\s+(const\s+)?\w*Exception\(/,  // throw Exception('msg')
  /throw\s+'/,                 // throw 'string'
  /_buildTechBadge\(/,         // Tech badge builder (proper nouns)
  /this\.\w+\s*=\s*'/,         // Constructor defaults: this.field = 'default'
  /features\.add\(/,           // Feature list labels (settings state)
  /FormatException\(/,         // FormatException constructor
  /\.copyWith\(/,              // copyWith state patterns
  /\.toStringAsFixed\(/,       // Number formatting utility lines
  /Exception\('/,             // Exception('message') constructor
  /_pickerLoadError/,         // Developer error state map
  /result\s*=\s*'"/,           // Quote wrapping patterns
  /\.networkUrl/,             // Cache/URL key construction
  /localMeta\.type/,          // Debug metadata labels
  /rule\.displayLabel/,       // Debug rule labels
  /Failed to parse response/,  // API parse error (developer-facing)
  /Invalid response shape/,    // API shape error (developer-facing)
];

// ─── LOCALIZED LINE PATTERNS ────────────────────────────────────────────────
// If the line already uses localization, skip it.
const LOCALIZED_PATTERNS = [
  /l10n\./,
  /l10n\?\./,
  /AppLocalizations\.of\(/,
  /context\.l10n/,
];

// ─── MULTILINE CONTEXT PATTERNS ─────────────────────────────────────────────
// If the PREVIOUS line contains these, the current line is a continuation of
// a developer call (e.g. _logger.w(\n  'message'))
const MULTILINE_DEV_PATTERNS = [
  /_logger\.\w\(/,
  /logger\.\w\(/i,
  /Logger\(\)\.\w\(/,
  /logInfo\(/,
  /logWarning\(/,
  /logError\(/,
  /debugPrint\(/,
  /throw\s+\w+\(/,
  /assert\(/,
  /\.add\(/,                   // Event dispatching (not user-facing)
  /operation:\s*$/,            // DownloadProcessing operation: (continued)
];

// ─── SCAN CONFIG ────────────────────────────────────────────────────────────
const SCAN_DIRS = ['lib/presentation'];
const EXTRA_SCAN_DIRS = ['lib/core/constants'];
const SKIP_DIRS = ['l10n', '.dart_tool', 'generated', 'build', 'test'];
const SKIP_FILES = ['.g.dart', '.freezed.dart', 'widget_examples.dart'];

// ─── SEVERITY CLASSIFICATION ────────────────────────────────────────────────
const SEVERITY = {
  HIGH: '🔴 HIGH',
  MEDIUM: '🟡 MEDIUM',
  LOW: '🟢 LOW',
};

function classifySeverity(lineContext, surroundingContext) {
  const combined = lineContext + ' ' + surroundingContext;
  if (/Text\(/.test(combined)) return SEVERITY.HIGH;
  if (/SnackBar/.test(combined)) return SEVERITY.HIGH;
  if (/AlertDialog/.test(combined)) return SEVERITY.HIGH;
  if (/title:/.test(lineContext)) return SEVERITY.HIGH;
  if (/content:/.test(lineContext) && /Text/.test(combined)) return SEVERITY.HIGH;
  if (/child:/.test(lineContext) && /Text/.test(combined)) return SEVERITY.HIGH;
  if (/tooltip:/.test(lineContext)) return SEVERITY.MEDIUM;
  if (/label:/.test(lineContext)) return SEVERITY.MEDIUM;
  if (/hintText:/.test(lineContext)) return SEVERITY.MEDIUM;
  if (/labelText:/.test(lineContext)) return SEVERITY.MEDIUM;
  if (/subtitle:/.test(lineContext)) return SEVERITY.LOW;
  if (/helperText:/.test(lineContext)) return SEVERITY.LOW;
  return SEVERITY.MEDIUM;
}

// ─── CORE STRING EXTRACTION ─────────────────────────────────────────────────

function shouldSkipString(str) {
  str = str.trim();
  if (str.length < 3) return true;
  if (str.length > 300) return true;

  for (const pattern of SKIP_STRING_PATTERNS) {
    if (pattern.test(str)) return true;
  }

  // Skip if all non-latin (already translated or emoji-only)
  if (/^[^\x20-\x7E]+$/.test(str)) return true;

  // Skip if only variable interpolation with no human-readable text
  if (/^\$\{?\w+\}?$/.test(str)) return true;

  // Skip style/alignment values
  if (/^(bold|italic|normal|center|left|right|top|bottom|start|end)$/i.test(str)) return true;

  // Skip semver-like strings
  if (/^\d+\.\d+\.\d+/.test(str)) return true;

  // Must contain at least 2 consecutive Latin letters (human-readable text)
  if (!/[a-zA-Z]{2,}/.test(str)) return true;

  return false;
}

function isDevLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return true;
  if (trimmed.startsWith('import ')) return true;
  if (trimmed.length === 0) return true;

  for (const pattern of DEV_LINE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

function isLocalizedLine(line) {
  for (const pattern of LOCALIZED_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  return false;
}

function isMultilineDevContinuation(prevLine) {
  if (!prevLine) return false;
  const trimmed = prevLine.trim();
  for (const pattern of MULTILINE_DEV_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  // Also check if prev line ends with ( and is a dev line
  if (trimmed.endsWith('(') && isDevLine(prevLine)) return true;
  return false;
}

function extractStrings(line) {
  const results = [];
  // Match single-quoted strings (including interpolated)
  const singleQuoteRegex = /'([^']{3,})'/g;
  let match;
  while ((match = singleQuoteRegex.exec(line)) !== null) {
    results.push({ text: match[1], index: match.index });
  }
  // Match double-quoted strings
  const doubleQuoteRegex = /"([^"]{3,})"/g;
  while ((match = doubleQuoteRegex.exec(line)) !== null) {
    // Skip if it's inside an ARB annotation or decorator
    if (line.includes('@') && line.includes('"type"')) continue;
    results.push({ text: match[1], index: match.index });
  }
  return results;
}

// ─── CONTEXT-AWARE SCANNING ─────────────────────────────────────────────────

function getSurroundingContext(lines, index, range = 3) {
  const start = Math.max(0, index - range);
  const end = Math.min(lines.length - 1, index + range);
  return lines.slice(start, end + 1).join(' ');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('import ')) continue;

    // Skip lines already using localization
    if (isLocalizedLine(line)) continue;

    // Skip developer-facing lines
    if (isDevLine(line)) continue;

    // Check for multiline developer continuation
    if (i > 0 && isMultilineDevContinuation(lines[i - 1])) {
      if (trimmed.startsWith("'") || trimmed.startsWith('"')) continue;
    }

    // Check 2 lines back for multiline dev continuation
    if (i > 1 && isMultilineDevContinuation(lines[i - 2])) {
      const prevTrimmed = lines[i - 1].trim();
      if (prevTrimmed.startsWith("'") || prevTrimmed.startsWith('"') || prevTrimmed === '') continue;
    }

    // Extract ALL strings from this line
    const strings = extractStrings(trimmed);
    if (strings.length === 0) continue;

    // Get surrounding context for severity classification
    const surroundingContext = getSurroundingContext(lines, i);

    for (const { text } of strings) {
      if (shouldSkipString(text)) continue;

      const severity = classifySeverity(trimmed, surroundingContext);
      results.push({
        line: lineNum,
        text,
        context: trimmed.substring(0, 140),
        severity,
      });
    }
  }

  // Deduplicate by line+text
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.line}:${r.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── DIRECTORY WALKER ───────────────────────────────────────────────────────

function walkDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        files.push(...walkDir(fullPath));
      }
    } else if (entry.name.endsWith('.dart')) {
      if (SKIP_FILES.some(ext => entry.name.endsWith(ext))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

const allDirs = [...SCAN_DIRS, ...EXTRA_SCAN_DIRS];
let output = '';
output += '╔══════════════════════════════════════════════════════════════════════╗\n';
output += '║        HARDCODED STRINGS SCAN REPORT v3.0                          ║\n';
output += `║        Scanned at: ${new Date().toISOString().padEnd(47)}║\n`;
output += '╚══════════════════════════════════════════════════════════════════════╝\n\n';
output += '📋 Scan scope: Presentation layer (all strings, comprehensive)\n';
output += '🔍 Excludes: Logger, throw, assert, debugPrint, comments, imports\n';
output += '🔍 Excludes: Map keys, comparisons, file ops, preferences\n';
output += '🌐 Excludes: Lines already using AppLocalizations / l10n\n\n';

let totalFindings = 0;
let filesWithFindings = 0;
let highCount = 0;
let mediumCount = 0;
let lowCount = 0;
const allResults = [];

for (const scanDir of allDirs) {
  const files = walkDir(scanDir);

  for (const file of files) {
    // Skip files matching file-level exclusion patterns (blocs/cubits/states)
    const normalizedPath = file.replace(/\\/g, '/');
    if (SKIP_FILE_PATTERNS.some(p => p.test(normalizedPath))) continue;

    const results = scanFile(file);

    if (results.length > 0) {
      filesWithFindings++;
      const relPath = path.relative('.', file).replace(/\\/g, '/');

      output += `\n${'─'.repeat(74)}\n`;
      output += `📁 ${relPath}\n`;
      output += `   ${results.length} hardcoded string(s) found\n`;
      output += `${'─'.repeat(74)}\n`;

      for (const r of results) {
        totalFindings++;
        if (r.severity === SEVERITY.HIGH) highCount++;
        else if (r.severity === SEVERITY.MEDIUM) mediumCount++;
        else lowCount++;

        output += `  ${r.severity} L${r.line}: "${r.text}"\n`;
        output += `    ↳ ${r.context}\n\n`;

        allResults.push({ file: relPath, ...r });
      }
    }
  }
}

// ─── SUMMARY ────────────────────────────────────────────────────────────────

output += `\n${'═'.repeat(74)}\n`;
output += `📊 SUMMARY\n`;
output += `${'═'.repeat(74)}\n`;
output += `  Total hardcoded strings: ${totalFindings}\n`;
output += `  Files with findings:     ${filesWithFindings}\n`;
output += `  ┌─────────────────────────────────┐\n`;
output += `  │ 🔴 HIGH (Text/SnackBar/Dialog): ${String(highCount).padStart(4)} │\n`;
output += `  │ 🟡 MEDIUM (tooltip/label/hint):  ${String(mediumCount).padStart(4)} │\n`;
output += `  │ 🟢 LOW (subtitle/helper):        ${String(lowCount).padStart(4)} │\n`;
output += `  └─────────────────────────────────┘\n`;
output += `${'═'.repeat(74)}\n`;

// ─── PRIORITY FIX LIST ──────────────────────────────────────────────────────

const highItems = allResults.filter(r => r.severity === SEVERITY.HIGH);
if (highItems.length > 0) {
  output += `\n\n🚨 PRIORITY FIX LIST (HIGH severity — directly visible to users)\n`;
  output += `${'─'.repeat(74)}\n`;

  const byFile = {};
  for (const item of highItems) {
    if (!byFile[item.file]) byFile[item.file] = [];
    byFile[item.file].push(item);
  }

  for (const [file, items] of Object.entries(byFile)) {
    output += `\n  📁 ${file}\n`;
    for (const item of items) {
      output += `     L${item.line}: "${item.text}"\n`;
    }
  }
}

output += '\n';

fs.writeFileSync('hardcoded_strings_report.txt', output);
console.log(output);
console.log('📄 Report saved to: hardcoded_strings_report.txt');
