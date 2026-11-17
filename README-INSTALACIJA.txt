MANS BUDŽETS — versija 2.6

KAS JAUNS
• Darījumu vēsturē katrs iepriekš importētais čeks tiek attēlots kā viens ieraksts ar kopsummu. Manuāli ievadītie darījumi paliek atsevišķi.
• Uzspiežot uz čeka, var apskatīt un rediģēt katru preci, tās cenu pēc veikala atlaidēm, kategoriju un nosaukumu, kā arī veikalu, datumu, maksāšanas kontu un izmantoto lojalitātes naudu.
• Var pievienot vai dzēst preces, saglabāt izmaiņas vai aizvērt logu un atcelt tās. Saglabāšana notiek tikai ar pogu “Saglabāt izmaiņas”.
• Var dzēst visu čeku ar vienu apstiprinātu darbību.
• Pēc labošanas pārrēķinās vēstures kopsumma, kategoriju statistika, mēneša izdevumi un naudas atlikums.
• Iepriekšējo versiju čeku ieraksti automātiski tiek apvienoti pēc receiptId. Jauniem čekiem tiek saglabāts arī skaidrs veikala un preces nosaukuma lauks.
• CSV eksports papildināts ar čeka identifikatoru un pozīciju metadatiem.

KĀ ATJAUNINĀT
1. Atver ESOŠO lietotni Samsung telefonā, sadaļā “Iestatījumi un rezerves kopijas” lejupielādē JSON rezerves kopiju. Glabā to privāti!
2. Izpako ZIP failu. GitHub projekta mans-budzets galvenajā mapē aizstāj SEPTYŅUS failus:
   index.html, app.js, receipt.js, receipt-parser.js, sw.js, manifest.webmanifest, icon.svg
3. GitHub izvēlies Commit changes. Sagaidi, līdz Pages publicē izmaiņas, tad aizver un atver lietotni telefonā. Nav jāpārinstalē.
4. Sadaļā “Čeka nolasīšana” jārādās 2.6.

SVARĪGI
• Dati paliek ierīces lokālajā krātuvē zem tās pašas mansBudzetsV1 atslēgas; ja lietotni atver no citas ierīces vai pārlūkprogrammas, dati automātiski nesinhronizējas.
• Ierakstu labošanas brīdī dati netiek mainīti līdz saglabāšanas pogas nospiešanai.
• Šis ir lokāli testēts atjauninājums. Pēc publicēšanas ieteicams pārbaudīt ar vienu īstu čeku.
• Lojalitātes naudu dala proporcionāli starp precēm, tāpēc atsevišķa ieraksta faktiski samaksātā summa var atšķirties no preces cenas pirms lojalitātes naudas.
• OCR un PDF atbalsts nav izmainīts salīdzinājumā ar 2.5.
• Pirms lieliem labojumiem regulāri eksportē JSON kopiju. Nekad neaugšupielādē to publiskā GitHub projektā.
