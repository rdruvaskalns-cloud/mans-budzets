/* Mans Budžets 2.5 — noteikumu parsētājs Latvijas veikalu čekiem. Neveic tīkla pieprasījumus. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BudgetReceiptParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const money = v => Number(String(v).replace(/\s/g, '').replace(',', '.'));
  const toCents = n => Math.round(Number(n) * 100);
  const fromCents = n => n / 100;
  const normalizedLines = text => String(text || '')
    .replace(/\u00a0/g, ' ').replace(/[−–—]/g, '-').replace(/[×✕]/g, 'x')
    .split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const amt = '(-?\\d{1,7}[,.]\\d{2})';
  const amountEnd = new RegExp(amt + '\\s*(?:[ABCDN])?\\s*(?:EUR|€)?\\s*$', 'iu');
  const amountAnywhere = /-?\d{1,7}[,.]\d{2}/gu;
  function amountFor(s) { const m = String(s).match(amountEnd); return m ? money(m[1]) : null; }
  function dateOf(text) {
    const all = String(text).matchAll(/\b(\d{2})[.\/](\d{2})[.\/](20\d{2})\b|\b(20\d{2})-(\d{2})-(\d{2})\b/g);
    for (const m of all) {
      const [y, mo, d] = m[4] ? [Number(m[4]), Number(m[5]), Number(m[6])] : [Number(m[3]), Number(m[2]), Number(m[1])];
      const check = new Date(Date.UTC(y, mo - 1, d));
      if (check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  function storeOf(text) {
    const top = normalizedLines(text).slice(0, 30).join(' ');
    if (/b[ūu]vniec[īi]bas\s*a\s*b\s*c|optimera\s+latvija/iu.test(top)) return 'Būvniecības ABC';
    if (/\bmaxima\b/iu.test(top)) return 'Maxima';
    if (/\brimi\b/iu.test(top)) return 'Rimi';
    if (/\blidl\b/iu.test(top)) return 'Lidl';
    if (/\bdepo\b/iu.test(top)) return 'DEPO';
    const first = normalizedLines(text).find(x => /[a-zāčēģīķļņšūž]/iu.test(x) && !/^(?:SIA|Juridiskā|Jur\.|Kase|NMR|Čeks|Pirkuma summa)/iu.test(x));
    return first?.slice(0, 60) || 'Čeks';
  }
  function categoryOf(name, store) {
    const n = name.toLowerCase();
    if (/depoz[īi]ta?\s+maksa|depozits/iu.test(n)) return 'Depozīts';
    if (/degviel|benz[īi]n|d[īi]zel|diesel|motore[ļl][ļl]|autoe[ļl][ļl]|stiklu\s+šķidr|vējstikl/iu.test(n)) return 'Transports';
    if (/destil[ēe]t\w*\s+[ūu]den|pitstop|instrument|skr[ūu]v|urbj|spuldz|silikon|kr[āa]s[au]|l[īi]me|celtniec|b[ūu]vniec/iu.test(n)) return 'Sadzīves preces';
    if (/šokol|konfekt|sald[ēe]jum|sald[ēe]j|cepum|čips|chips|pringles|kaktus|salda\s+uzk|sald[ūu]m|vafel|limon|cola|kola|sulas?\s+dz[ēe]r|s[īi]rup|batoni|mošķ[īi]|peach\s*loops/iu.test(n)) return 'Saldumi un uzkodas';
    if (/ziep|šamp|mazg|t[īi]r[īi]|tualetes\s+pap[īi]r|salvet|pulver|s[ūu]kl|baterij|atkritumu\s+maiss/iu.test(n)) return 'Sadzīves preces';
    if (/aptiek|vitam|z[āa][ļl]|medikam|ibuprofen/iu.test(n)) return 'Veselība';
    if (['Būvniecības ABC', 'DEPO'].includes(store)) return 'Sadzīves preces';
    return 'Pārtika';
  }
  // Stopping at summary prevents invoice totals, VAT or loyalty lines being mistaken for items.
  const summary = /^(?:atlaides\s*:|summa\s+(?:apmaksai|bez\s+atlaides)|samaksai(?:\s+eur)?\b|kop[āa]\s+(?:apmaksai|eur)\b|tavs\s+ietaup[īi]jums\b|maks[āa]jumu\s+karte\b|apmaksa\s*\(bankas\s+karte\)|sa[ņn]emts\s+sk\b|izdots\s+sk\b|nodok[ļl]i\b)/iu;
  const discard = /^(?:SIA\b|jur\.?\s*(?:adr|adrese)|fiz\.?\s*adr|nmr\s*kods|veikals\b|kase\b|kasier|dokuments\b|dok\.?\s*nr|PVN\s+maks|šasijas|termin[āa][ļl]a|autoriz[āa]cijas|kv[īi]ts|rrn|mastercard|visa\b|klients\s*:|elektronisk[āa]\s+izdruka|maks[āa]jumu\s+karte|saglab[āa]jiet|papildus\s+depoz[īi]ta\s+maksa\s+kop[āa]|nopeln[īi]t[āa]|mans\s+rimi\s+naudas|izmantot[āa]\s+mans\s+rimi\s+nauda|ietaup[īi]jums|bankas\s+karte|skaidr[āa]\s+nauda|apmaksa|atlaide\s+ar|citas\s+akcijas|laiks\b|tirgot[āa]ja\s+id|tsi\s*:|aip\s*:|tvr\s*:|fam\s+nr|paldies|juridisk[āa]\s+adrese|kop[āa]\s*:\s*$|kas[ei]\s+nr|pirkuma\s+summa)/iu;
  const noise = /^(?:[\s\-=_.]{4,}|[A-F0-9]{20,}|\*+[\w\d-]+|\d{9,}\b)/iu;
  // Rimi: "1 gab x 2,12 EUR 2,12 C"; ABC: "1 gabals x 4,75 = 4,75 A".
  const qtyForward = /^\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\s*[xх]\s*\d+[,.]\d{2}\s*(?:EUR|€)?\s*=?\s*$/iu;
  // Maxima: "0,99 X 1 gab. 0,99 A" and weight "3,99 x 0,278 kg 1,11 A".
  const qtyReverse = /^\d+[,.]\d{2}\s*[xх]\s*\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\.?\s*=?\s*$/iu;
  const qtyForwardTail = /\s+\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\s*[xх]\s*\d+[,.]\d{2}\s*(?:EUR|€)?\s*=?\s*$/iu;
  const qtyReverseTail = /\s+\d+[,.]\d{2}\s*[xх]\s*\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\.?\s*=?\s*$/iu;
  const startingInfo = /(?:^|[^\p{L}])(?:čeks|ceks)(?=$|[^\p{L}])/iu;
  function itemsOf(text, store) {
    const lines = normalizedLines(text), items = [];
    // Screenshots often contain app title 'Čeks' AND a second 'Čeks' inside the real receipt.
    const anchors = lines.map((l, i) => (startingInfo.test(l) && !/^(?:dok\.|kv[īi]ts)/iu.test(l)) ? i : -1).filter(i => i >= 0);
    const start = anchors.length ? anchors[anchors.length - 1] : -1;
    let pending = '', last = null;
    for (let i = Math.max(0, start + 1); i < lines.length; i++) {
      const line = lines[i];
      if (summary.test(line)) break;
      if (/^(?:atlaide|atl\.)(?:\b|[.(: -])/iu.test(line)) {
        if (last) {
          const final = line.match(/gala\s+cena\s*:?[ ]*(\d+[,.]\d{2})/iu) || line.match(/cena\s+ar\s+atlaidi\s*:?[ ]*(\d+[,.]\d{2})/iu);
          const negatives = [...line.matchAll(/-\s*(\d+[,.]\d{2})/gu)];
          if (final) last.price = fromCents(toCents(money(final[1])));
          else if (negatives.length) last.price = fromCents(Math.max(0, toCents(last.price) - toCents(money(negatives[negatives.length - 1][1]))));
        }
        continue;
      }
      if (discard.test(line) || noise.test(line) || /^\d{4}-\d{2}-\d{2}\b/u.test(line) || /^\d{2}[.\/]\d{2}[.\/]\d{4}\b/u.test(line)) continue;
      const end = line.match(amountEnd);
      if (!end) {
        if (/[\p{L}]/u.test(line) && !/^(?:čeks|ceks|\d+\s*[xх]\s*\d+)\b/iu.test(line) && line.length < 130) pending = `${pending} ${line}`.trim().slice(-180);
        continue;
      }
      const price = money(end[1]);
      if (!Number.isFinite(price) || price <= 0 || price > 10000) continue;
      const before = line.slice(0, end.index).trim();
      const isQuantity = qtyForward.test(before) || qtyReverse.test(before);
      let name = (isQuantity ? pending : `${pending} ${before}`).trim();
      // Handle rows containing both a product name and its quantity/price.
      name = name.replace(/^\d{5,14}\s+/u, '').replace(qtyForwardTail, '').replace(qtyReverseTail, '')
        .replace(/\s*=\s*$/u, '').replace(/\s+/g, ' ').trim();
      pending = '';
      if (!name || !/[\p{L}]/u.test(name) || /^(?:atlaide|kop[āa]|pvn|summa|kase|rimi|maxima|eur)$/iu.test(name)) continue;
      // Remove OCR-extracted spillover from section headings rather than inventing an item.
      if (/\b(?:nodok[ļl]i|pvn\s*21|tavs\s+ietaup[īi]jums)\b/iu.test(name)) continue;
      const item = { name, price: fromCents(toCents(price)), category: categoryOf(name, store) };
      items.push(item); last = item;
    }
    return items;
  }
  function paidTotalOf(text) {
    const lines = normalizedLines(text);
    const priorities = [
      /^summa\s+apmaksai\b/iu,
      /^samaksai(?:\s+eur)?\b/iu,
      /^kop[āa]\s+(?:eur|apmaksai)\b/iu,
      /^apmaksa\s*\(bankas\s+karte\)/iu,
      /^kop[āa]\s*:/iu,
      /^pirkuma\s+summa\b/iu
    ];
    for (const re of priorities) for (const line of lines) if (re.test(line)) {
      const numbers = [...line.matchAll(amountAnywhere)];
      if (numbers.length) return money(numbers[numbers.length - 1][0]);
    }
    return null;
  }
  function moneyFromLines(lines, regex) {
    for (const l of lines) if (regex.test(l)) {
      const value = amountFor(l);
      if (value !== null) return Math.abs(value);
    }
    return null;
  }
  function parse(text) {
    const lines = normalizedLines(text), store = storeOf(text), items = itemsOf(text, store);
    const cashReceived = moneyFromLines(lines, /^sa[ņn]emts\s+(?:sk\.?\s*)?nauda\b/iu);
    const change = moneyFromLines(lines, /^(?:izdots\s+(?:sk\.?\s*)?nauda|atlikums)\b/iu);
    const loyalty = moneyFromLines(lines, /^izmantot[āa]\s+mans\s+rimi\s+nauda\b/iu) || 0;
    const bank = lines.some(l => /(?:apmaksa\s*\(bankas\s+karte\)|bankas\s+karte|maks[āa]jumu\s+karte|mastercard|visa)/iu.test(l));
    const cash = cashReceived !== null || lines.some(l => /(?:skaidr[āa]\s+nauda|sa[ņn]emts\s+sk|izdots\s+sk)/iu.test(l));
    const paidTotal = paidTotalOf(text);
    const expected = paidTotal === null ? null : toCents(paidTotal) + toCents(loyalty);
    const found = items.reduce((sum, x) => sum + toCents(x.price), 0);
    const discrepancyCents = expected === null ? null : found - expected;
    return { store, date: dateOf(text), paidTotal, items, loyalty: fromCents(toCents(loyalty)), cashReceived, change,
      account: cash ? 'cash' : bank ? 'bank' : null,
      discrepancyCents, reconciled: expected !== null && items.length > 0 && Math.abs(discrepancyCents) <= 1 };
  }
  function allocateLoyaltyCents(prices, credit) {
    if (prices.some(v => !Number.isInteger(v) || v < 0) || !Number.isInteger(credit) || credit < 0) throw Error('Nederīgas summas.');
    const total = prices.reduce((a, b) => a + b, 0);
    if (credit > total) throw Error('Lojalitātes summa pārsniedz preču vērtību.');
    if (!total || !credit) return prices.map(() => 0);
    const allocation = prices.map((p, i) => ({ i, value: Math.floor(p * credit / total), frac: p * credit / total % 1, limit: p }));
    let remaining = credit - allocation.reduce((s, x) => s + x.value, 0);
    for (const x of [...allocation].sort((a, b) => b.frac - a.frac || a.i - b.i)) {
      if (remaining <= 0) break;
      if (x.value < x.limit) { x.value++; remaining--; }
    }
    if (remaining) throw Error('Neizdevās sadalīt lojalitātes summu.');
    return allocation.map(x => x.value);
  }
  return { parse, itemsOf, paidTotalOf, dateOf, storeOf, categoryOf, normalizedLines, allocateLoyaltyCents };
});
