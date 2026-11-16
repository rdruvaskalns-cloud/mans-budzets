MANS BUDŽETS — versija 2.5

KAS JAUNS
- Čeka attēlu var automātiski apgriezt, atdalot gaišo čeku no lietotnes ekrānuzņēmuma.
- Ja pirmajā OCR mēģinājumā neatbilst čeka kopsumma, seko otrs atpazīšanas mēģinājums.
- Uzlabota Rimi, Maxima un Būvniecības ABC preču, atlaižu, depozīta, lojalitātes un maksājumu atpazīšana.
- Lietotne pārbauda, vai preču kopsumma (atskaitot faktiski izmantoto lojalitātes naudu) sakrīt ar maksājumu. Nesakritības gadījumā neļauj saglabāt nepilnīgu čeku.

KĀ ATJAUNINĀT
1. Esošajā lietotnē: Iestatījumi un rezerves kopijas > Lejupielādēt rezerves kopiju (JSON).
2. GitHub projektā mans-budzets augšupielādē visus SEPTIŅUS mājaslapas failus ZIP saknē:
   index.html, app.js, receipt.js, receipt-parser.js, sw.js, manifest.webmanifest, icon.svg
3. Aizstāj iepriekšējos failus. Neievieto tos atsevišķā mapē.
4. Saglabā izmaiņas (Commit changes), pārliecinies, ka GitHub Actions/Pages publicēšana veiksmīga.
5. Aizver un atkārtoti atver sākuma ekrāna lietotni. Čeka nolasīšanas sadaļā jābūt 2.5.

PIEZĪMES
- Finanšu ieraksti joprojām izmanto iepriekšējo localStorage atslēgu mansBudzetsV1; to neaizstāj ar tukšu datubāzi.
- OCR izpildās uz ierīces; pirmoreiz OCR bibliotēku/valodu modeļus nepieciešams ielādēt internetā.
- Iesniegtie čeki izmantoti par pamatu testiem, bet tie NAV garantija, ka katru foto varēs automātiski nolasīt. Atpazīšanas rezultātu vienmēr pārbaudi.
- Nespēj nolasīt PDF tieši; šai versijā izmanto attēlu/ekrānuzņēmumu.
- Rezerves kopijas pašrocīgi glabā drošā vietā; sensitīvus finanšu datus neaugšupielādē publiskajā GitHub repozitorijā.
