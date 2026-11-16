/* Mans Budžets 2.4: offline, rule-based Latvian receipt parser. No data transmission. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BudgetReceiptParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = v => Number(String(v).replace(/\s/g, '').replace(',', '.'));
  const normalizedLines = text => String(text || '').replace(/\u00a0/g, ' ').replace(/[−–]/g, '-').split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const amountEnd = /(-?\d{1,7}[,.]\d{2})\s*(?:[ABCN])?\s*(?:EUR|€)?\s*$/iu;
  const amountIn = /-?\d{1,7}[,.]\d{2}/g;
  const dates = /\b(\d{2})[.\/-](\d{2})[.\/-](20\d{2})\b|\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  const amountFor = line => {
    const m = String(line).match(amountEnd);
    return m ? money(m[1]) : null;
  };
  function dateOf(text) {
    for (const m of String(text).matchAll(dates)) {
      const [y, mo, d] = m[4] ? [Number(m[4]), Number(m[5]), Number(m[6])] : [Number(m[3]), Number(m[2]), Number(m[1])];
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d)
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  function storeOf(text) {
    const header = normalizedLines(text).slice(0, 20).join(' ');
    if (/b[ūu]vniec[īi]bas\s*a\s*b\s*c|optimera\s+latvija/iu.test(header)) return 'Būvniecības ABC';
    if (/\bmaxima\b/iu.test(header)) return 'Maxima';
    if (/\brimi\b/iu.test(header)) return 'Rimi';
    if (/\blidl\b/iu.test(header)) return 'Lidl';
    if (/\bdepo\b/iu.test(header)) return 'DEPO';
    const first = normalizedLines(text).find(x => /[a-zāčēģīķļņšūž]/iu.test(x) && !/^(SIA|Juridiskā|Jur\.|Kase|NMR)/iu.test(x));
    return first ? first.slice(0, 60) : 'Čeks';
  }
  function categoryOf(name, store) {
    const n = name.toLowerCase();
    if (/depoz[īi]ta\s+maksa/iu.test(n)) return 'Depozīts';
    if (/degviel|benz[īi]n|d[īi]zel|diesel|motore[ļl][ļl]|auto\s+e[ļl][ļl]|stiklu\s+šķidr|vējstikl/iu.test(n)) return 'Transports';
    if (/destil[ēe]t[sa]?\s+[ūu]den|pitstop|instrument|skr[ūu]v|urbj|spuldz|silikon|kr[āa]s[au]|l[īi]me|cau ru l|c[īi]m[du]/iu.test(n)) return 'Sadzīves preces';
    if (/šokol|konfekt|sald|cepum|čips|chips|limon|kola|cola|sulas?\s+dz[ēe]r|batoni|sald[ēe]j|vafele/iu.test(n)) return 'Saldumi un uzkodas';
    if (/ziep|šamp|mazg|t[īi]r[īi]|tualetes\s+pap[īi]r|salvet|pulver|s[ūu]kl|baterij|atkritumu\s+maiss/iu.test(n)) return 'Sadzīves preces';
    if (/aptiek|vitam|z[āa][ļl]|medikam|ibuprofen/iu.test(n)) return 'Veselība';
    if (['Būvniecības ABC', 'DEPO'].includes(store)) return 'Sadzīves preces';
    return 'Pārtika';
  }
  const isPaidLine = line => /^(?:summa\s+apmaksai|samaksai(?:\s+eur)?|kop[āa]\s+(?:eur|apmaksai)|apmaksa\s*\(|kop[āa]\s*:)/iu.test(line);
  const isSummaryLine = line => isPaidLine(line) || /^(?:summa\s+bez\s+atlaides|atlaides\s*:|tavs\s+ietaup[īi]jums|nodok[ļl]|bez\s+pvn|pvn\s*\d|sa[ņn]emts\s+sk|izdots\s+sk|kop[āa]\s+apmaksai)/iu.test(line);
  const isDiscardLine = line => /^(?:SIA\b|jur\.?\s*(?:adr|adrese)|fiz\.?\s*adr|nmr\s*kods|veikals\b|kase\b|kasier|dokuments\b|dok\.?\s*nr|PVN\s+maks|šasijas|termin[āa][ļl]a|autoriz[āa]cijas|kv[īi]ts|rrn|mastercard|visa\b|klients\s*:|elektronisk[āa]\s+izdruka|maks[āa]jumu\s+karte|saglab[āa]jiet|papildus\s+depoz[īi]ta\s+maksa\s+kop[āa]|nopeln[īi]t[āa]|mans\s+rimi\s+naudas|izmantot[āa]\s+mans\s+rimi\s+nauda|ietaup[īi]jums|izmantota\s+lojalit|bankas\s+karte|skaidr[āa]\s+nauda|apmaksa|atlaide\s+ar|citas\s+akcijas|laiks\b|tirgot[āa]ja\s+id|tsi\s*:|aip\s*:|tvr\s*:|fam\s+nr|paldies)/iu.test(line)
    || /^\s*[\-=_]{4,}/u.test(line) || /^[0-9a-f]{20,}$/iu.test(line)
    || /^(?:\*+[\w-]+|\d{4,}[\w\d-]*|\d{2}[.\/-]\d{2}[.\/-]20\d{2})(?:\s+\d{1,2}:\d{2}.*)?$/iu.test(line);
  const quantityOnly = [
    /^\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\s*[x×]\s*\d+[,.]\d{2}\s*(?:EUR|€)?\s*=?\s*$/iu,
    /^\d+[,.]\d{2}\s*[x×]\s*\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\.?\s*=?\s*$/iu
  ];
  const tailQuantity = /\s+\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\s*[x×]\s*\d+[,.]\d{2}\s*(?:EUR|€)?\s*=?\s*$/iu;
  const tailQuantityReverse = /\s+\d+[,.]\d{2}\s*[x×]\s*\d+(?:[,.]\d+)?\s*(?:gab(?:als|ali|\.)?|kg|g|l|ml)?\.?\s*=?\s*$/iu;
  function itemsOf(text, store) {
    const lines = normalizedLines(text), rows = [];
    let start = lines.findIndex(line => /(?:^|[^\p{L}])(?:čeks|ceks)(?=$|[^\p{L}])/iu.test(line) && !/^(dok\.|kv[īi]ts)/iu.test(line));
    if (start < 0) start = -1;
    let pending = '', last = null;
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (isSummaryLine(line)) break;
      if (/^(?:atlaide|atl\.)(?:\b|[.(: -])/iu.test(line)) {
        if (last) {
          const final = line.match(/gala\s+cena\s*:?[ ]*(\d+[,.]\d{2})/iu);
          const negatives = [...line.matchAll(/-\s*(\d+[,.]\d{2})/g)];
          if (final) last.price = round(money(final[1]));
          else if (negatives.length) last.price = round(Math.max(0, last.price - money(negatives[negatives.length - 1][1])));
        }
        continue;
      }
      if (isDiscardLine(line) || /\b(?:PVN\s+21%|kop[āa]\s+EUR|atlaides\s+kop[āa])\b/iu.test(line)) continue;
      const end = line.match(amountEnd);
      if (!end) {
        if (/[a-zāčēģīķļņšūž]/iu.test(line) && !/^(?:čeks|ceks)\b/iu.test(line) && line.length <= 115 && !/^(?:[^\p{L}]+|(?:\w+\s+)?kods:)$/iu.test(line)) pending = `${pending} ${line}`.trim().slice(-160);
        continue;
      }
      const price = money(end[1]);
      if (!Number.isFinite(price) || price < 0 || price > 10000) continue;
      const before = line.slice(0, end.index).trim();
      const qtyOnly = quantityOnly.some(re => re.test(before));
      let name = qtyOnly ? pending : `${pending} ${before}`.trim();
      pending = '';
      name = name.replace(/^\d{5,14}\s+/u, '')
        .replace(tailQuantity, '').replace(tailQuantityReverse, '')
        .replace(/\s*=\s*$/u, '').replace(/\s+/g, ' ').trim();
      if (!name || !/[a-zāčēģīķļņšūž]/iu.test(name) || /^(?:atlaide|kop[āa]|pvn|summa|kase|rimi|maxima)$/iu.test(name)) continue;
      const item = { name, price: round(price), category: categoryOf(name, store) };
      rows.push(item);last = item;
    }
    return rows;
  }
  function paidTotalOf(text) {
    const lines = normalizedLines(text);
    for (const pattern of [/^summa\s+apmaksai\b/iu, /^samaksai(?:\s+eur)?\b/iu, /^kop[āa]\s+(?:eur|apmaksai)\b/iu, /^apmaksa\s*\(bankas\s+karte\)/iu, /^kop[āa]\s*:/iu]) {
      for (const line of lines) if (pattern.test(line)) {
        const found = [...line.matchAll(amountIn)];
        if (found.length) return money(found[found.length - 1][0]);
      }
    }
    return null;
  }
  function moneyFromLines(lines, pattern) {
    for (const line of lines) if (pattern.test(line)) {
      const value = amountFor(line);
      if (value !== null) return Math.abs(value);
    }
    return null;
  }
  function parse(text) {
    const lines = normalizedLines(text), store = storeOf(text), items = itemsOf(text, store);
    const cashReceived = moneyFromLines(lines, /^sa[ņn]emts\s+(?:sk\.?\s*)?nauda\b/iu);
    const change = moneyFromLines(lines, /^izdots\s+(?:sk\.?\s*)?nauda\b/iu);
    const loyalty = moneyFromLines(lines, /^izmantot[āa]\s+mans\s+rimi\s+nauda\b/iu) || 0;
    const bank = lines.some(line => /(?:apmaksa\s*\(bankas\s+karte\)|bankas\s+karte|maks[āa]jumu\s+karte|mastercard|visa)/iu.test(line));
    const cash = cashReceived !== null || lines.some(line => /(?:skaidr[āa]\s+nauda|sa[ņn]emts\s+sk|izdots\s+sk)/iu.test(line));
    return { store, date: dateOf(text), paidTotal: paidTotalOf(text), items, loyalty: round(loyalty),
      cashReceived, change, account: cash ? 'cash' : bank ? 'bank' : null };
  }
  // Proportional allocation of a loyalty payment in integer cents; remainder-safe.
  function allocateLoyaltyCents(lineCents, credit) {
    if (lineCents.some(n => !Number.isInteger(n) || n < 0) || !Number.isInteger(credit) || credit < 0) throw new Error('Nederīgas summas.');
    const sum = lineCents.reduce((a, b) => a + b, 0);
    if (credit > sum) throw new Error('Atlaide nevar pārsniegt preču summu.');
    if (!credit || !sum) return lineCents.map(() => 0);
    const q = lineCents.map((price, index) => {
      const share = price * credit / sum;
      return { index, value: Math.floor(share), remainder: share % 1, limit: price };
    });
    let left = credit - q.reduce((a, x) => a + x.value, 0);
    for (const e of [...q].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
      if (left <= 0) break;
      if (e.value < e.limit) { e.value++; left--; }
    }
    if (left) throw new Error('Neizdevās sadalīt atlaidi.');
    return q.map(x => x.value);
  }
  return { parse, itemsOf, paidTotalOf, dateOf, storeOf, categoryOf, normalizedLines, allocateLoyaltyCents };
});
