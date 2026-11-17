/* Mans Budžets 2.6: receipt import, dual-pass OCR and reconciled payment recording. */
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
    items = []; payment = null;
    $('receiptEditor').classList.add('hidden');
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
    const quality = result.reconciled ? 'Preču summa sakrīt ar maksājumu.' :
      (result.discrepancyCents === null ? 'Nevar pārbaudīt kopsummu.' : `Trūkst vai ir lieki ${eur(Math.abs(result.discrepancyCents) / 100)}. Pārbaudi, vai nolasītas VISAS preces.`);
    $('ocrStatus').textContent = `Atpazīts veikals: ${result.store}; preces: ${items.length}${knownTotal}. ${quality}`;
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
  // 2.5: Attempt to find the bright central receipt in gallery screenshots.
  // Everything happens on-device; images never leave the phone.
  function cropReceipt(bitmap) {
    if (!$('autoCropReceipt')?.checked) return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const sample = document.createElement('canvas');
    sample.width = 220;
    sample.height = Math.max(80, Math.round(bitmap.height * 220 / bitmap.width));
    if (sample.height > 550) { sample.width = Math.round(220 * 550 / sample.height); sample.height = 550; }
    const ctx = sample.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, sample.width, sample.height);
    const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
    const w = sample.width, h = sample.height;
    const light = (x, y) => { const i = (y * w + x) * 4; return data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114 > 185; };
    // Find the widest bright band, except header and the bottom phone controls.
    const xVotes = [];
    const startY = Math.floor(h * .12), endY = Math.ceil(h * .87);
    for (let x = 0; x < w; x++) {
      let lit = 0;
      for (let y = startY; y < endY; y += 2) if (light(x, y)) lit++;
      xVotes.push(lit / Math.ceil((endY - startY) / 2) > .37);
    }
    const largestRun = votes => {
      let winner = { start: 0, end: votes.length - 1, length: 0 }, begin = -1;
      for (let i = 0; i <= votes.length; i++) {
        if (i < votes.length && votes[i]) { if (begin < 0) begin = i; }
        else if (begin >= 0) {
          const run = { start: begin, end: i - 1, length: i - begin };
          if (run.length > winner.length) winner = run;
          begin = -1;
        }
      }
      return winner;
    };
    const xs = largestRun(xVotes);
    if (xs.length < w * .23) return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const rowVotes = [];
    const stride = Math.max(1, Math.floor(xs.length / 80));
    for (let y = 0; y < h; y++) {
      let lit = 0, all = 0;
      for (let x = xs.start; x <= xs.end; x += stride) { all++; if (light(x, y)) lit++; }
      rowVotes.push(lit / all > .50);
    }
    const ys = largestRun(rowVotes);
    if (ys.length < h * .12) return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    const padX = Math.max(4, Math.round(w * .025)), padY = Math.max(6, Math.round(h * .024));
    const x1 = Math.max(0, xs.start - padX), x2 = Math.min(w, xs.end + padX + 1);
    const y1 = Math.max(0, ys.start - padY), y2 = Math.min(h, ys.end + padY + 1);
    // Avoid unhelpful crops of almost entire source or a suspiciously small region.
    if ((x2 - x1) / w > .96 && (y2 - y1) / h > .96 || (x2 - x1) / w < .20) {
      return { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    }
    return { x: Math.floor(x1 / w * bitmap.width), y: Math.floor(y1 / h * bitmap.height),
      width: Math.ceil((x2 - x1) / w * bitmap.width), height: Math.ceil((y2 - y1) / h * bitmap.height) };
  }
  async function imageForOcr(source, enhanced = true) {
    if (!('createImageBitmap' in window)) return source;
    const bitmap = await createImageBitmap(source);
    try {
      const rect = cropReceipt(bitmap), maxDim = Math.max(rect.width, rect.height);
      const scale = Math.min(2.2, 2700 / maxDim);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: enhanced });
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
      if (enhanced) {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = .299 * img.data[i] + .587 * img.data[i + 1] + .114 * img.data[i + 2];
          const adjusted = Math.round(Math.min(255, Math.max(0, (v - 128) * 1.33 + 134)));
          img.data[i] = img.data[i + 1] = img.data[i + 2] = adjusted;
        }
        ctx.putImageData(img, 0, 0);
      }
      return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Neizdevās apstrādāt attēlu')), 'image/png'));
    } finally { bitmap.close(); }
  }
  function qualityOf(parsed, confidence) {
    const gap = parsed.discrepancyCents === null ? 99999 : Math.abs(parsed.discrepancyCents);
    return (parsed.reconciled ? 200 : Math.max(-80, 45 - gap / 7)) +
      (parsed.paidTotal === null ? -20 : 25) + Math.min(60, parsed.items.length * 8) +
      (['Rimi', 'Maxima', 'Būvniecības ABC', 'Lidl', 'DEPO'].includes(parsed.store) ? 20 : 0) +
      Math.min(10, Number(confidence || 0) / 10);
  }
  $('scanReceipt').onclick = async () => {
    if (!file) { $('ocrStatus').textContent = 'Vispirms izvēlies čeka attēlu.'; return; }
    const button = $('scanReceipt'); button.disabled = true;
    let worker;
    try {
      $('ocrStatus').textContent = 'Ielādē teksta atpazīšanu…';
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      $('ocrStatus').textContent = 'Sagatavo čeka attēlu…';
      const firstSource = await imageForOcr(file, $('enhanceReceipt').checked);
      worker = await Tesseract.createWorker('lav+eng', 1, { logger: m => {
        if (m.status === 'recognizing text') $('ocrStatus').textContent = `Atpazīst čeku… ${Math.round((m.progress || 0) * 100)}%`;
      }});
      await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
      const first = (await worker.recognize(firstSource)).data;
      const attempt = [{ text: first.text, parsed: parser.parse(first.text), confidence: first.confidence }];
      if (!attempt[0].parsed.reconciled) {
        $('ocrStatus').textContent = 'Pirmā atpazīšana nav pilnīga. Pārbauda vēl vienu variantu…';
        await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
        const alternativeSource = await imageForOcr(file, !$('enhanceReceipt').checked);
        const second = (await worker.recognize(alternativeSource)).data;
        attempt.push({ text: second.text, parsed: parser.parse(second.text), confidence: second.confidence });
      }
      attempt.sort((a, b) => qualityOf(b.parsed, b.confidence) - qualityOf(a.parsed, a.confidence));
      $('ocrText').value = attempt[0].text;
      readText(attempt[0].text);
      if (!items.length) $('ocrStatus').textContent += ' Pamēģini citu foto ar taisnu, skaidri salasāmu čeku.';
    } catch (error) {
      $('ocrStatus').textContent = `Atpazīšana neizdevās: ${error.message}. Vari atvērt teksta lauku un ievadīt čeka datus manuāli.`;
      $('receiptEditor').classList.remove('hidden');
      draw();
    } finally {
      if (worker) try { await worker.terminate(); } catch {}
      button.disabled = false;
    }
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
      receiptStore: store, receiptItemName: x.name.trim(),
      receiptOriginalPrice: priceCents[i] / 100, receiptLoyaltyApplied: loyaltyShares[i] / 100
    })); // Keep even fully loyalty-paid lines so the complete receipt remains editable.
    const newState = { ...state, transactions: [...state.transactions, ...transactions] };
    try { localStorage.setItem('mansBudzetsV1', JSON.stringify(newState)); }
    catch { alert('Neizdevās saglabāt. Pārbaudi telefona datu krātuvi.'); return; }
    alert(`Saglabāts: ${eur(v.paid / 100)} no ${account === 'cash' ? 'skaidrās naudas' : 'bankas konta'}. Preces: ${transactions.length}.`);
    location.reload();
  };
})();
