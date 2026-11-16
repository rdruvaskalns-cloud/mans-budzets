/* Mans Budžets 2.4: receipt import, on-device OCR and reconciled payment recording. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const parser = window.BudgetReceiptParser;
  if (!parser) throw new Error('Trūkst receipt-parser.js');
  const eur = n => new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(n);
  const cents = n => Math.round(Number(n) * 100);
  const round = n => cents(n) / 100;
  const categories = ['Pārtika', 'Saldumi un uzkodas', 'Ēšana ārpus mājas', 'Mājoklis', 'Komunālie maksājumi', 'Transports', 'Veselība', 'Sadzīves preces', 'Depozīts', 'Izklaide', 'Apģērbs', 'Abonementi', 'Citi'];
  let file = null, items = [], payment = null;
  const preview = $('preview');
  function chosen(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      $('ocrStatus').textContent = 'Izvēlies JPG, PNG vai citu attēlu. PDF nolasīšana vēl nav pieejama.';
      return;
    }
    file = selected;
    const url = URL.createObjectURL(file);
    preview.onload = () => URL.revokeObjectURL(url);
    preview.src = url;
    preview.style.display = 'block';
    $('ocrStatus').textContent = 'Čeka attēls izvēlēts. Nospied “Nolasīt čeku”.';
  }
  $('chooseGallery').onclick = () => $('receipt').click();
  $('takePhoto').onclick = () => $('receiptCamera').click();
  $('receipt').onchange = chosen;
  $('receiptCamera').onchange = chosen;

  function readText(text) {
    const result = parser.parse(text);
    items = result.items;
    payment = result;
    $('receiptStore').value = result.store;
    if (result.date) $('receiptDate').value = result.date;
    $('receiptTotal').value = result.paidTotal === null ? '' : result.paidTotal.toFixed(2);
    $('receiptLoyalty').value = result.loyalty.toFixed(2);
    if (result.account) $('receiptAccount').value = result.account;
    $('receiptEditor').classList.remove('hidden');
    const details = [];
    if (result.cashReceived !== null) details.push(`Iedota skaidrā nauda: ${eur(result.cashReceived)}`);
    if (result.change !== null) details.push(`Izsniegtais atlikums: ${eur(result.change)}`);
    if (result.loyalty > 0) details.push(`Izmantotā lojalitātes nauda: ${eur(result.loyalty)}`);
    $('receiptPaymentInfo').textContent = details.join(' · ') || 'Maksāšanas veidu pārbaudi un nepieciešamības gadījumā izlabo.';
    draw();
    const knownTotal = result.paidTotal !== null ? `, čeka kopsumma ${eur(result.paidTotal)}` : '; čeka kopsumma nav droši atrasta';
    $('ocrStatus').textContent = `Atpazīts veikals: ${result.store}; preces: ${items.length}${knownTotal}. Pārbaudi pirms saglabāšanas.`;
  }
  function draw() {
    const root = $('receiptLines'); root.replaceChildren();
    items.forEach((item, i) => {
      const line = document.createElement('div'); line.className = 'receipt-line';
      const name = document.createElement('input'); name.value = item.name; name.placeholder = 'Preces nosaukums'; name.setAttribute('aria-label', 'Preces nosaukums');
      name.oninput = () => { item.name = name.value; updateCheck(); };
      const price = document.createElement('input'); price.type = 'number'; price.min = '0'; price.step = '0.01'; price.inputMode = 'decimal'; price.value = item.price; price.setAttribute('aria-label', 'Preces cena ar atlaidēm');
      price.oninput = () => { item.price = Number(price.value); updateCheck(); };
      const del = document.createElement('button'); del.className = 'danger'; del.textContent = '×'; del.setAttribute('aria-label', 'Dzēst preci');
      del.onclick = () => { items.splice(i, 1); draw(); };
      const cat = document.createElement('select'); cat.setAttribute('aria-label', 'Preces kategorija');
      for (const c of categories) { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; cat.append(opt); }
      cat.value = categories.includes(item.category) ? item.category : 'Citi'; cat.onchange = () => { item.category = cat.value; };
      line.append(name, price, del, cat); root.append(line);
    });
    updateCheck();
  }
  function validation() {
    const sum = items.reduce((a, x) => a + cents(x.price), 0);
    const credit = cents($('receiptLoyalty').value || 0);
    const totalRaw = $('receiptTotal').value;
    const paid = totalRaw === '' ? null : cents(totalRaw);
    const bad = !items.length || items.some(x => !x.name?.trim() || !Number.isFinite(Number(x.price)) || cents(x.price) <= 0);
    return { sum, credit, paid, bad, valid: !bad && paid !== null && paid >= 0 && credit >= 0 && credit <= sum && Math.abs(sum - credit - paid) <= 1 };
  }
  function updateCheck() {
    const v = validation();
    const info = `Preču summa: ${eur(v.sum / 100)} · Lojalitātes nauda: ${eur(v.credit / 100)} · Maksājums: ${v.paid === null ? 'nav norādīts' : eur(v.paid / 100)}`;
    const check = $('receiptCheck');
    check.textContent = v.valid ? `${info} — sakrīt.` : `${info} — nesakrīt vai nav pilnīgu datu. Pirms saglabāšanas izlabo summas.`;
    check.style.color = v.valid ? '#126e58' : '#a33';
    $('saveReceipt').disabled = !v.valid;
    $('saveReceipt').title = v.valid ? '' : 'Vispirms izlabo cenas, atlaides vai čeka kopsummu';
  }
  $('receiptDate').value = new Date().toLocaleDateString('sv-SE');
  $('receiptTotal').oninput = updateCheck;
  $('receiptLoyalty').oninput = updateCheck;
  $('addReceiptLine').onclick = () => { items.push({ name: '', price: 0, category: 'Citi' }); draw(); };
  $('parseText').onclick = () => readText($('ocrText').value);
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve();
      const script = document.createElement('script'); script.src = src; script.onload = resolve;
      script.onerror = () => reject(new Error('Neizdevās ielādēt OCR. Pārbaudi interneta savienojumu.'));
      document.head.append(script);
    });
  }
  // Optional contrast normalization for wrinkled thermal receipts, entirely on-device.
  async function imageForOcr(source) {
    if (!$('enhanceReceipt').checked || !('createImageBitmap' in window)) return source;
    const bitmap = await createImageBitmap(source);
    try {
      const scale = Math.min(1.8, 2300 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const v = Math.max(0, Math.min(255, (gray - 135) * 1.45 + 155));
        data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
      return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Attēla apstrādes kļūda')), 'image/png'));
    } finally { bitmap.close(); }
  }
  $('scanReceipt').onclick = async () => {
    if (!file) { $('ocrStatus').textContent = 'Vispirms izvēlies čeka attēlu.'; return; }
    const button = $('scanReceipt'); button.disabled = true;
    try {
      $('ocrStatus').textContent = 'Ielādē OCR bibliotēku…';
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      let source = file;
      if ($('enhanceReceipt').checked) {
        $('ocrStatus').textContent = 'Uzlabo čeka attēla kontrastu…';
        try { source = await imageForOcr(file); }
        catch { source = file; }
      }
      $('ocrStatus').textContent = 'Atpazīst čeku…';
      const worker = await Tesseract.createWorker('lav+eng', 1, { logger: m => {
        if (m.status === 'recognizing text') $('ocrStatus').textContent = `Atpazīst čeku… ${Math.round((m.progress || 0) * 100)}%`;
      }});
      let result;
      try { result = await worker.recognize(source); } finally { await worker.terminate(); }
      $('ocrText').value = result.data.text;
      readText(result.data.text);
      if (!items.length) $('ocrStatus').textContent += ' Ja netika atrastas preces, atslēdz kontrasta uzlabošanu un mēģini vēlreiz.';
    } catch (error) {
      $('ocrStatus').textContent = `Atpazīšana neizdevās: ${error.message}. Preces vari pievienot manuāli.`;
      $('receiptEditor').classList.remove('hidden');
      draw();
    } finally { button.disabled = false; }
  };
  $('saveReceipt').onclick = () => {
    const v = validation();
    if (!v.valid) { alert('Preču summa (mīnus izmantotā lojalitātes nauda) nesakrīt ar čeka kopsummu. Izlabo datus.'); return; }
    const date = $('receiptDate').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { alert('Norādi derīgu datumu.'); return; }
    const store = $('receiptStore').value.trim() || 'Čeks';
    const account = $('receiptAccount').value;
    let state;
    try { state = JSON.parse(localStorage.getItem('mansBudzetsV1')) || { initial: { bank: 0, cash: 0 }, transactions: [] }; }
    catch { alert('Neizdevās nolasīt iepriekš saglabātos datus.'); return; }
    if (!Array.isArray(state.transactions)) { alert('Datu formāta kļūda.'); return; }
    const receiptText = $('ocrText').value;
    // Same source text/date/store/total => possible accidental duplicate import.
    let hash = 2166136261;
    for (const char of `${store}|${date}|${v.paid}|${receiptText.replace(/\s/g, '')}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    const fingerprint = (hash >>> 0).toString(16);
    if (state.transactions.some(t => t.receiptFingerprint === fingerprint) && !confirm('Šķiet, ka šis čeks jau ir saglabāts. Vai pievienot atkārtoti?')) return;
    const priceCents = items.map(x => cents(x.price));
    const loyaltyShares = parser.allocateLoyaltyCents(priceCents, v.credit);
    const receiptId = crypto.randomUUID();
    const transactions = items.map((x, i) => ({ id: crypto.randomUUID(), date,
      description: `${store}: ${x.name.trim()}`,
      amount: (priceCents[i] - loyaltyShares[i]) / 100,
      type: 'expense', category: x.category, account,
      receiptId, receiptFingerprint: fingerprint,
      receiptOriginalPrice: priceCents[i] / 100, receiptLoyaltyApplied: loyaltyShares[i] / 100
    })).filter(x => x.amount > 0);
    const newState = { ...state, transactions: [...state.transactions, ...transactions] };
    try { localStorage.setItem('mansBudzetsV1', JSON.stringify(newState)); }
    catch { alert('Neizdevās saglabāt. Pārbaudi telefona datu krātuvi.'); return; }
    alert(`Saglabāts: ${eur(v.paid / 100)} no ${account === 'cash' ? 'skaidrās naudas' : 'bankas konta'}. Preces: ${transactions.length}.`);
    location.reload();
  };
})();
