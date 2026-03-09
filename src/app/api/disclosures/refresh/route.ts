import { db } from "@/lib/db";

type AnyObj = Record<string, unknown>;

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function pickString(obj: AnyObj, keys: string[]): string | null {
  for (const k of keys) {
    const v = asString(obj[k]);
    if (v) return v;
  }
  return null;
}

function normalizeItem(raw: unknown) {
  const base =
    raw && typeof raw === "object" && "TDnet" in (raw as AnyObj)
      ? (((raw as AnyObj).TDnet as AnyObj) ?? {})
      : ((raw as AnyObj) ?? {});

  const code = pickString(base, ["company_code", "stock_code", "code", "security_code"]);
  const companyName = pickString(base, ["company_name", "name"]);
  const title = pickString(base, ["title", "document_title", "subject"]);
  const url = pickString(base, ["document_url", "url", "link"]);
  const pdfUrl = pickString(base, ["pdf_url", "document_url", "url", "link"]);
  const disclosedAt = pickString(base, ["pubdate", "published_at", "published", "date", "datetime"]);

  const extId =
    pickString(base, ["id", "external_id"]) ||
    [code ?? "", title ?? "", disclosedAt ?? "", url ?? ""].join("|");

  return {
    code,
    companyName,
    title,
    url,
    pdfUrl,
    disclosedAt,
    extId,
  };
}

export async function POST() {
  try {
    const watchRows = db.prepare(`
      SELECT code
      FROM watchlist
      ORDER BY created_at DESC, code ASC
    `).all() as Array<{ code: string }>;

    const codes = [...new Set(
      watchRows
        .map((r) => String(r.code || "").trim().toUpperCase())
        .filter(Boolean)
    )];

    if (codes.length === 0) {
      return Response.json({
        ok: true,
        inserted: 0,
        skipped: 0,
        message: "codes not found in watchlist"
      });
    }

    const joined = codes.join("-");
    const url = `https://webapi.yanoshin.jp/webapi/tdnet/list/${joined}.json2?limit=300`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "yahoo-board-follow-web/1.0" }
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `tdnet fetch failed: ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const data = await res.json().catch(() => null) as AnyObj | null;
    const items = Array.isArray(data?.items) ? data!.items : [];

    let inserted = 0;
    let skipped = 0;

    const insertDisclosure = db.prepare(`
      INSERT OR IGNORE INTO disclosures (
        code, title, url, pdf_url, disclosed_at, source, external_id
      ) VALUES (
        @code, @title, @url, @pdf_url, @disclosed_at, @source, @external_id
      )
    `);

    const upsertCompany = db.prepare(`
      INSERT INTO companies (code, name, created_at, updated_at)
      VALUES (@code, @name, datetime('now'), datetime('now'))
      ON CONFLICT(code) DO UPDATE SET
        name = COALESCE(excluded.name, companies.name),
        updated_at = datetime('now')
    `);

    const tx = db.transaction((rows: unknown[]) => {
      for (const row of rows) {
        const x = normalizeItem(row);

        if (!x.code || !x.title || !x.extId) {
          skipped += 1;
          continue;
        }

        if (x.companyName) {
          upsertCompany.run({ code: x.code, name: x.companyName });
        }

        const info = insertDisclosure.run({
          code: x.code,
          title: x.title,
          url: x.url,
          pdf_url: x.pdfUrl,
          disclosed_at: x.disclosedAt,
          source: "yanoshin_tdnet",
          external_id: x.extId,
        });

        if (info.changes > 0) inserted += 1;
        else skipped += 1;
      }
    });

    tx(items);

    return Response.json({
      ok: true,
      fetched: items.length,
      inserted,
      skipped,
      codes: codes.length,
      source: "yanoshin_tdnet"
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
