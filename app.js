/* Mans Budžets 2.6 — grouped receipt history, draft editing and atomic saving.
   Data remain under the original mansBudzetsV1 key; pre-2.6 receipts are supported. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'mansBudzetsV1';
  const money = n => new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(n);
  const categories = ['Pārtika','Saldumi un uzkodas','Ēšana ārpus mājas','Mājoklis','Komunālie maksājumi','Transports','Veselība','Sadzīves preces','Depozīts','Izklaide','Apģērbs','Abonementi','Alga','Papildu ienākumi','Citi'];
  const receiptCategories = categories.filter(c => c !== 'Alga' && c !== 'Papildu ienākumi');
  const roundCents = n => Math.round(Number(n) * 100);
  const fromCents = n => n / 100;
  const today = new Date();
  const localDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const defaultState = () => ({ initial: { bank: 0, cash: 0 }, transactions: [] });
  let state;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    state = stored && Array.isArray(stored.transactions) && stored.initial ? stored : defaultState();
  } catch { state = defaultState(); }
  // Set the new state only when the entire JSON record was successfully written.
  function persist(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; return true; }
    catch { alert('Datus neizdevās saglabāt. Pārbaudi tālruņa brīvo vietu un izveido rezerves kopiju.'); return false; }
  }
  $('month').value = localDate(today).slice(0, 7);
  $('date').value = localDate(today);
  $('category').replaceChildren(...categories.map(c => new Option(c, c)));
  $('initialBank').value = state.initial.bank;
  $('initialCash').value = state.initial.cash;
  $('type').onchange = () => {
    $('accountLabel').textContent = $('type').value === 'transfer' ? 'No konta (uz otru kontu)' : 'Konts';
    $('category').disabled = $('type').value === 'transfer';
  };
  $('add').onclick = () => {
    const amount = fromCents(roundCents($('amount').value));
    const desc = $('description').value.trim();
    const date = $('date').value;
    if (!$('amount').value || !Number.isFinite(amount) || amount <= 0 || !validDate(date)) {
      $('notice').textContent = 'Ievadi derīgu datumu un pozitīvu summu.'; return;
    }
    const transaction = { id: crypto.randomUUID(), date, description: desc || 'Bez apraksta', amount,
      type: $('type').value, category: $('category').value, account: $('account').value };
    if (!persist({ ...state, transactions: [...state.transactions, transaction] })) return;
    $('amount').value = ''; $('description').value = ''; $('notice').textContent = 'Saglabāts!'; render();
  };
  $('saveInitial').onclick = () => {
    const bank = Number($('initialBank').value), cash = Number($('initialCash').value);
    if (!Number.isFinite(bank) || !Number.isFinite(cash)) return alert('Nederīgs atlikums');
    if (persist({ ...state, initial: { bank, cash } })) render();
  };
  $('month').onchange = render;
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00');
    return !Number.isNaN(d.getTime()) && localDate(d) === value;
  }
  function receiptStore(t) {
    if (t.receiptStore && typeof t.receiptStore === 'string') return t.receiptStore;
    const desc = String(t.description || '');
    const marker = desc.indexOf(': ');
    return marker > 0 ? desc.slice(0, marker) : 'Čeks';
  }
  function receiptItemName(t) {
    if (t.receiptItemName && typeof t.receiptItemName === 'string') return t.receiptItemName;
    const desc = String(t.description || '');
    const prefix = receiptStore(t) + ': ';
    return desc.startsWith(prefix) ? desc.slice(prefix.length) : desc || 'Prece';
  }
  function groupedHistory(month) {
    const entries = new Map();
    state.transactions.forEach((t, index) => {
      if (typeof t.date !== 'string' || !t.date.startsWith(month)) return;
      const isReceipt = t.type === 'expense' && typeof t.receiptId === 'string' && !!t.receiptId;
      const key = isReceipt ? `receipt:${t.receiptId}` : `transaction:${t.id || index}`;
      if (!entries.has(key)) entries.set(key, { isReceipt, id: isReceipt ? t.receiptId : t.id, items: [], date: t.date, order: index });
      entries.get(key).items.push(t);
    });
    return [...entries.values()].sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order);
  }
  function addText(parent, tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }
  function drawHistory(month) {
    const history = $('history'); history.replaceChildren();
    const entries = groupedHistory(month);
    if (!entries.length) { addText(history, 'p', 'Šajā mēnesī nav darījumu.', 'muted'); return; }
    for (const entry of entries) {
      if (entry.isReceipt) {
        const store = receiptStore(entry.items[0]);
        const totalCents = entry.items.reduce((sum, t) => sum + roundCents(t.amount), 0);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'history-receipt';
        button.setAttribute('aria-label', `Atvērt čeku: ${store}, ${entry.date}, ${money(fromCents(totalCents))}`);
        const left = document.createElement('span'); left.className = 'history-main';
        addText(left, 'strong', `🧾 ${store}`);
        addText(left, 'small', `${entry.date} · ${entry.items.length} ${entry.items.length === 1 ? 'pozīcija' : 'pozīcijas'} · Apskatīt / rediģēt`, 'muted');
        const right = document.createElement('span'); right.className = 'history-amount';
        addText(right, 'strong', '−' + money(fromCents(totalCents)));
        addText(right, 'span', '›', 'history-arrow');
        button.append(left, right);
        button.onclick = () => openReceipt(entry.id);
        history.append(button);
      } else {
        const t = entry.items[0];
        const row = document.createElement('div'); row.className = 'history-single';
        const info = document.createElement('span'); info.className = 'history-main';
        addText(info, 'strong', t.description || 'Bez apraksta');
        addText(info, 'small', `${t.date} · ${t.type === 'transfer' ? 'Pārskaitījums' : t.category || 'Citi'}`, 'muted');
        const right = document.createElement('span'); right.className = 'history-actions';
        addText(right, 'strong', `${t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '↔'}${money(t.amount)}`);
        const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Dzēst'; del.className = 'danger small-action';
        del.setAttribute('aria-label', `Dzēst darījumu ${t.description}`);
        del.onclick = () => {
          if (!confirm('Dzēst šo darījumu?')) return;
          if (persist({ ...state, transactions: state.transactions.filter(x => x !== t) })) render();
        };
        right.append(del); row.append(info, right); history.append(row);
      }
    }
  }
  function render() {
    let bank = roundCents(state.initial.bank || 0), cash = roundCents(state.initial.cash || 0);
    let inc = 0, exp = 0;
    const group = new Map(), month = $('month').value;
    for (const t of state.transactions) {
      const amount = roundCents(t.amount);
      if (!Number.isFinite(amount)) continue;
      const isBank = t.account === 'bank';
      if (t.type === 'transfer') { bank += isBank ? -amount : amount; cash += isBank ? amount : -amount; }
      else if (t.type === 'income') { if (isBank) bank += amount; else cash += amount; }
      else if (t.type === 'expense') { if (isBank) bank -= amount; else cash -= amount; }
      if (typeof t.date !== 'string' || !t.date.startsWith(month)) continue;
      if (t.type === 'income') inc += amount;
      if (t.type === 'expense') { exp += amount; group.set(t.category || 'Citi', (group.get(t.category || 'Citi') || 0) + amount); }
    }
    $('bank').textContent = money(fromCents(bank)); $('cash').textContent = money(fromCents(cash));
    $('income').textContent = money(fromCents(inc)); $('expense').textContent = money(fromCents(exp));
    $('net').textContent = money(fromCents(inc - exp));
    const groups = [...group.entries()].sort((a, b) => b[1] - a[1]);
    $('categories').replaceChildren();
    for (const [name, value] of groups) {
      const row = document.createElement('div'); row.className = 'row';
      addText(row, 'span', name); addText(row, 'b', money(fromCents(value))); $('categories').append(row);
    }
    $('tip').textContent = groups.length && exp > 0 ?
      `Lielākā izdevumu kategorija: ${groups[0][0]} (${money(fromCents(groups[0][1]))}, ${Math.round(groups[0][1] / exp * 100)}% no izdevumiem). Pārskati šīs kategorijas pirkumus, lai atrastu ietaupījuma iespējas.` :
      'Šajā mēnesī vēl nav izdevumu.';
    const canvas = $('chart'), ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    groups.slice(0, 6).forEach(([name, value], i) => {
      ctx.fillStyle = '#147a63'; ctx.fillRect(5, i * 35 + 5, Math.max(2, value / (groups[0]?.[1] || 1) * 250), 22);
      ctx.fillStyle = '#193a33'; ctx.font = '14px system-ui';
      ctx.fillText(`${name}: ${money(fromCents(value))}`, 265, i * 35 + 21);
    });
    drawHistory(month);
  }

  /* Editing uses only a detached draft until Save. Cancel/close never changes data. */
  let draft = null;
  const modal = $('historyReceiptDialog');
  const receiptRows = $('historyReceiptItems');
  function newInput(labelText, value, type = 'text', mode) {
    const label = document.createElement('label'); label.className = 'edit-field';
    addText(label, 'span', labelText);
    const input = document.createElement('input'); input.type = type; input.value = value; if (mode) input.inputMode = mode;
    label.append(input); return { label, input };
  }
  const formatCents = cents => (cents / 100).toFixed(2);
  // Strict decimal parsing prevents Number('') from accidentally meaning zero.
  function parseAmount(value) {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    const [whole, decimals = ''] = text.split('.');
    const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
  }
  function openReceipt(id) {
    const original = state.transactions.filter(t => t.type === 'expense' && t.receiptId === id);
    if (!original.length) return;
    const first = original[0];
    const loyalty = original.reduce((sum, t) => sum + roundCents(t.receiptLoyaltyApplied || 0), 0);
    draft = {
      id, store: receiptStore(first), date: first.date, account: first.account === 'cash' ? 'cash' : 'bank',
      loyaltyText: formatCents(loyalty), fingerprint: first.receiptFingerprint || '',
      items: original.map(t => ({ id: t.id, name: receiptItemName(t), category: t.category || 'Citi',
        priceText: formatCents(Number.isFinite(t.receiptOriginalPrice) ? roundCents(t.receiptOriginalPrice) :
          roundCents(t.amount) + roundCents(t.receiptLoyaltyApplied || 0)) }))
    };
    $('historyReceiptStore').value = draft.store;
    $('historyReceiptDate').value = draft.date;
    $('historyReceiptAccount').value = draft.account;
    $('historyReceiptLoyalty').value = draft.loyaltyText;
    $('historyReceiptError').textContent = '';
    drawReceiptDraft();
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }
  function draftValidation() {
    if (!draft) return { valid: false, error: '' };
    const prices = draft.items.map(item => parseAmount(item.priceText));
    const loyalty = parseAmount(draft.loyaltyText);
    const sum = prices.reduce((a, b) => a + (b || 0), 0);
    const paid = loyalty === null ? null : sum - loyalty;
    const valid = !!draft.store.trim() && validDate(draft.date) && ['bank', 'cash'].includes(draft.account) &&
      draft.items.length > 0 && draft.items.every((item, i) => item.name.trim() && receiptCategories.includes(item.category) && prices[i] !== null && prices[i] >= 0) &&
      prices.some(n => n > 0) && loyalty !== null && loyalty <= sum;
    return { valid, prices, loyalty, sum, paid };
  }
  function showDraftSummary() {
    if (!draft) return;
    draft.store = $('historyReceiptStore').value;
    draft.date = $('historyReceiptDate').value;
    draft.account = $('historyReceiptAccount').value;
    draft.loyaltyText = $('historyReceiptLoyalty').value;
    const v = draftValidation();
    $('historyReceiptSubtotal').textContent = money(fromCents(v.sum));
    $('historyReceiptLoyaltySum').textContent = v.loyalty === null ? '—' : '−' + money(fromCents(v.loyalty));
    $('historyReceiptTotal').textContent = v.paid === null || v.paid < 0 ? '—' : money(fromCents(v.paid));
    $('historyReceiptSave').disabled = !v.valid;
    $('historyReceiptHint').textContent = v.valid ? 'Saglabājot pārrēķināsies kopsumma, kategorijas un konta atlikums.' :
      'Pārbaudi preču nosaukumus, cenas, datumu un lojalitātes naudu. Tukšas vai nederīgas vērtības saglabāt nevar.';
  }
  function drawReceiptDraft() {
    receiptRows.replaceChildren();
    if (!draft) return;
    for (const [i, item] of draft.items.entries()) {
      const row = document.createElement('div'); row.className = 'receipt-edit-item';
      const header = document.createElement('div'); header.className = 'receipt-edit-item-title';
      addText(header, 'strong', `Prece ${i + 1}`);
      const del = document.createElement('button'); del.type = 'button'; del.className = 'danger small-action'; del.textContent = 'Dzēst preci';
      del.onclick = () => { draft.items.splice(i, 1); drawReceiptDraft(); };
      header.append(del); row.append(header);
      const name = newInput('Nosaukums', item.name);
      name.input.oninput = () => { item.name = name.input.value; showDraftSummary(); };
      const price = newInput('Cena pēc atlaidēm, pirms lojalitātes (€)', item.priceText, 'text', 'decimal');
      price.input.oninput = () => { item.priceText = price.input.value; showDraftSummary(); };
      const category = document.createElement('label'); category.className = 'edit-field';
      addText(category, 'span', 'Kategorija');
      const select = document.createElement('select');
      receiptCategories.forEach(c => select.append(new Option(c, c)));
      select.value = receiptCategories.includes(item.category) ? item.category : 'Citi';
      item.category = select.value;
      select.onchange = () => { item.category = select.value; showDraftSummary(); };
      category.append(select);
      row.append(name.label, price.label, category); receiptRows.append(row);
    }
    showDraftSummary();
  }
  $('historyReceiptStore').oninput = showDraftSummary;
  $('historyReceiptDate').onchange = showDraftSummary;
  $('historyReceiptAccount').onchange = showDraftSummary;
  $('historyReceiptLoyalty').oninput = showDraftSummary;
  $('historyReceiptAddItem').onclick = () => {
    if (!draft) return;
    draft.items.push({ id: null, name: '', priceText: '', category: 'Citi' });
    drawReceiptDraft(); receiptRows.lastElementChild?.querySelector('input')?.focus();
  };
  function closeDraft() { draft = null; modal.close?.(); modal.removeAttribute('open'); }
  $('historyReceiptCancel').onclick = closeDraft;
  modal.addEventListener('cancel', () => { draft = null; });
  modal.addEventListener('close', () => { draft = null; });
  $('historyReceiptSave').onclick = () => {
    if (!draft) return;
    const v = draftValidation();
    if (!v.valid) { $('historyReceiptError').textContent = 'Lūdzu izlabo nederīgos datus.'; return; }
    const allocator = window.BudgetReceiptParser?.allocateLoyaltyCents;
    if (!allocator) { $('historyReceiptError').textContent = 'Nav ielādēts čeku aprēķinu modulis.'; return; }
    let shares;
    try { shares = allocator(v.prices, v.loyalty); }
    catch { $('historyReceiptError').textContent = 'Lojalitātes naudas sadalījuma kļūda.'; return; }
    const saved = draft.items.map((item, i) => ({
      id: item.id || crypto.randomUUID(), receiptId: draft.id, receiptFingerprint: draft.fingerprint,
      receiptStore: draft.store.trim(), receiptItemName: item.name.trim(),
      receiptOriginalPrice: fromCents(v.prices[i]), receiptLoyaltyApplied: fromCents(shares[i]),
      type: 'expense', date: draft.date, account: draft.account, category: item.category,
      description: `${draft.store.trim()}: ${item.name.trim()}`, amount: fromCents(v.prices[i] - shares[i])
    }));
    const nextTransactions = state.transactions.filter(t => !(t.type === 'expense' && t.receiptId === draft.id)).concat(saved);
    if (!persist({ ...state, transactions: nextTransactions })) return;
    closeDraft(); render();
  };
  $('historyReceiptDelete').onclick = () => {
    if (!draft) return;
    const id = draft.id;
    if (!confirm(`Vai tiešām dzēst visu čeku “${draft.store}” un visas tā ${draft.items.length} pozīcijas?`)) return;
    if (!persist({ ...state, transactions: state.transactions.filter(t => !(t.type === 'expense' && t.receiptId === id)) })) return;
    closeDraft(); render();
  };

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('export').onclick = () => download('mans-budzets-rezerve-' + $('date').value + '.json',
    JSON.stringify({ version: 2, ...state }, null, 2), 'application/json');
  $('csv').onclick = () => {
    const rows = [['Datums','Veids','Apraksts','Kategorija','Konts','Summa','Čeka ID','Veikals','Preces nosaukums','Cena pirms lojalitātes','Izmantotā lojalitāte'],
      ...state.transactions.map(t => [t.date,t.type,t.description,t.category,t.account,t.amount,t.receiptId || '',
        t.receiptId ? receiptStore(t) : '',t.receiptId ? receiptItemName(t) : '',t.receiptOriginalPrice ?? '',t.receiptLoyaltyApplied ?? ''])];
    download('mans-budzets.csv', '\ufeff' + rows.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"','""') + '"').join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  };
  $('import').onchange = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.initial || !Number.isFinite(Number(data.initial.bank)) || !Number.isFinite(Number(data.initial.cash)) ||
        !Array.isArray(data.transactions) || !data.transactions.every(t =>
          ['income','expense','transfer'].includes(t.type) && ['bank','cash'].includes(t.account) &&
          Number.isFinite(t.amount) && (t.amount > 0 || t.amount === 0 && t.type === 'expense' && !!t.receiptId) &&
          validDate(t.date))) throw Error('Nepareizs formāts');
      if (confirm('Aizstāt pašreizējos datus ar rezerves kopiju?')) {
        if (persist({ initial: { bank: Number(data.initial.bank), cash: Number(data.initial.cash) }, transactions: data.transactions })) {
          $('initialBank').value = state.initial.bank; $('initialCash').value = state.initial.cash; render();
        }
      }
    } catch { alert('Neizdevās importēt: nederīgs rezerves kopijas fails.'); }
    finally { e.target.value = ''; }
  };
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
