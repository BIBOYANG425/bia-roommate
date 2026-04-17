/**
 * One-shot applier for reviewed WeChat-ingest SQL files.
 *
 * Parses each `insert into <table> (...) values (...);` line, extracts the
 * string/null literal args (handling Postgres-style '' escaped quotes), and
 * calls supabase.from(table).insert({...}) with service-role auth.
 *
 * Stops on first failure and prints a line number so the SQL can be edited
 * and re-run from there. Not a general-purpose SQL executor.
 *
 * Usage: tsx scripts/apply-ingest-sql.ts <sql-file>
 */
import { readFileSync } from 'node:fs'
import { supabase } from '../src/db/client.js'

const INSERT_RX =
  /^insert into (\w+)\s*\(([^)]+)\)\s*values\s*\((.*)\);$/i

// Parse the VALUES list: supports string literals ('...') with '' escapes, and `null`.
function parseValues(values: string): Array<string | null> {
  const out: Array<string | null> = []
  let i = 0
  const n = values.length
  while (i < n) {
    while (i < n && /\s|,/.test(values[i])) i++
    if (i >= n) break
    if (values[i] === "'") {
      i++
      let buf = ''
      while (i < n) {
        if (values[i] === "'" && values[i + 1] === "'") {
          buf += "'"
          i += 2
        } else if (values[i] === "'") {
          i++
          break
        } else {
          buf += values[i++]
        }
      }
      out.push(buf)
    } else {
      let buf = ''
      while (i < n && values[i] !== ',') buf += values[i++]
      const tok = buf.trim()
      out.push(tok.toLowerCase() === 'null' ? null : tok)
    }
  }
  return out
}

async function main() {
  const sqlPath = process.argv[2]
  if (!sqlPath) {
    console.error('Usage: tsx scripts/apply-ingest-sql.ts <sql-file>')
    process.exit(1)
  }
  const content = readFileSync(sqlPath, 'utf8')
  const lines = content.split('\n')

  let applied = 0
  let skipped = 0
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim()
    if (!line || line.startsWith('--')) {
      skipped++
      continue
    }
    const m = line.match(INSERT_RX)
    if (!m) {
      console.error(`L${idx + 1}: unparseable: ${line.slice(0, 80)}...`)
      process.exit(1)
    }
    const table = m[1]
    const cols = m[2].split(',').map((s) => s.trim())
    const vals = parseValues(m[3])
    if (cols.length !== vals.length) {
      console.error(`L${idx + 1}: column/value count mismatch (${cols.length} vs ${vals.length})`)
      process.exit(1)
    }
    const row: Record<string, string | null> = {}
    for (let j = 0; j < cols.length; j++) row[cols[j]] = vals[j]
    const { error } = await supabase.from(table).insert(row)
    if (error) {
      console.error(`L${idx + 1}: insert into ${table} failed:`, error.message)
      console.error('row:', JSON.stringify(row, null, 2))
      process.exit(1)
    }
    applied++
    if (applied % 25 === 0) console.log(`[apply] ${applied} rows...`)
  }
  console.log(`[apply] done: ${applied} rows applied, ${skipped} comment/blank lines`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
