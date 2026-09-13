# Zadání: Webová aplikace pro řízení mezikapitolových událostí na LARPu

> Dokument je určen jako vstup pro AI (návrh UX + implementace webové aplikace).
> Sekce **[ROZHODNUTO]** jsou závazné. Sekce **[PŘEDPOKLAD]** jsou návrh autora zadání — potvrdit nebo přepsat.
> Sekce **[OTEVŘENÉ]** je nutné doplnit před implementací.

---

## 1. Kontext a cíl

LARP má **3 kapitoly** oddělené časovými skoky (roky života postav). Na konci každé kapitoly hráči vyplní dotazník o tom, co se jim ve hře stalo. Organizátoři tyto odpovědi zpracují a na jejich základě vygenerují pro každou postavu nové materiály pro další kapitolu (jak se vyvinul její život, majetek, vztahy, postavení ve skupinách).

Dnes se to dělá ručně v tabulkách. Při **23 postavách ve dvou souběžných bězích** je to neúnosné a chybové.

**Cílem je nástroj, který:**

1. Sesbírá odpovědi na konci kapitoly.
2. Deterministicky přepočítá vnitřní stav každé postavy (škály, příznaky, členství ve skupinách).
3. Vygeneruje editovatelný mezivýstup (JSON) a z něj tisknutelné dokumenty pro hráče.
4. Umožní kdykoli — i po hře — dohledat **proč** došlo k dané změně.

**Inspirace / podobné systémy:** aplikace „Fin" (motlík app), LARP „Národ sobě" (řešeno divokým Google Sheetem).

---

## 2. Klíčové principy [ROZHODNUTO]

Tyto principy mají přednost před funkční bohatostí. Když je konflikt, vyhrávají ony.

1. **Žádný black box.** Ke každé změně stavu musí jít zobrazit, které pravidlo ji způsobilo a z jaké odpovědi vzniklo.
2. **Auditovatelnost i po hře.** Kompletní historie všech běhů zůstává dohledatelná. Nic se nepřepisuje destruktivně, změny se verzují.
3. **Determinismus.** Stejný vstup = stejný výstup. Náhoda je povolená, ale hozené číslo se ukládá jako data a přepočet ho neopakuje (viz §7.4).
4. **Nezávislost na programátorech.** Otázky, škály, váhy a texty edituje autor hry v tabulce, ne v kódu.
5. **Web, ne desktop.** Běží v prohlížeči na běžné adrese, ne jako aplikace zamčená na jednom PC (§18).
6. **Člověk má poslední slovo.** Engine navrhuje, org potvrzuje. Před generováním tisku jde vše ručně přepsat.

---

## 3. Uživatelské role a běhy [ROZHODNUTO]

**Aplikace má jedinou roli: organizátor.** Žádný systém oprávnění, žádné hráčské účty.

- Odpovědi hráčů zadávají **vždy orgové** (z papírových dotazníků). Hráč se do aplikace nedostane.
- Autor hry a game master jsou tentýž typ uživatele, jen v jiné fázi práce.

### 3.1 Přihlášení [ROZHODNUTO]

Jedno **sdílené heslo** na vstupu do aplikace. Žádné účty, žádná registrace, žádné role.

**Plus jedno pole navíc: „Kdo jsi?"** — volný text, bez ověřování, uloží se do prohlížeče. Stojí to pět minut práce a bez něj audit log neumí říct, **kdo** změnu udělal — všichni by byli „uživatel". Při dohledávání po hře je to rozdíl mezi použitelným a nepoužitelným záznamem.

### 3.2 Běh jako kontext práce [ROZHODNUTO]

Po přihlášení si uživatel vybere nebo založí **běh**.

**Pozor na pojmenování: „běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací a míchání obou významů je spolehlivá cesta ke zmatkům.

**Identifikátor:** datum zahájení + písmeno, tedy `2026-09-12_A`, `2026-09-12_B`. Generuje se automaticky. Vedle něj **volitelný popisný název**, který si org může přepsat („Podzimní běh, sobotní parta").

**Životní cyklus běhu:**

```
založen → aktivní → [kapitola 1 vydána] → [kapitola 2 vydána] → [kapitola 3 vydána] → archivován
```

**Stavy kapitoly [ROZHODNUTO]:**

| Stav           | Význam                                    | Lze editovat?                     |
| -------------- | ----------------------------------------- | --------------------------------- |
| `rozpracovaná` | Sbírají se odpovědi                       | Ano, volně                        |
| `spočítaná`    | Přepočet proběhl, výstup existuje         | Ano, přepočet lze opakovat        |
| `vydaná`       | Dokumenty jsou vytištěné a rozdané hráčům | Ano, ale s odůvodněním (viz níže) |

**Uzamčení není definitivní [ROZHODNUTO].** Nic se nikdy nezamyká nevratně. Stav `vydaná` je **měkká pojistka proti překlepu**, ne zámek — chrání před nechtěnou změnou kapitoly, jejíž papíry už drží hráči v ruce.

Editace vydané kapitoly:

- Vyžaduje **potvrzení a důvod** (volný text), obojí do auditu.
- Nikdy se nic nepřepisuje destruktivně. Předchozí výsledek přepočtu zůstává uložený jako verze.

**Kaskáda: nejdůležitější pravidlo [ROZHODNUTO]**

Když se změní odpověď v kapitole, která už je vydaná, přestává platit výchozí stav všech následujících kapitol.

Aplikace v takové situaci **nesmí nic přepočítat sama**. Označí následující kapitoly jako **`dotčené`** a vynutí si vědomé rozhodnutí orga:

1. **Přepočítat znovu** — aplikace vyrobí nový výstup. Org musí vyřešit, co s už rozdanými papíry.
2. **Ponechat jak je** — org potvrdí, že rozdaná realita platí a oprava se týká jen záznamu. Aplikace si poznamená, že se výpočet a vydaný stav rozcházejí, a proč.

Důvod tohoto pravidla: **během hry je zdrojem pravdy papír v rukou hráče, ne databáze.** Aplikace, která by po tiché opravě začala počítat z jiného stavu, než jaký hráči dostali, by rozbila hru a nikdo by si toho nevšiml až do konce.

Archivovaný běh zůstává **navždy prohlížitelný** včetně všech odpovědí, stavů, verzí přepočtu a trace (§2, bod 2). Nikdy se nemaže.

**Každý běh má vlastní konfiguraci, nahranou při jeho založení** (§6.5). Dva souběžné běhy tak mohou mít různé otázky, pokud vznikly v jiný čas.

### 3.3 Oddělení dat běhů [ROZHODNUTO]

Dva běhy poběží současně a **jejich data se nesmí potkat**.

**Na úrovni dat:** každá tabulka nese `run_id`. Přístup k datům vede přes jedinou vrstvu, která **vyžaduje `runId` jako povinný argument** — dotaz bez něj nejde napsat. Izolace tak drží strukturou kódu, ne kázní při psaní dotazů.

**Na úrovni UI** — a tohle je důležitější, než se zdá: protože se všichni hlásí stejným heslem, aplikace nepozná z přihlášení, kdo v jakém běhu pracuje. Riziko, že org zapíše odpovědi z běhu A do běhu B, je reálné a jeho následky se špatně opravují.

Opatření:

1. **Přepínač běhu trvale viditelný v hlavičce**, na každé obrazovce.
2. **Odlišná barva rozhraní pro každý běh** (A modrá, B jantarová). Nejlevnější a nejúčinnější pojistka — pozná se periferním viděním.
3. **Potvrzovací dialog u zásadních akcí** (přepočet, vydání kapitoly, export) vždy **jmenuje běh**: „Uzamknout kapitolu 2 běhu **2026-09-12_B**?"
4. Název běhu je součástí názvu každého exportovaného souboru (§10.4).

---

## 4. Doménový model

### 4.1 Entity

- **Běh (Run)** — jedna instance hry, viz §3.2. Nejvyšší úroveň izolace dat. Dva běhy probíhají současně a **nesmí** se navzájem vidět ani ovlivňovat.
- **Kapitola (Chapter)** — 1, 2, 3. Každý běh prochází kapitolami sekvenčně.
- **Postava (Character)** — v rámci běhu. Má stav (viz níže) a přiřazeného hráče.
- **Škála (Scale)** — číselná osa reprezentující vnitřní stav postavy. **Preferováno před ano/ne příznaky.**
  Příklady: `Wealth` (kolik má na spořáku), `Regime` (přesvědčení o komunismu), `Control` (kontrola nad organizací), `Bony`.
  **Rozsah: celá čísla 1–10.** Hodnoty mimo rozsah se ořezávají na hranici (clamp), ne obtáčejí. Každý ořez se zapíše do auditu — je to signál pro autora, že váhy jsou špatně nakalibrované.
  **Pásma [ROZHODNUTO]:** výchozí rozdělení na 4 pásma — `1–3`, `4–5`, `6–8`, `9–10`. **Každá škála má vlastní názvy pásem** (`Wealth` → „Na dně / Vyžije / Zajištěná / Zazobaná", `Regime` → jiné) i vlastní počet a prahy. Vše definované v listu `N_Scales`, editovatelné. **Nikdy natvrdo v kódu.**
- **Příznak (Flag)** — booleovská značka události. Např. `Svatba`, `Odchod_do_duchodu`, `Firemni_byt`, `Pristup_do_skladu`. Slouží k větvení textů a jako podmínka pravidel.
- **Skupina (Group)** — organizace/parta. Má členy, vedoucího, vlastní dokument.
- **Domácnost (Household)** — postavy sdílející majetek, typicky manželé. Viz §4.4.
- **Vztah mezi postavami** — **není samostatná entita**, viz §4.6. Strukturně existuje jen členství ve skupině, vedení skupiny a domácnost.
- **Otázka (Question)** a **Odpověď (Answer)** — viz §6.
- **Pravidlo (Rule)** — viz §7.
- **Dokument (Document)** — vygenerovaný výstup pro tisk, viz §8.

### 4.2 Struktura zdrojové tabulky [ROZHODNUTO]

Zdrojem konfigurace je Google Sheet s tabulkami (per kapitola):

- `1_Questions`, `2_Questions`, `3_Questions` — otázky + odpovědi + jejich dopady na škály
- `1_Scales`, `2_Scales`, `3_Scales` — definice škál včetně prahů pásem
- `2_Content`, `3_Content` — bloky a jejich varianty; typ `Historie` / `Questions` plyne z ID bloku. **`1_Content` neexistuje** — `N_Content` se počítá z odpovědí kapitoly N−1 (§8.2)
- `Validations` — kontrolní pravidla
- **`N_Rules`** _(nepovinný, možná nebude potřeba)_ — pravidla enginu, viz §4.5
- **`Characters`** _(doplnit do tabulky)_ — minimální registr postav: ID, jméno, příjmení, skupina, ID šablony dokumentu a **počáteční hodnoty škál pro kapitolu 1**. Nic víc.

**Postavy se v aplikaci nepopisují [ROZHODNUTO].** Vše, co engine potřebuje k rozhodnutí o vývoji postavy, plyne **výhradně z odpovědí na otázky a ze škál**. Charakterizace postavy (povaha, minulost, fixní rysy typu „závislý na piku") žije v **pevných odstavcích šablony Google Docu**, kterých se engine nikdy nedotkne — není to datový model.

**Konvence ID (dodržet):**

| Typ     | Vzor                                        | Příklad             |
| ------- | ------------------------------------------- | ------------------- |
| Otázka  | `Q_<Postava><Kapitola>_<Poradi>`            | `Q_Marie1_1`        |
| Odpověď | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel` |
| Škála   | `S_<Postava>_<Skala>`                       | `S_Marie_Wealth`    |

**Formát sloupce dopadu na škály:** čárkou oddělený seznam `<ScaleID><znaménko><číslo>`, např. `S_Marie_Wealth+3, S_Marie_Regime-2`. Prázdná buňka = žádný dopad.

**Speciální hodnota odpovědi:** `_OTHER_` — volný text, který org doplní ručně.

### 4.3 Stav postavy

Stav postavy v kapitole N = `{ škály: {…}, příznaky: […], členství: […], vztahy: […] }`.
Stav se **ukládá jako snapshot po každé kapitole**, nikdy se nepřepisuje. Historie stavů je součástí auditu.

---

### 4.4 Domácnosti a sdílené škály [ROZHODNUTO]

Některé postavy sdílejí majetek — manželé mají společný účet. Sdílené hodnoty nesmí být řešené kopírováním mezi postavami; potřebují vlastního vlastníka.

**Zavádí se entita `Domácnost` (Household).** Je to skupina postav, které sdílejí ekonomické hodnoty. Vzniká sňatkem, může zaniknout rozvodem nebo úmrtím.

**Postava smí být v jednu chvíli nejvýše v jedné domácnosti.** Kontrola konzistence (§11).

#### Tři rozsahy platnosti škály

Škála má v definici (`N_Scales`) uvedený rozsah:

| Rozsah      | Význam                                                              | Příklad             |
| ----------- | ------------------------------------------------------------------- | ------------------- |
| `postava`   | Hodnota patří jedné postavě                                         | `Regime`, `Control` |
| `domácnost` | Hodnota patří domácnosti, všichni členové čtou a mění tutéž         | firemní byt, auto   |
| `směrovaná` | **Dvojice účtů, engine podle stavu postavy vybere, do kterého jde** | `Wealth`, `Bony`    |

Směrovaná škála existuje ve dvou hodnotách zároveň:

| Hodnota           | Vlastník  | Kdy se do ní zapisuje                                  |
| ----------------- | --------- | ------------------------------------------------------ |
| `Wealth_osobni`   | postava   | Postava je svobodná, nebo má otázka příznak `Soukrome` |
| `Wealth_spolecny` | domácnost | Postava je v manželství                                |

**Osobní účet manželům nezaniká.** Sňatkem se jen změní, kam standardně přitékají peníze; to, co měli předtím, jim zůstává na osobním účtu.

#### Směrování finančních příspěvků [ROZHODNUTO]

Tohle je jádro celé sekce:

- **Postava v manželství** → její finanční příspěvky jdou **do domácnosti**, na společný účet.
- **Postava svobodná** → její příspěvky jdou **na její osobní účet**.
- **Výjimka:** otázka může nést příznak **`Soukrome`**. Její dopady pak jdou **vždy na osobní účet**, i když je postava vdaná. Na to se zapisují příjmy, o kterých partner neví, nebo které si postava vědomě nechává stranou.

Autor hry tedy zapisuje dopad **logickým jménem škály bez přípony**:

```
S_Marie_Wealth+3
```

Engine při přepočtu rozhodne, jestli to přistane na `Wealth_osobni`, nebo `Wealth_spolecny`. **Autor nemusí psát dvě varianty odpovědi pro vdanou a svobodnou postavu** — a přesně kvůli tomu tenhle mechanismus existuje. Bez něj by u každé finanční otázky musela být podmínka na rodinný stav.

Explicitní zápis s příponou (`S_Marie_Wealth_osobni+3`) zůstává **možný a má přednost** před směrováním. Je to úniková cesta pro případy, které do pravidla nezapadají.

**Stejné směrování platí i v podmínkách.** `S_Marie_Wealth >= 7` znamená „účet, do kterého Mariiny peníze tečou". Kdo chce konkrétní účet, napíše `S_Marie_Wealth_osobni >= 7`.

**Výjimka — absolutní nastavení musí být vždy explicitní.** Organizátorská otázka typu `scale_direct` (§6.7) nesmí používat logické jméno. Org nastavuje konkrétní účet a nikdy se nesmí stát, že se hodnota nevědomky zapíše jinam, než myslel. Validace to hlídá.

#### Kdy se rodinný stav vyhodnocuje

Směrování se řídí stavem postavy **po strukturální fázi přepočtu** (§7.3, fáze 4), tedy po vyhodnocení sňatků a rozvodů dané kapitoly.

Prakticky to znamená: **kdo se v téhle kapitole oženil, tomu už příspěvky z téže kapitoly jdou na společný účet.** Kdo se rozvedl, tomu jdou na osobní. Je to logičtější než počítat s loňským stavem a zároveň to plyne z fixního pořadí fází — nemůže to záviset na pořadí řádků v tabulce.

#### Jak se sdílená hodnota mění

Výchozí chování: **příspěvky členů domácnosti se sčítají.** Když Marie i Mirek odpoví tak, že každý přinese +2 na `Wealth`, společný účet vzroste o 4. Oba do něj vydělávají, takže je to správně.

Pravidlo ale může nést příznak **„aplikovat jednou za domácnost"** pro události, které postihnou domácnost jako celek (vykradli vás, dostali jste byt). Bez toho by se taková událost započítala tolikrát, kolik má domácnost členů.

#### Vznik a zánik domácnosti

Obojí je **efekt odpovědi** (§6.7), ne ruční operace nad databází.

- **Sňatek.** Vznikne domácnost. Osobní účty obou zůstávají, jak byly. **Kolik kdo vloží do společného, je otázka v dotazníku**, ne dopočítaná hodnota — hráči to sami rozehrávají a automatické „sečti a ořízni" by jim to rozhodnutí vzalo.
- **Rozvod nebo úmrtí.** Domácnost zaniká. Co si kdo odnáší ze společného účtu, je **rovněž otázka nebo rozhodnutí orga**. Ne tiché dopočítání.
- U nefinančních domácnostních škál (byt, auto) zůstává **nastavitelná strategie** v definici škály: součet, průměr, vyšší z hodnot, každý si odnáší.
- Vznik i zánik se zapisuje do trace a auditu s uvedením původních hodnot.

#### Kontroly konzistence

- Směrovaná škála musí mít definované **obě** hodnoty, `_osobni` i `_spolecny`.
- Absolutní nastavení (`scale_direct`) používající logické jméno bez přípony je **chyba**.
- Upozorni, když v kapitole žádná odpověď nesahá na jeden z dvojice účtů — většinou to znamená překlep v ID škály.

#### Dopad na transparentnost

Sdílené škály jsou **největší riziko pro princip „žádný black box"** (§2). Mariiny peníze se změní, aniž by to šlo vysvětlit z jejích odpovědí. Směrování to riziko ještě zvyšuje, protože ze zápisu `S_Marie_Wealth+3` není na první pohled vidět, kam to spadlo.

Proto:

1. Trace u směrované škály **vždy uvádí cílový účet a důvod směrování**: „+3 Wealth → společný účet, Marie je v manželství s Mirkem Pokorným".
2. Trace u sdílené škály **vždy uvádí, od koho změna přišla**: „−3 Wealth_spolecny, zdroj: odpověď Mirka Pokorného na Q_Mirek_2_1".
3. V detailu postavy je u sdílené škály **viditelná značka** „společný účet s Mirkem Pokorným" a odkaz na druhou postavu.
4. Dokument postavy odkazuje na obě hodnoty běžnými proměnnými; z pohledu šablony není rozdíl. Zobrazení společného účtu u svobodné postavy řídí blok v šabloně.

---

### 4.5 Kde jsou pravidla [ROZHODNUTO]

**Rozhodující zjištění z reálného listu `2_Content`:** autor hry už podmínky píše jako **výrazy v jedné buňce**, například `A_Marie1_1_Karel AND !(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3)`. Dřívější návrh na rozepsání podmínek do strukturovaných sloupců v samostatném listu se tím **ruší** — autor hlasoval tím, jak tabulku píše, a rozepisovat tohle do řádků by bylo výrazně horší na psaní i na čtení.

**Podmínky jsou výrazy. Parser se nepíše, použije se knihovna** (`jsep` nebo `expr-eval`) a nad jejím stromem se napíše vlastní vyhodnocení. Vlastní gramatiku nepsat ani teď.

#### Jazyk podmínek

| Prvek   | Zápis                 | Význam                                               |
| ------- | --------------------- | ---------------------------------------------------- |
| Odpověď | `A_Marie1_1_Karel`    | Postava odpověděla takto                             |
| Negace  | `!A_Marie1_1_Karel`   | Neodpověděla                                         |
| Spojky  | `AND`, `OR`           | Logické spojení                                      |
| Závorky | `( )`                 | Priorita vyhodnocení                                 |
| Škála   | `S_Marie_Wealth >= 7` | Porovnání, operátory `=`, `!=`, `>`, `<`, `>=`, `<=` |
| Příznak | `F_Svatba`            | Příznak je nastaven                                  |
| Náhoda  | `RANDOM(50)`          | Pravděpodobnost v procentech, hod se ukládá (§7.4)   |
| Výchozí | `DEFAULT`             | Vždy pravdivé, použije se, když neprojde nic jiného  |

#### Kde podmínky žijí

| Vrstva | Kde                                             | K čemu                                                       |
| ------ | ----------------------------------------------- | ------------------------------------------------------------ |
| 1      | Sloupec `Scale Impact` v `N_Questions`          | Odpověď posune škály                                         |
| 2      | Sloupce `Flags` a `Effects` v `N_Questions`     | Odpověď nastaví příznak, vyvolá sňatek, změní vedení skupiny |
| 3      | Sloupce `Priority` a `Conditions` v `N_Content` | **Která varianta bloku se použije** — viz §8.2               |
| 4      | `N_Rules` _(nepovinné)_                         | Logika, která nepatří k jedné odpovědi ani k jednomu bloku   |

**Vrstva 4 nemusí v první verzi vzniknout vůbec.** Reálný list ukazuje, že většinu rozhodování nese vrstva 3 přímo u textu, kterého se týká. Založ `N_Rules` až ve chvíli, kdy narazíš na něco, co se jinam nevejde — do té doby je to prázdná struktura navíc.

### 4.6 Text není stav [ROZHODNUTO]

Obecné pravidlo, které řeší celou třídu otázek:

> **Text, který se jen tiskne, nikdy není datový model. Co má ovlivnit budoucnost, je škála nebo příznak.**

Důsledky:

- **Vztahy mezi postavami** (§4.1) se **nemodelují jako obecná tabulka.** Strukturně existují jen tři vazby: členství ve skupině, vedení skupiny a domácnost (§4.4). Všechno ostatní je text v šabloně. Kde vztah mechanicky rozhoduje, je stejně zachycený jako odpověď odkazující na ID jiné postavy (§6.6) — a to je ta data.
- **Vášně, obavy, ambice** (§9) jsou **bloky a proměnné šablony**, ne tabulka. Mění se každou kapitolu tím, že se v šabloně vybere jiný blok. Pokud má některá z nich ovlivnit pozdější kapitolu, vyjádří se navíc příznakem nebo škálou — text sám se do enginu nikdy nevrací.

---

### 4.7 Ankety — vyhodnocení napříč postavami [ROZHODNUTO]

Dosavadní podmínky se ptají vždy jen na **jednu postavu**: „odpověděla Marie takhle?". Volba vedení spolku je jiná otázka — „jak odpověděly všechny postavy dohromady?". Na to jazyk podmínek zatím neměl slovo.

#### Skupina otázek = anketa

Otázky jsou per postava (§6.6), takže volba vedení je ve skutečnosti 23 samostatných otázek. Aby engine věděl, že patří k sobě, dostane `N_Questions` sloupec **`Anketa`**:

| Question ID     | Character | Anketa         | Text                          |
| --------------- | --------- | -------------- | ----------------------------- |
| `Q_Marie_1_2`   | Marie     | `VOLBA_VEDENI` | Koho volíte do vedení spolku? |
| `Q_Karel_1_2`   | Karel     | `VOLBA_VEDENI` | Koho volíte do vedení spolku? |
| `Q_Vojtech_1_2` | Vojtěch   | `VOLBA_VEDENI` | Koho volíte do vedení spolku? |
| `Q_Nada_1_2`    | Naďa      | `VOLBA_VEDENI` | Koho volíte do vedení spolku? |
| `Q_Lubos_1_2`   | Luboš     | `VOLBA_VEDENI` | Koho volíte do vedení spolku? |

**Anketa se nepozná z tvaru ID.** Vyžadovat vzor typu `Q_*_1_2` by znamenalo, že přejmenování otázky tiše rozbije hlasování. Explicitní sloupec je spolehlivější a autor vidí příslušnost na první pohled.

Prázdný sloupec `Anketa` = běžná otázka, vyhodnocuje se jen pro svou postavu.

#### Funkce v jazyce podmínek

| Zápis                        | Vrací | Význam                     |
| ---------------------------- | ----- | -------------------------- |
| `VITEZ(VOLBA_VEDENI)`        | ID    | Hodnota s nejvíc hlasy     |
| `HLASY(VOLBA_VEDENI, Karel)` | číslo | Kolik hlasů dostal Karel   |
| `HLASY_CELKEM(VOLBA_VEDENI)` | číslo | Kolik hlasů bylo odevzdáno |

Zadaný příklad se pak zapíše takhle:

```
VITEZ(VOLBA_VEDENI) = Karel
```

Další použití, která z toho plynou zadarmo:

```
VITEZ(VOLBA_VEDENI) = Marie AND S_Marie_Control >= 5
HLASY(VOLBA_VEDENI, Karel) >= 4
HLASY(VOLBA_VEDENI, Karel) > HLASY(VOLBA_VEDENI, Marie)
```

Pro víc míst ve vedení existuje **`VITEZOVE(VOLBA_VEDENI, 2)`**, které vrací seznam; porovnání `obsahuje Karel` pak testuje, jestli se do něj vešel.

#### Kdy se anketa vyhodnocuje

**Nová fáze přepočtu, hned po sběru odpovědí** (§7.3). Výsledky anket jsou tedy k dispozici všem dalším fázím — strukturálním efektům, které mění vedení skupiny, i podmínkám variant bloků.

Anketa závisí **jen na odpovědích**, na ničem dalším. Proto jde spočítat jako první a nemůže vzniknout kruhová závislost typu „výsledek volby ovlivní škálu, která ovlivní výsledek volby".

#### Shoda hlasů [ROZHODNUTO]

Dvě hodnoty se stejným nejvyšším počtem hlasů engine **neřeší sám**. Vrátí to jako konflikt a rozhodne org.

Je to stejný mechanismus jako u protichůdných pravidel (§7.3). Tiché rozhodnutí podle abecedy nebo pořadí v tabulce by bylo to nejhorší možné chování: vypadalo by, že všechno funguje, a hru by to zlomilo neviditelně.

Org má dvě možnosti, obě do auditu: **určit vítěze ručně**, nebo **opravit odpověď**, pokud jde o překlep při přepisu.

#### Vedení skupiny jako efekt

Výsledek ankety se propíše do vedení skupiny jako **strukturální efekt** (§7.3, fáze 4):

```
VEDENI(Spolek, VITEZ(VOLBA_VEDENI))
```

Změna vedení tak proběhne dřív než hodnotové efekty a podmínky se na ni můžou spolehnout.

#### Trace

Anketa je přesně ten případ, kde je „žádný black box" (§2) nejvíc v ohrožení: Karel se stane vedoucím, aniž by to šlo vysvětlit z jeho vlastních odpovědí.

Trace proto u každé ankety **vždy uvádí celé sčítání**:

> VOLBA_VEDENI — Karel 3 (Marie, Karel, Vojtěch), Marie 2 (Naďa, Luboš) → vítěz **Karel**

Jmenovitý seznam hlasujících je nutný. Bez něj nejde dohledat překlep při přepisu z papíru.

#### Kontroly konzistence

- Anketa, kde některá zúčastněná otázka nemá odpověď — vyhodnocení se nespustí (§6.3).
- Odpověď v anketě odkazující na neexistující postavu.
- Podmínka volající `VITEZ` nebo `HLASY` s ID ankety, která v `N_Questions` není.
- Anketa s jedinou zúčastněnou otázkou — skoro jistě překlep ve sloupci `Anketa`.

---

## 5. Hlavní workflow (cyklus kapitoly)

```
[1] Import konfigurace z tabulky (.xlsx) a šablon (.md)
        ↓
[2] Sběr odpovědí ve dvou vlnách: papíry od hráčů, pak organizátorské otázky (§6.7)
        ↓
[3] Validace vstupů (chybějící, konfliktní)
        ↓
[4] PŘEPOČET — engine aplikuje pravidla
        ↓
[5] Náhled výsledku + trace „proč"          ← org kontroluje
        ↓
[6] Editovatelný JSON mezivýstup             ← org ručně opravuje
        ↓
[7] Potvrzení → vygenerování .md dokumentů a zipu (§10.4)
        ↓
[8] Snapshot stavu + označení kapitoly jako vydané (§3.2)
```

Krok [4] musí jít spustit **opakovaně a nedestruktivně** (dry-run) — org si může přepočet pustit stokrát, než ho potvrdí.

---

## 6. Vstupy

### 6.1 Typy otázek [ROZHODNUTO]

| Typ            | Popis                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `bool`         | Ano / Ne                                                                       |
| `single`       | Výběr jedné hodnoty ze seznamu (např. „Kdo ze 3 osob se stal vedoucím směny?") |
| `multi`        | Výběr více hodnot ze seznamu                                                   |
| `scale_direct` | Přímé zadání čísla na škále (např. „Kolik máš na spořáku?")                    |
| `text`         | Volný text (`_OTHER_`), nevstupuje do výpočtu, jen do dokumentů                |

**Explicitně NEIMPLEMENTOVAT:** podmíněné podotázky („pokud X → zobraz podotázku Y"). Autoři je vědomě vyškrtli. Dotazník je plochý.

### 6.2 Zdroje vstupů

1. **Odpovědi hráčů** — hlavní zdroj, na konci každé kapitoly.
2. **Vstupy od orgů** — organizátorské otázky (§6.7): sňatky, rozvody, stavy účtů. Dále zásahy do děje a přepsání odpovědi.
3. **Náhoda** — hod kostkou tam, kde to pravidlo vyžaduje (§7.4).

### 6.3 Chybějící data [ROZHODNUTO]

**Výchozí odpovědi neexistují.** Každá odpověď je vždy explicitně zadaná člověkem.

Když postava nedodá odpověď (hráč nedorazil, ztracený papír), **game master dotazník vyklikne ručně** podle toho, jaký outcome chce.

Důsledky:

- Přepočet kapitoly **nelze spustit**, dokud nejsou zodpovězené všechny otázky. Aplikace vypíše seznam chybějících.
- Odpověď doplněná orgem se v auditu označí příznakem „doplněno orgem", aby šlo po hře poznat, co přišlo od hráče a co ne.
- Žádné tiché doplňování hodnot na pozadí. Nikdy.

### 6.4 Rozvržení aplikace a zadávání odpovědí [ROZHODNUTO]

**Klasické rozvržení webové aplikace, ne tabulka.** Mřížka byla zvažována a zamítnuta.

Důvod, proč je detail postavy správně: org přepisuje **jeden papírový dotazník po druhém**. Rozvržení, kde je na obrazovce právě ta postava, jejíž papír má org v ruce, odpovídá skutečnému postupu práce. Mřížka by ho nutila hledat řádek a hlídat, že píše do správného. Při 23 postavách navíc mřížka nic neušetří — vyhrála by až u stovek řádků.

**Horní lišta**

- Přepínač běhu, **barevně odlišený** (§3.3).
- Kapitoly 1 / 2 / 3 se stavem (`rozpracovaná` / `spočítaná` / `vydaná`).
- Sekce, **pět** [ROZHODNUTO]: **Postavy · Skupiny · Přepočet · Výstupy · Správa**.
- Vpravo jméno z pole „Kdo jsi?" (§3.1).

**Levý panel — seznam postav**

- Jméno, skupina a **indikátor vyplněnosti**: nevyplněno / rozpracováno / hotovo. Barva plus tvar, ne jen barva.
- Nahoře souhrn: **„Vyplněno 14 / 23"**.
- Hledání podle jména a filtr „jen nevyplněné".
- Panel si drží pozici při přepínání postav — org projíždí seznam shora dolů.

**Hlavní plocha**

- Dotazník vybrané postavy: ~3 otázky, každá se svým typem ovládání (§6.1).
- Pod dotazníkem aktuální stav škál postavy, ať je vidět kontext. U sdílených škál značka, s kým jsou sdílené (§4.4).
- **Automatické ukládání** po každé změně, s viditelným potvrzením. Žádné tlačítko „Uložit", na které se dá zapomenout.
- Tlačítko **„Hotovo a další nevyplněná"** — hlavní cesta procházení. Klávesová zkratka.
- U odpovědi doplněné orgem (§6.3) viditelná značka „doplněno orgem".

**Ostatní sekce**

- **Skupiny** — členové, vedení, stav skupiny.
- **Přepočet** — spuštění, konflikty k rozhodnutí (§7.3), náhled změn s trace „proč" (§7.5).
- **Výstupy** — dvě záložky nad jedním výsledkem přepočtu:
  - _Přehled_ — stavy škál a pásma všech postav. Tady tabulka smysl dává.
  - _Dokumenty_ — vygenerované `.md`, tlačítko „Kopírovat do schránky" (§10.5), stažení zipu.
- **Správa** — nahrání `.xlsx` a šablon, archiv nahraných souborů, výsledky validací (§11), audit log. Věci, které se nedělají denně.

Sedm sekcí bylo zvažováno a **sloučeno na pět**. Výsledky a Dokumenty jsou dva pohledy na jeden výstup; Konfigurace a Audit jsou obojí správa, ne denní práce. Lišta se sedmi položkami se navíc nevejde do rozumné šířky.

**Vzhled**
Nástroj pro práci pod časovým tlakem, ne prezentační web. Hustá, dobře čitelná sazba, žádné velké prázdné plochy, stav vždy viditelný bez rolování. Musí být použitelné na notebooku i na tabletu, ve světlém i tmavém režimu.

Aplikace **smí být hezká a mít lehkou retro stylizaci** odkazující na prostředí hry (socialistické Československo) — hlavně v **barevné paletě**, tlumenými a mírně vybledlými odstíny, případně střídmou volbou písma. **Čistota a čitelnost mají ale přednost před stylizací.** Retro nese barva a typografie, ne textury, ozdobné rámečky ani grafika napodobující starý papír.

### 6.5 Konfigurace se nastaví jednou a pak se nemění [ROZHODNUTO]

**Verzování konfigurace bylo zvažováno a zamítnuto jako nadbytečné.** Průběh je jednodušší, než původní návrh předpokládal:

```
Příprava celé hry v tabulce (všechny tři kapitoly)
        ↓
Založení běhu → nahrání .xlsx a šablon → validace → chyby? → oprava v tabulce → nahrát znovu
                                                   → v pořádku → běh startuje
```

**Před prvním přepočtem** se dá konfigurace nahrávat znovu a znovu bez ptaní. Je to fáze ladění, nic se nepřepisuje, protože ještě nic nevzniklo.

**Po prvním přepočtu** je konfigurace zmrazená. Otázky, škály ani bloky se v rozjetém běhu nemění.

Odpadá tím celá verzovací mašinérie: žádná tabulka verzí, žádný řetěz revizí, žádné porovnávání dvou importů proti sobě. Aplikace si drží **jednu platnou konfiguraci na běh**.

#### Archiv místo verzí [ROZHODNUTO]

Aby zůstala zachovaná auditovatelnost (§2, bod 2), aplikace si u každého importu **odloží nahraný soubor tak, jak přišel** — `.xlsx` i `.md` šablony, jako přílohy běhu.

Je to levnější a úplnější než diff: po hře jde přesně dohledat, z čeho se počítalo, a nikdo nemusel psát porovnávací logiku.

#### Když se konfigurace přece jen změnit musí

**Celý běh je připravený předem.** Obsah všech tří kapitol, včetně šablon a bloků, je hotový dřív, než běh začne. Dopisování obsahu za chodu se nepočítá.

Zbývá jediný důvod ke změně: **oprava chyby, která se ukáže až v průběhu** — překlep v textu bloku, špatně napsaná podmínka. Tu musí jít opravit, jinak by se s ní musel dohrát zbytek hry.

Nahrání opravené konfigurace do rozjetého běhu proto **je možné**, ale:

1. Vyžaduje potvrzení a důvod, obojí do auditu.
2. Aplikace označí už spočítané kapitoly jako **`dotčené`** a nechá orga rozhodnout, co s nimi — stejný mechanismus jako u opravy odpovědi (§3.2).
3. Původní soubor zůstává v archivu běhu.

Je to nouzová cesta, ne součást běžného postupu.

### 6.6 Otázky jsou per postava [ROZHODNUTO]

Neexistuje sdílená sada otázek. **Každá z 23 postav má vlastní ~3 otázky na kapitolu** (~69 otázek na kapitolu, ~207 na celou hru).

Důsledky pro implementaci:

- Otázka je vždy navázaná na konkrétní postavu (viz konvence ID `Q_Marie1_1`).
- Volby odpovědí často odkazují na **jiné postavy** („Karel", „Mirek"). Musí odkazovat na **ID postavy z registru**, ne na volný text — jinak se po sňatku nebo přejmenování rozpadne provázání (§8.8).
- Autorský objem je velký a ručně psaný → kontroly konzistence (§11) jsou o to důležitější.

### 6.7 Organizátorské otázky [ROZHODNUTO]

Některá rozhodnutí nedělají hráči, ale orgové mezi kapitolami — typicky sňatky, rozvody a stavy účtů. **Je jich málo, jsou to výjimky.**

**Otázka má proto v `N_Questions` sloupec `Zdroj`:**

| Hodnota | Význam                                                            |
| ------- | ----------------------------------------------------------------- |
| `hráč`  | Výchozí. Objeví se ve vytištěném dotazníku, hráč ji vyplní.       |
| `org`   | **Do dotazníku pro hráče se netiskne.** Vyplní ji org v aplikaci. |

Jinak se organizátorská otázka chová úplně stejně jako hráčská: stejné typy (§6.1), stejné dopady na škály, stejné zapínání bloků a příznaků, stejná pravidla. **Je to jen jiný zdroj vstupu, ne jiný mechanismus** — engine mezi nimi nerozlišuje.

Přes organizátorské otázky se zadávají sňatky a rozvody (§4.4), stavy osobních a společných účtů po sňatku a cokoli dalšího, co orgové rozhodnou mimo hru.

#### Zobrazení v UI [ROZHODNUTO]

Organizátorské otázky jsou **v jednom proudu s ostatními otázkami postavy**, na svém místě podle pořadí — ne v odděleném bloku. Je jich málo, takže zvláštní sekce by byla víc práce než užitku a rozbila by plynulý průchod dotazníkem.

Odlišuje je jen **decentní značka „zadává org"** u otázky. Ta stačí, aby org při přepisu z papíru nehledal něco, co na papíře není.

Z téhož důvodu **jeden ukazatel postupu** v levém panelu, ne dva. Organizátorské otázky se počítají jako každé jiné.

#### Párové otázky [ROZHODNUTO]

Sňatek se týká dvou postav. **Zadává se ale jen jednou.**

Otázka nese příznak **`párová`**. Její odpověď odkazuje na ID jiné postavy (§6.6) a aplikace tutéž odpověď **zobrazí i u té druhé postavy, provázanou** — změna na jedné straně se okamžitě projeví na druhé. V datech existuje **jedna odpověď**, ne dvě zrcadlené.

Důsledky:

- **Odpadá celá třída konfliktů.** Oboustranné potvrzení s hlášením nesouladu není potřeba — nesoulad nemůže vzniknout, když je odpověď jen jedna.
- Zůstává jiná kontrola: **postava smí být cílem nejvýše jednoho sňatku v kapitole** a smí být nejvýše v jedné domácnosti (§4.4). Hlídá to validace (§11).
- U provázané odpovědi je vidět, u které postavy byla zadaná.

#### Příznak `Soukrome`

Otázka může nést příznak **`Soukrome`**, kterým se její finanční dopady směřují **vždy na osobní účet**, i u vdané postavy (§4.4). Na to se zapisují příjmy, o kterých partner neví.

#### Absolutní hodnota vs. posun [ROZHODNUTO]

Organizátorská otázka typu `scale_direct` nastavuje hodnotu **absolutně**. Musí být jasné, co se stane, když na tutéž škálu míří i posuny z jiných odpovědí.

**Pravidlo: absolutní nastavení se aplikuje na začátku hodnotové fáze, před všemi posuny.** Org zadá výchozí stav a delty se do něj promítnou. Každé absolutní nastavení je v trace zvlášť viditelné.

**Absolutní nastavení musí vždy jmenovat konkrétní účet**, tedy `S_Marie_Wealth_osobni`, nikdy směrované `S_Marie_Wealth` (§4.4).

#### Dopad na průběh kapitoly

Sběr odpovědí přirozeně probíhá **ve dvou vlnách** — nejdřív přepis papírů od hráčů, pak porada orgů a doplnění zbytku. Aplikace kvůli tomu nepotřebuje nic zvláštního; platí jen obecné pravidlo, že přepočet nejde spustit, dokud něco chybí (§6.3).

---

### 6.8 Podmíněné otázky od druhé kapitoly [ROZHODNUTO]

V kapitole 1 dostane každá postava svou pevnou sadu otázek. **Od kapitoly 2 se otázky liší podle toho, jak dopadla kapitola předchozí.**

`N_Questions` má proto pro N ≥ 2 sloupec **`Condition`**:

| Hodnota                   | Význam                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `NONE`                    | Otázka se položí vždy                                                                    |
| `V_Marie_1_Questions_1_A` | Otázka se položí, **jen když byla vybraná tahle varianta** bloku typu `Questions` (§8.2) |

Ukázka z nástřelu:

| Character | Condition                 | ID            | Text                                    |
| --------- | ------------------------- | ------------- | --------------------------------------- |
| Marie     | `NONE`                    | `Q_Marie_2_1` | Kdo by měl vést partu ochránců přírody? |
| Marie     | `V_Marie_1_Questions_1_A` | `Q_Marie_2_2` | Podaří se Mari sehnat podporu…          |
| Marie     | `NONE`                    | `Q_Marie_2_3` | Vybrali tě za novou členku…             |

**Podmínka je jedno Variation ID, ne výraz.** Rozhodování se odehrálo už při vyhodnocení bloku, kde jsou k dispozici plné výrazy včetně `AND`, `OR` a `RANDOM` (§4.5). Tady stačí odkaz na výsledek. Kdyby podmínka byla druhý výraz, tatáž logika by existovala na dvou místech a rozcházela by se.

#### Jak to funguje dohromady

1. Blok typu `Questions` v `N_Content` vybere podle svých podmínek právě jednu variantu.
2. Otázky v `N_Questions`, které se na tu variantu odkazují, se položí. Ostatní ne.
3. Protože z bloku vyhrává vždy **právě jedna** varianta, jsou otázky navázané na různé varianty téhož bloku **vzájemně vylučující**. Přepínání větví dotazníku je tím vyřešené bez jediného pravidla navíc.

Postava tak může dostat v kapitole 2 úplně jinou sadu otázek než její kolega, podle toho, kam se její příběh stočil.

#### Není to totéž co podotázky

§6.1 zakazuje **podmíněné podotázky uvnitř jednoho dotazníku** („pokud X, zobraz Y"). To platí dál — dotazník, který hráč dostane do ruky, je plochý.

Tohle je něco jiného: celá sada otázek pro **příští** kapitolu se sestaví předem, mezi kapitolami, na základě už uzavřených odpovědí. Hráč dostane hotový plochý papír.

#### Kontroly konzistence

- `Condition` odkazující na Variation ID, které v `N_Content` neexistuje.
- `Condition` odkazující na variantu bloku typu `Historie` — ten se na výběr otázek nepoužívá.
- Varianta bloku typu `Questions`, na kterou se neodkazuje žádná otázka — buď zbytečná, nebo překlep.
- **Postava, která by v kapitole nedostala ani jednu otázku.** Skoro jistě chyba v podmínkách.

---

## 7. Engine pravidel („střeva")

### 7.1 Sémantika pravidla

Pravidlo je deklarativní řádek:

```
PODMÍNKA  →  EFEKT   [priorita, váha]
```

- **PODMÍNKA** — logický výraz nad odpověďmi, škálami a příznaky. Může být složená z více dílčích podmínek (`A AND B`, `A OR B`, `NOT A`, `S_X > 5`). Zapisuje se strukturovaně v listu `N_Conditions` (§4.5).
- **EFEKT** — jedna nebo více akcí:
  - změna škály (`S_Marie_Wealth_osobni += 3`)
  - nastavení / zrušení příznaku (`Svatba = true`)
  - zařazení postavy do škálového pásma
  - přiřazení textového bloku do dokumentu
  - změna členství ve skupině / vedení skupiny
  - vznik nebo zánik domácnosti (§4.4)

### 7.2 Váhy

Faktory mají různou váhu. Váha je číslo u pravidla nebo u dopadu odpovědi; výsledná hodnota škály = součet vážených příspěvků. Váhy musí být editovatelné v tabulce, ne v kódu.

### 7.3 Konflikty, negace, priority [ROZHODNUTO]

- **Negace / vyloučení:** musí jít zapsat pravidlo typu _„pokud nastalo E a zároveň F, pak D nikdy nenastane"_. Vyloučení má vždy přednost před přiřazením.
- **Priorita:** každé pravidlo má prioritu. **Nižší číslo je silnější** a při protichůdných výsledcích vyhrává (§7.6). Přímé dopady odpovědi mají prioritu 0, tedy nejsilnější.
- Pokud dvě pravidla se **stejnou** prioritou dají protichůdný výsledek, engine to **nevyřeší sám** — vyhodí to jako konflikt do UI a nechá rozhodnout orga.

#### Efekty cílící na dvojici

Většina efektů se týká postavy, která odpověděla. **Sňatek ne** — vytváří domácnost ze dvou postav. Efekt proto umí nést **cíl odvozený z odpovědi**: odpověď odkazuje na ID jiné postavy (§6.6) a efekt `vznik domácnosti` ji vezme jako druhého člena.

Totéž platí pro zánik domácnosti a pro změnu vedení skupiny, kde odpověď určuje, kdo se stal vedoucím.

#### Sňatek se zadává jednou [ROZHODNUTO]

Sňatek zadává org přes **párovou otázku** (§6.7): odpověď se vyplní u jedné postavy a zobrazí se provázaně i u druhé. V datech je **jedna odpověď**, ne dvě.

Oboustranné potvrzení s hlášením nesouladu tím **odpadá** — nesoulad nemůže vzniknout. Engine místo toho hlídá jen to, že postava není cílem víc než jednoho sňatku v kapitole a není ve víc než jedné domácnosti (§11).

#### Pořadí vyhodnocení (fixní)

1. Sběr všech odpovědí
2. **Vyhodnocení anket** — sčítání hlasů napříč postavami, výsledky jsou dál k dispozici všem fázím (§4.7)
3. Aplikace vyloučení (negací)
4. **Strukturální efekty** — vznik a zánik domácností, sňatky, změny členství a vedení skupin. Podle priority sestupně.
5. **Hodnotové efekty** — nejprve absolutní nastavení hodnot z organizátorských otázek (§6.7), pak změny škál a příznaků podle priority sestupně. **U směrovaných škál se tady rozhoduje cílový účet podle rodinného stavu z fáze 4** (§4.4). U škál s rozsahem `domácnost` se efekty členů sčítají, pokud pravidlo nenese příznak „aplikovat jednou za domácnost“ (§4.4).
6. Vyhodnocení pásem na škálách
7. **Výběr variant bloků** — u typu `Historie` text do dokumentu, u typu `Questions` výběr otázek pro další kapitolu (§8.2, §6.8)
8. Detekce a nahlášení zbylých konfliktů

**Fáze 4 musí proběhnout celá před fází 5.** Sdílená škála potřebuje vědět, kdo do domácnosti patří, dřív než se do ní začnou sčítat příspěvky. Kdyby se sňatek vyhodnotil až mezi změnami škál, výsledek by závisel na pořadí pravidel — a to je přesně ten nedeterminismus, kterému se vyhýbáme.

### 7.4 Náhoda [ROZHODNUTO]

Model je jednoduchý: **hoď digitální kostkou a výsledek ulož jako data.**

1. Výraz si vyžádá hod — funkce `RANDOM(50)` v podmínce znamená padesátiprocentní pravděpodobnost. Aplikace vygeneruje číslo.
2. Výsledek se **uloží ke konkrétní postavě, kapitole a variantě bloku** jako běžná hodnota — stejně jako odpověď hráče.
3. **Přepočet hod NEOPAKUJE.** Použije uložené číslo. Přehodit lze jen výslovnou akcí orga („Přehodit"), která se zapíše do auditu včetně staré hodnoty.
4. Org může hozené číslo ručně přepsat. I to jde do auditu.

Tím je dohledatelnost splněná bez jakéhokoli seedování — v datech prostě stojí, co padlo.

**Rozbíjení shod:** pokud dvě postavy („dvojníci") vyjdou se stejným výsledkem tam, kde to není žádoucí, systém na to upozorní a org rozhodne, koho posunout jinam. Rozhodnutí je v auditu viditelné.

### 7.5 Čitelnost logiky [ROZHODNUTO]

Logika algoritmu musí být **human-readable**. Pravidla se v UI zobrazují v přirozeném jazyce, ne jako kód. Např.:

> _„Protože Marie odpověděla ‚Karel' na Q_Marie1_1 (+3 Wealth) a je členkou Srdce party (−2 Regime), její Wealth vzrostl z 4 na 7 → pásmo ‚Zajištěná'."_

---

### 7.6 Rozhodnutí k vyhodnocování [ROZHODNUTO]

Odpovědi na otázky, které vyplynuly z první implementace enginu.

#### Směrované účty platí

`S_Marie_Wealth` **bez přípony je platný zápis** a engine ho směruje podle rodinného stavu (§4.4). `CLAUDE.md` a schéma vzniklé před touto změnou jsou zastaralé a je třeba je srovnat, ne naopak.

#### Priorita: nižší číslo je silnější [ROZHODNUTO]

Sjednocení napříč dokumentem — dřív se to lišilo mezi pravidly a variantami bloků.

| Priorita | Co                                            |
| -------- | --------------------------------------------- |
| `0`      | **Přímé dopady odpovědi.** Nejsilnější.       |
| `1`…     | Pravidla, explicitně zapsaná                  |
| `100`    | Výchozí priorita pravidla bez uvedené hodnoty |

**Odpověď tedy pravidlo nepřebije.** Odpověď je fakt, který zadal člověk; pravidlo je odvozenina. Kde má odvozenina fakt potlačit, zapíše se jako **vyloučení** (negace), které má absolutní přednost (§7.3). Konflikt mezi odpovědí a pravidlem tím nevzniká.

U variant bloků platí totéž: nižší `Priority` se vyhodnocuje dřív a vyhrává.

#### Kdy se čtou podmínky [ROZHODNUTO]

- **Podmínky pravidel** se vyhodnocují nad **stavem na začátku kapitoly** a nad odpověďmi.
- **Podmínky variant bloků** se vyhodnocují nad **hotovým stavem po fázi 6**.

Plyne to z pořadí fází (§7.3) a je to nutné: `S_Marie_Wealth_spolecny >= 7` musí vidět hodnotu, kterou org nastavil v téže kapitole. Kdyby varianty četly stav ze začátku kapitoly, popisovaly by loňský svět.

#### Co je protichůdný efekt [ROZHODNUTO]

| Typ efektu          | Protichůdné je                        |
| ------------------- | ------------------------------------- |
| Příznak             | `true` proti `false`                  |
| Absolutní nastavení | dvě různé hodnoty na tutéž škálu      |
| Domácnost           | dva sňatky, nebo sňatek proti rozvodu |
| Vedení skupiny      | dva různí vedoucí                     |
| **Posun škály**     | **nikdy** — posuny se sčítají         |

**Ořez na hranice 1–10 se dělá jednou, až po sečtení všech posunů.** Jinak by výsledek závisel na pořadí, ve kterém se posuny aplikovaly.

#### Nedopočítané hodnoty [ROZHODNUTO]

Když strategie sloučení nebo rozdělení nechá hodnotu otevřenou — je nastavená na `otazka`, nebo vyjde neceločíselný průměr — a žádná odpověď ji nenastaví, engine vrátí konflikt **`nedopocitano`**.

**Engine hodnotu nikdy nedopočítá sám.** Je to totéž pravidlo jako všude jinde: kde není jasno, rozhoduje člověk.

#### Sňatek do obsazené domácnosti [ROZHODNUTO]

Když má být uzavřen sňatek s postavou, která už v domácnosti je, engine vrátí **strukturální konflikt** a nic nemění. Org buď opraví odpověď, nebo nejdřív zadá rozvod.

#### `RANDOM(p)` [ROZHODNUTO]

- Význam: hod 1–100, podmínka platí při hodnotě **≤ p**. `RANDOM(50)` je tedy padesát procent.
- **Každý výskyt `RANDOM` ve výrazu má vlastní hod.** Klíč je `(postava, kapitola, varianta nebo pravidlo, pořadí výskytu ve výrazu)`.
- Sdílení jednoho hodu mezi víc výskytů bylo zvažováno a zamítnuto: `RANDOM(50) AND RANDOM(50)` musí dávat 25 %, ne 50 %. Autor hry počítá s nezávislými hody a index výskytu je levný.
- Hod se ukládá a přepočet ho neopakuje (§7.4).

#### Vokabulář efektů [ROZHODNUTO]

Efekt v `Effects` je funkce s argumenty. Jiné než tyhle neexistují:

| Zápis                          | Význam                                    |
| ------------------------------ | ----------------------------------------- |
| `SNATEK(<postava>)`            | Vznik domácnosti s uvedenou postavou      |
| `ROZVOD()`                     | Zánik domácnosti, které je postava členem |
| `VEDENI(<skupina>, <postava>)` | Uvedená postava se stává vedoucím skupiny |
| `CLENSTVI(<skupina>)`          | Postava vstupuje do skupiny               |
| `KONEC_CLENSTVI(<skupina>)`    | Postava skupinu opouští                   |
| `PRIJMENI(<text>)`             | Změna příjmení postavy (§8.8)             |

**Skupina je povinný argument** u `VEDENI` i `CLENSTVI` a import ji musí uložit. `ODCHOD` bez argumentu se ruší — nahrazuje ho `KONEC_CLENSTVI`.

#### Sloupec `Blocks` u odpovědi se ruší [ROZHODNUTO]

Původně měl zapínat bloky. V modelu §8.2 se ale **vyhodnocuje vždy každý blok** a o výsledku rozhodují podmínky jeho variant. Sloupec by tedy neměl žádný účinek.

U odpovědi zůstávají `Scale Impact`, `Flags` a `Effects`.

#### Změna příjmení po sňatku [ROZHODNUTO]

V prostředí hry si příjmení bere jen někdo, takže **se nemění automaticky**.

- Vlastní příjmení se změní jen efektem `PRIJMENI(<text>)`, typicky z organizátorské otázky.
- Proměnná **`{PRIJMENI_PARTNER}`** se odvozuje z domácnosti: je to příjmení druhého člena. Mimo domácnost se vyhodnotí jako chyba, ne jako prázdný řetězec.

#### ID domácnosti [ROZHODNUTO]

ID **nesmí kódovat jména členů.** `H_2_Marie_Mirek` přestane sedět v okamžiku rozvodu nebo úmrtí a stane se z něj matoucí nálepka.

Použij neprůhledné ID (`H_<běh>_<pořadí>`) a členy drž ve vazební tabulce. Čitelný popis („domácnost Marie a Mirka") se skládá až při zobrazení, z aktuálního členství.

---

## 8. Výstupy

### 8.1 PDF se negeneruje [ROZHODNUTO]

Aplikace **negeneruje PDF ani nefinalizuje sazbu**. Cílové dokumenty žijí jako **Google Docs**, které orgové ručně doeditují a vytisknou přímo z Googlu.

Úkolem aplikace je dokument **naplnit**, ne vysázet.

### 8.2 Bloky a jejich varianty [ROZHODNUTO]

Varianty textu žijí v tabulce, šablona obsahuje jen značku. Struktura listu `N_Content`:

| Sloupec                 | Význam                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `Character`             | Které postavy se blok týká. Vyplněno jen na prvním řádku skupiny.                           |
| `Block ID`              | Identifikátor bloku, `B_<Postava>_<Kapitola>_<Typ>_<Pořadí>`. Vyplněno jen na prvním řádku. |
| `Variation ID`          | Identifikátor varianty                                                                      |
| `Variation Description` | Poznámka autora, do výstupu nejde                                                           |
| `Variation Text`        | Text vkládaný do dokumentu. U typu `Questions` zůstává prázdný.                             |
| `Priority`              | Pořadí vyhodnocení, nižší číslo dřív                                                        |
| `Conditions`            | Výraz, §4.5                                                                                 |

**Vyhodnocení bloku:** varianty se procházejí **vzestupně podle `Priority`** a použije se **první, jejíž podmínka platí**. Varianta s podmínkou `DEFAULT` je vždy pravdivá, stojí poslední a zaručuje, že blok vždy něco vrátí. Mezi variantami proto **nevznikají konflikty** a engine nemusí nic hlásit orgovi.

#### Dva typy bloků [ROZHODNUTO]

| Typ         | Co vybraná varianta dělá                                                             |
| ----------- | ------------------------------------------------------------------------------------ |
| `Historie`  | Její `Variation Text` se vloží do dokumentu na místo značky `{BLOK <Block ID>}`      |
| `Questions` | Funguje jako **přepínač**: rozhoduje, které otázky se v další kapitole položí (§6.8) |

**Jiné typy nejsou.** Blok je buď kus textu do dokumentu, nebo rozcestník pro příští dotazník.

U typu `Questions` je `Variation Text` **prázdný** — varianta nenese text, je to jen značka, na kterou se odkazují otázky. Text otázek žije v `N_Questions`, ne tady.

#### Typ se odvozuje z ID bloku [ROZHODNUTO]

Samostatný sloupec `Type` není potřeba. ID bloku má pevný tvar:

```
B_<Postava>_<Kapitola>_<Typ>_<Pořadí>

B_Marie_1_Historie_1    → typ Historie
B_Marie_1_Questions_2   → typ Questions
```

Typ nese **předposlední segment**. Parser ho přečte a namapuje na `Historie` nebo `Questions`.

`<Kapitola>` je kapitola, **ze které se blok odvozuje**, ne číslo listu — viz níže.

Protože na tvaru ID teď závisí chování, **musí být hlídaný validací**, ne dohadovaný:

- ID, které tvaru neodpovídá, je **chyba importu**.
- Neznámý typ v předposledním segmentu je **chyba importu**, ne tiché zařazení mezi `Historie`.
- Chyba se hlásí s návrhem: „`B_Marie_1_Historei_1` — neznámý typ `Historei`, mysleli jste `Historie`?"

Bez těchhle dvou kontrol by překlep v názvu tiše změnil chování bloku a poznalo by se to až z vytištěných materiálů.

#### Kdy se `N_Content` počítá [ROZHODNUTO]

**List `N_Content` obsahuje materiál pro kapitolu N, ale počítá se z odpovědí kapitoly N−1.**

Proto v konfiguraci **žádný `1_Content` není** — do první kapitoly se nic nepočítá, hráči do ní vstupují s materiály připravenými ručně.

```
odpovědi kapitoly 1  →  vyhodnocení 2_Content  →  ┬→  texty do dokumentů pro kapitolu 2
                                                  └→  výběr otázek v 2_Questions
```

Pořadí je tím dané a kruhová závislost nemůže vzniknout: bloky se vyhodnotí z toho, co už je zodpovězené, a teprve pak se z nich odvodí, na co se bude ptát dál.

**Číslo kapitoly v ID bloku a varianty je kapitola, ze které se odvozují.** Bloky a varianty v listu `2_Content` mají v ID `1` (`B_Marie_1_Historie_1`, `V_Marie_1_Questions_1_A`), v `3_Content` mají `2`. Totéž platí pro Variation ID ve sloupci `Condition` otázek (§6.8): `2_Questions` odkazuje na `V_Marie_1_…`.

### 8.3 Naplnění dokumentu [ROZHODNUTO]

Šablona je Markdown se značkami. Aplikace v ní **nahradí značky textem vybraných variant** a proměnné hodnotami.

```
[1] Org stáhne šablonu z Google Docu jako Markdown a nahraje do aplikace
[2] Aplikace zpracuje text:
      - u každé značky {BLOK B_...} vybere variantu podle priority a podmínek
      - vloží její Variation Text (prázdný text = značka zmizí beze stopy)
      - nahradí proměnné ({PRIJMENI} apod.)
[3] Org stáhne výsledek (zip) nebo použije „Kopírovat do schránky"
[4] Vloží do cílového Google Docu přes „Vložit z Markdownu"
[5] Doedituje a vytiskne z Googlu
```

Vkládání textu nevadí, protože celý dokument je v té chvíli obyčejný Markdown a formátování řeší až vložení do Google Docu (§8.5). Původní obava z poškození formátování se týkala úprav přes Google API, které nepoužíváme.

### 8.4 Značky v šabloně [ROZHODNUTO]

| Značka                                        | Význam                                           |
| --------------------------------------------- | ------------------------------------------------ |
| `{BLOK <Block ID>}`                           | Nahradí se textem vybrané varianty z `N_Content` |
| `{JMENO}`, `{PRIJMENI}`, `{VEK}`, `{SKUPINA}` | Proměnná, nahradí se hodnotou ze stavu postavy   |

Značky jsou **jednoduché, nepárové** — text nese tabulka, ne šablona.

Pravidla:

- **Žádná značka nesmí přežít do výsledného dokumentu.** Zbylá značka = chyba, aplikace ji nahlásí před uložením.
- Blok, který je v šabloně a chybí v `N_Content`, i blok v `N_Content`, na který nevede značka = chyba validace (§11).
- Text mimo značky je fixní část šablony a aplikace se ho nedotkne. Sem patří charakterizace postavy, která se nemění (§4.6).

### 8.5 Round-trip: ověřeno [OVĚŘENO]

Test proveden na reálném dokumentu `Marie Balážová`:

> Stažení do Markdownu → smazání obsahu → vložení upraveného Markdownu zpět přes pravý klik → **Vložit z Markdownu**.
> **Výsledek: dokument vypadá stejně.** Formátování se neztratilo.

**Důsledek: platí postup §8.3, záložní varianta přes `deleteContentRange` se nebude stavět.**

**Zbývá ověřit jedno (~15 minut, při stavbě Google vrstvy v týdnu 11):**
Ruční „Vložit z Markdownu" v editoru a **programové nahrání přes Drive API** jsou dvě různé cesty. API varianta je `files.create` / `files.update` s `mimeType: text/markdown` a konverzí na `application/vnd.google-apps.document`. Chová se obvykle stejně, ale je to jiný kód a je potřeba to potvrdit na stejném dokumentu.

**Ruční vložení jako oficiální záložní režim [ROZHODNUTO]**

Právě ověřený ruční postup je plnohodnotná záložní cesta, ne nouzovka:

- Aplikace vždy umí vyprodukovat hotový `.md` soubor pro každou postavu — čistě lokálně, bez sítě.
- Org ho v nejhorším vloží do dokumentu ručně přes „Vložit z Markdownu".
- 23 postav × pár sekund = pár minut práce.

**Tím přestává být Google vrstva kritická.** I kdyby se nestihla nebo na hře selhala, hra proběhne. To je hlavní důvod, proč je v harmonogramu až na týdnu 11.

### 8.6 Typy dokumentů

1. **Dokument postavy** — hlavička, Životopis, Zlomové body, ekonomický status (spořák, bony, firemní byt/auto, přístup do skladu), vášně/obavy/ambice (§9).
2. **Dokument skupiny** — výpis členů, kdo skupinu vede, variabilní odstavce podle stavu skupiny.
3. **Highlight událostí** — souhrn pro hráče: svatby, odchody do důchodu, povýšení.
4. **Sada otázek pro další kapitolu** — dotazníky k tisku.

### 8.7 Vlaječky / tagy [ROZHODNUTO]

Engine umí vygenerovat jednoduchý tag pro orga typu:

> _„Nastala událost X → vytáhni dokument č. 42, ne č. 28."_

Jde o strojově čitelný signál pro fyzické materiály připravené mimo systém.

### 8.8 Průchod jména napříč texty [ROZHODNUTO]

Sňatek mění příjmení. Jméno postavy proto **nesmí být natvrdo v textech ani v textech bloků** — všude se používá značka `{PRIJMENI}` / `{JMENO}`, která se rozvine až při naplnění dokumentu. Totéž platí pro názvy skupin a funkcí.

---

## 9. Šablona postavy

- **Vztahy** — nejsou datový model (§4.6). Struktura drží jen členství ve skupině, vedení skupiny a domácnost; zbytek je text v šabloně.
- **Odstavce** — část napevno, část podle voleb (podmíněné bloky).
- **Vášně, obavy, ambice** — mění se **vždy** v každé kapitole. Jde o destilaci životní situace postavy a toho, co chce. Zadané už v kapitole 1, dál se přepočítávají.
- **Natvrdo zadané rysy** (např. „jsi závislý na piku") — jsou součástí **pevného textu šablony**, ne datového modelu. Engine o nich neví a nemůže je přepsat.
- Formát: **Google Doc** se značkami `{BLOK ...}` a `{PROMENNA}` (§8.3). Vždy ručně upravitelný před tiskem.

---

## 10. Vstupy a výstupy jako soubory

### 10.1 Rozhodnutí: verze 1 nesahá na Google [ROZHODNUTO]

**Aplikace v1 nemá žádné napojení na Google. Komunikuje se světem výhradně přes soubory, které si uživatel stáhne a nahraje.**

```
Google Sheet  --stáhnout .xlsx-->  APLIKACE  --stáhnout .zip-->  Google Docs
Google Docs   --stáhnout .md--->             (vložit z Markdownu)
```

Co tím odpadá — a je to hodně:

- Service account, projekt v Google Cloud, klíče, `supportsAllDrives`.
- Fronta operací pro offline režim (celý subsystém, který by se musel napsat a odladit).
- Riziko, že se aplikace na hře zablokuje na síti.
- Bezpečnostní starosti s uloženým klíčem.

**Aplikace tím přestává mít jakoukoli síťovou závislost v pipeline.** Jediné, co potřebuje být dostupné, je aplikace sama.

**Cena:** ruční kroky. Odhad na kapitolu: nahrát 2 soubory, stáhnout 1 zip, pak u ~23 postav otevřít dokument a vložit obsah z Markdownu. Zhruba **15–25 minut na kapitolu**, třikrát za hru. To je přijatelná daň za zmizení celé jedné vrstvy složitosti.

### 10.2 Vstup: konfigurace

**Jeden `.xlsx` soubor, žádný jiný formát [ROZHODNUTO].** Google Sheet se stáhne přes _Soubor → Stáhnout → Microsoft Excel_, což zachová **všechny listy v jednom souboru**, a nahraje se do aplikace.

Nahrávání jednotlivých `.csv` bylo zvažováno a zamítnuto — deset listů by znamenalo deset souborů a druhou cestu, kterou je třeba udržovat.

Po importu je zdrojem pravdy databáze aplikace. Do prvního přepočtu jde nahrávat opakovaně a volně, pak už jen výjimečně (§6.5). Chybná konfigurace nesmí aplikaci shodit — vypíše se seznam chyb s odkazem na řádek a list.

### 10.3 Vstup: šablony dokumentů

Šablony jsou Google Docs se značkami (§8.4). Do aplikace se dostanou jako **Markdown soubory**: _Soubor → Stáhnout → Markdown_, pak nahrát do aplikace (víc souborů najednou nebo v zipu).

Šablony se nahrávají **jednou za kapitolu**, ne pokaždé. Aplikace si je pamatuje a ukáže, které postavě která šablona patří a která chybí.

### 10.4 Výstup: jeden zip

Po potvrzení přepočtu aplikace nabídne ke stažení **jeden archiv**:

```
beh-<nazev>_kapitola-<N>.zip
├── dokumenty/
│   ├── postava_<ID>_<Prijmeni>.md
│   ├── skupina_<ID>_<Nazev>.md
│   └── highlighty.md
├── dotaznik-kapitola-<N+1>.md
├── vysledky.xlsx          ← stav škál, vybrané bloky, příznaky (k nalepení do tabulky)
└── beh.json               ← kompletní stav + trace, strojově čitelný archiv
```

Pojmenování je odvozené strojově, konzistentní napříč kapitolami i běhy.

### 10.5 Ruční vložení do Google Docs [ROZHODNUTO]

Org otevře cílový dokument, označí obsah, smaže ho a vloží obsah `.md` souboru přes **pravý klik → Vložit z Markdownu**. Postup je **ověřený na reálném dokumentu** (§8.5) a formátování se zachovává.

Aby to nebylo únavné, aplikace u každého dokumentu zobrazí **tlačítko „Kopírovat do schránky"**. Org pak jen přepíná mezi záložkami a mačká Ctrl+V — nemusí rozbalovat zip ani otevírat soubory.

### 10.6 Fáze 2: napojení na Google [FÁZE 2]

Až bude v1 funkční a odzkoušená, může přibýt přímé napojení jako **volitelné zrychlení**, ne jako náhrada. Souborová cesta zůstává navždy funkční — je to záložní režim pro případ, že síť nebo API selže.

Co by fáze 2 přinesla:

- Načtení konfigurace přímo z tabulky podle jejího ID.
- Vytvoření složky běhu na Sdíleném disku a nahrání dokumentů.
- Zápis výsledků zpět do tabulky.

Technické podklady, až na to dojde:

- Disk je **Sdílený disk (Shared Drive)** → autentizace přes **service account**, žádný OAuth. Soubory tam vlastní disk sám, takže chybějící kvóta service accountu nevadí.
- Volání Drive API musí posílat `supportsAllDrives: true` a při hledání `includeItemsFromAllDrives: true`. Bez toho API Sdílený disk neuvidí a mlčky vrátí prázdno.
- Nasdílenou tabulku lze číst i úplně bez přihlášení, přes veřejnou CSV export URL.
- **Pravidlo jednosměrného zápisu:** do vytvořeného dokumentu už aplikace nikdy nesahá. Přegenerování vytvoří nový soubor s verzí v názvu. Ruční práce orgů se nikdy nepřepisuje.

---

## 11. Kontrola konzistence

Sada automatických kontrol (list `Validations`), spuštitelná kdykoli:

1. Otázka bez odpovědí / odpověď bez otázky
2. Odkaz na neexistující škálu, postavu nebo skupinu
3. Nedosažitelné pravidlo (podmínka nemůže nikdy nastat)
4. Protichůdná pravidla se stejnou prioritou
5. Textový blok, na který nevede žádná cesta / postava bez dokumentu
6. Blok v šabloně bez odpovídajícího záznamu v `N_Content`, nebo blok v `N_Content`, na který nevede žádná značka (§8.4)
   6b. **Blok bez varianty `DEFAULT`** — hrozí, že neprojde žádná podmínka a blok nevrátí nic (§8.2)
   6c. **Syntakticky vadný výraz v `Conditions`** — chybějící závorka, neznámý operátor. V ukázkovém listu už jeden takový je: `!(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3` bez uzavírací závorky.
   6d. **Odkaz ve výrazu na neexistující odpověď, škálu nebo příznak**
   6e. **Dvě varianty téhož bloku se stejnou `Priority`** — výsledek by závisel na pořadí řádků
7. Postava ve více domácnostech zároveň, nebo cílem více než jednoho sňatku v kapitole (§6.7)
8. Domácnostní škála bez definované strategie sloučení a rozdělení (§4.4)
9. Žádná odpověď v kapitole nesahá na jeden z dvojice účtů `_osobni` / `_spolecny` — skoro jistě překlep v ID škály (§4.4)
10. Absolutní nastavení (`scale_direct`) používající směrované jméno škály bez přípony (§4.4)
11. Podmínka volající `VITEZ` nebo `HLASY` s ID ankety, která v `N_Questions` neexistuje; anketa s jedinou zúčastněnou otázkou (§4.7)
12. ID bloku neodpovídající tvaru `B_<Postava>_<Kapitola>_<Typ>_<Pořadí>`, nebo neznámý typ v předposledním segmentu; blok typu `Questions` s vyplněným `Variation Text` (§8.2)
13. `Condition` u otázky odkazující na neexistující Variation ID, nebo na variantu bloku typu `Historie` (§6.8)
14. Varianta bloku typu `Questions`, na kterou se neodkazuje žádná otázka (§6.8)
15. **Postava, která by v kapitole nedostala ani jednu otázku** (§6.8)
16. Značka `{BLOK}` v šabloně odkazující na blok typu `Questions` — ten se do dokumentů nevkládá

---

## 12. Vizualizace [NICE TO HAVE]

- **Mind mapa s bublinami** — postavy jako uzly, vazby a vlivy jako hrany.
- Účel: **ladění vah a kalibrace systému předem**, ne provoz během hry.
- Umožní vidět, kdo je osamostatněný a kdo silně provázaný s ostatními.
- Nízká priorita — implementovat až po funkčním jádru.

---

## 13. Nefunkční požadavky

| Požadavek             | Detail                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nasazení**          | Cloud s normální adresou (§18.1). Bez Dockeru, bez tajných klíčů.                                                                                  |
| **Síťové závislosti** | V1 žádné mimo aplikaci samotnou (§10.1). Záložním režimem při výpadku je papír.                                                                    |
| **Tisk**              | Řeší se v Google Docs, aplikace PDF negeneruje (§8.1).                                                                                             |
| **Izolace běhů**      | 2 běhy současně. `run_id` v každé tabulce, datová vrstva ho vyžaduje povinně, barevné odlišení v UI (§3.3).                                        |
| **Škála**             | 23 postav a 7 skupin na běh × 3 kapitoly. Přepočet celého běhu do jedné sekundy. Objem dat je malý — optimalizovat na srozumitelnost, ne na výkon. |
| **Perzistence**       | Postgres (§18.1). Plný export dat do souborů.                                                                                                      |
| **Audit log**         | Append-only. Kdy, co se změnilo, jaká byla hodnota před a po, které pravidlo to způsobilo.                                                         |
| **Jazyk UI a dat**    | Čeština, včetně diakritiky v ID a exportech.                                                                                                       |
| **Autentizace**       | Jedno sdílené heslo + nepovinné pole „Kdo jsi?" pro audit (§3.1).                                                                                  |

---

## 14. Rozsah MVP

**V1 (musí být do prvního běhu) — bez jakéhokoli napojení na Google:**

1. Import konfigurace z nahraného `.xlsx` + validace
2. Nahrání šablon jako Markdown souborů
3. Rozvržení aplikace a zadávání odpovědí (§6.4)
4. Engine: podmínky, efekty, priority, negace, váhy
5. Trace „proč" u každé změny
6. JSON mezivýstup → editace → zip s `.md` dokumenty + „Kopírovat do schránky"

**Fáze 2 (jen když zbude čas, nic z toho není nutné):**

- Přímé napojení na Google Sheets a Drive (§10.6) jako volitelné zrychlení
- Vizualizace vazeb
- Pokročilé kontroly konzistence
- Porovnání dvou běhů vedle sebe

---

## 15. Doporučený stack [ROZHODNUTO]

**Kontext:** jeden vývojář, umí React, ochoten se doučit. Deadline ~3 měsíce. Malý objem dat, offline provoz.

| Vrstva             | Volba                                | Proč                                                                                                                                                                 |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | **Next.js** (App Router, TypeScript) | React, který vývojář zná, plus server v jednom procesu. Jeden příkaz na spuštění, žádné oddělené backendové repo.                                                    |
| **Databáze**       | **Postgres** (Neon)                  | §18.1. **Přístup k datům drž za tenkou vrstvou**, aby se dal poskytovatel vyměnit bez přepisování aplikace.                                                          |
| **Přístup k DB**   | **Drizzle ORM** nebo prosté SQL      | Malé schéma, není potřeba nic těžkého.                                                                                                                               |
| **Import tabulky** | **SheetJS (`xlsx`)**                 | Čte všechny listy `.xlsx` bez konfigurace.                                                                                                                           |
| **Google API**     | **V1 se nepoužívá** (§10.1)          | Fáze 2. Až na to dojde: `googleapis` + service account.                                                                                                              |
| **Zip**            | `jszip` nebo `archiver`              | Sbalení výstupních `.md` a `.xlsx` do jednoho archivu.                                                                                                               |
| **PDF**            | **Neřeší se**                        | Tisk je v Google Docs (§8.1).                                                                                                                                        |
| **UI**             | **MUI (Material UI)**                | Hotové komponenty pro rozvržení z §6.4: `AppBar`, `Tabs`, `Drawer`, `List`, formulářová pole. `DataGrid` pro tabulku v sekci Výstupy. Šetří čas, který patří enginu. |
| **Testy**          | **Vitest** — jen na engine pravidel  | Zbytek se testuje ručně, engine ne. Viz níže.                                                                                                                        |

**Architektonické pravidlo (nejdůležitější v tomhle dokumentu):**
Engine pravidel (§7) je **čistá funkce v TypeScriptu**, bez databáze, bez sítě, bez Reactu:

```
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Díky tomu jde otestovat na desítkách scénářů bez rozjetí aplikace a `trace[]` je rovnou podklad pro vysvětlení „proč" (§7.5). Kdyby engine sahal do databáze, ztratíš obojí.

**Podmínky jsou výrazy v jedné buňce** (§4.5), protože tak je autorka už píše. **Parser ale nepiš** — použij `jsep` nebo `expr-eval` a nad jejich stromem napiš vlastní vyhodnocení. Vlastní gramatiku nepiš nikdy.

**Nasazení:** propojené GitHub repo, `git push` = nasazeno (§18.1). Lokálně `npm run dev`.

### 15.1 MUI — na co si dát pozor [ROZHODNUTO]

**Nastavení v Next.js App Routeru.** MUI potřebuje `AppRouterCacheProvider` z balíčku `@mui/material-nextjs`, jinak při načtení stránky problikne nestylovaný obsah. Komponenty MUI používají React Context, takže patří do `'use client'` stromu — server komponenty nechej na načítání dat.

**Vlastní téma, ne výchozí Material.** Výchozí vzhled MUI je rozpoznatelný Material Design a neodpovídá tomu, co chceme (§6.4: hustá sazba, lehká retro paleta). Proto hned na začátku vytvoř `theme.ts` přes `createTheme`:

- `palette` — tlumené, mírně vybledlé odstíny místo výchozí modré. Sem patří i barvy běhů A a B (§3.3).
- `typography` — menší základní velikost písma, než má MUI ve výchozím stavu.
- `components` — globální `defaultProps: { size: 'small', margin: 'dense' }` pro pole a tlačítka. Bez toho bude aplikace o třetinu rozvolněnější, než potřebujeme.
- `colorSchemes` pro světlý a tmavý režim.

**Uprav téma, ne jednotlivé komponenty.** První volba je vždy `theme.ts` — `palette`, `typography` a hlavně `components` s `defaultProps` a `styleOverrides`. Když mají všechna tlačítka vypadat jinak, změní se téma, ne tlačítka. Aplikace zůstane jednotná a změna vzhledu je záležitost jednoho souboru.

#### Pravidla stylování [ROZHODNUTO]

Nejsou to preference vzhledu, ale **výkonnostní požadavky**. `sx`, `styled()` s dynamickými props i inline `style` alokují nové objekty a spouštějí přepočet stylů při každém renderu. Ve stromech, které se překreslují často a po položkách — seznamy, karty, grafy, tooltipy, menu — se to sčítá do viditelného sekání na starším železe.

- **Jen CSS Modules** — jeden `.module.css` na komponentu, vedle ní v jejím adresáři.
- **Žádný `sx` prop** — zakázaný všude, i na komponentách MUI.
- **Žádný `styled()` s dynamickými props** — žádné generování stylů za běhu v render cestě.
- **Žádné inline `style` objekty v JSX.** Jediná výjimka je geometrie virtualizace (`transform`, `height`, `top`, `left`, `width` na absolutně pozicovaných řádcích) — to jsou hodnoty známé až za běhu, které do CSS Modules nepatří.
- **Stavové styly přes data atributy**, ne přes podmíněné pole tříd:

  ```tsx
  <div
    data-selected={isSelected}
    data-compact={isCompact}
    data-cancelled={isCancelled}
    data-filtered-out={isFilteredOut}
  >
  ```

  CSS cílí `[data-selected="true"]`. Čisté a bez režie v JS.

- **`Typography` z MUI je v pořádku. Layoutové komponenty MUI (`Box`, `Stack`, `Grid`) jsou zakázané** ve stromech, které se často překreslují — karty, grafy, tooltipy, menu.

Pravidla uplatňuj **globálně, ne jen v kritických místech.** Určovat u každé komponenty, jestli ještě leží v horké cestě, je víc práce než psát všechno stejně — a hranice se v průběhu vývoje stejně posouvá.

**`DataGrid` jen v sekci Výstupy.** Je to velká komponenta; jinde stačí obyčejná `Table` nebo `List`. Zadávání odpovědí přes `DataGrid` nedělej — rozvržení z §6.4 je záměrně formulářové, ne mřížkové.

**Indikátory vyplněnosti barvou i tvarem** (§6.4). MUI ikony to umožňují — `RadioButtonUnchecked`, `Adjust`, `CheckCircle` se liší tvarem, ne jen barvou.

### 15.2 Harmonogram (3 měsíce, jeden člověk)

| Týdny | Cíl                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| —     | ~~Test round-tripu (§8.5)~~ — **hotovo, prošlo.** Návrh výstupní vrstvy je potvrzený. |
| 1–2   | Datové schéma + import tabulky + validace importu                                     |
| 3–5   | Engine pravidel jako čistá funkce + testy. **Nejrizikovější část, dělej ji brzy.**    |
| 6–7   | Rozvržení aplikace, seznam postav, zadávání odpovědí (§6.4)                           |
| 8–9   | Trace „proč" + JSON mezivýstup + editace                                              |
| 10    | Naplňování dokumentů — mazání bloků v Markdownu lokálně, bez Googlu                   |
| 11    | Zip výstupu, „Kopírovat do schránky", kontroly konzistence                            |
| 12    | Rezerva, zkušební průchod celou kapitolou na reálných datech                          |

**Zkušební průchod s reálnými daty naplánuj nejpozději na týden 12**, ne na den před hrou. Vizualizace (§12) do tohoto plánu nepatří — je to fáze 2.

**Google vrstva je poslední, ne první.** Je to jediná část, kterou lze při skluzu vypustit: aplikace vygeneruje Markdown, org ho vloží do dokumentů ručně. Hra se odehraje. Kdyby se Google dělal na začátku a nestihl se engine, hra se neodehraje.

## 16. Zodpovězeno

| #   | Otázka                    | Odpověď                                                                                                  |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Kdo zadává odpovědi?      | Vždy orgové. Jediná role, žádné hráčské účty.                                                            |
| 2   | Vztah ke Google Workspace | **V1 žádný.** Komunikace přes soubory: `.xlsx` dovnitř, `.md` ven. Napojení až fáze 2 (§10.1).           |
| 3   | Offline provoz            | Vyřešeno tím, že v1 nemá síťové závislosti. Při výpadku se píše na papír.                                |
| 4   | Rozsah                    | 23 postav, 7 skupin, ~3 otázky na postavu a kapitolu.                                                    |
| 5   | Výchozí hodnoty odpovědí  | Neexistují, vše se zadává ručně.                                                                         |
| 6   | Škály                     | Celá čísla 1–10, clamp, 4 pásma (1–3 / 4–5 / 6–8 / 9–10) editovatelná v `N_Scales`.                      |
| 7   | Otázky                    | Každá postava má vlastní otázky, žádná sdílená sada.                                                     |
| 8   | Počáteční stav postav     | V tabulce, list `Characters`. Nic dalšího se o postavách nemodeluje.                                     |
| 11  | PDF                       | Negeneruje se, tisk je v Google Docs.                                                                    |
| 12  | Značky v šabloně          | Nepárové `{BLOK <ID>}` a `{PROMENNA}`. Text variant žije v `N_Content`, do šablony se **vkládá** (§8.2). |
| 14  | Round-trip přes Markdown  | **Otestováno, formátování se zachovalo.** Postup §8.3 platí.                                             |
| 13  | Google disk               | **Sdílený disk (Shared Drive)** → ve fázi 2 autentizace přes service account, žádný OAuth.               |
| 15  | Nasazení                  | Server od začátku (cloud, §18.1), aby bylo kam ve fázi 2 přidat Google. Varianta bez serveru zamítnuta.  |
| 16  | Přihlášení a běhy         | Sdílené heslo + pole „Kdo jsi?". Běh = `2026-09-12_A`, viz §3.1–3.3.                                     |
| 17  | Uzamykání kapitol         | **Nikdy nevratné.** Měkká pojistka s odůvodněním, následující kapitoly se značí jako dotčené (§3.2).     |
| 9   | Deadline                  | ~3 měsíce.                                                                                               |
| 10  | Vývoj a údržba            | Jeden vývojář v týmu, React, ochoten se doučit. Stack viz §15.                                           |

## 17. [OTEVŘENÉ] Zbývá doplnit

Nic blokujícího. Během implementace bude potřeba doladit:

1. Přesné znění a strukturu listu `Characters` (zatím v tabulce neexistuje).
2. Názvy pásem pro každou škálu zvlášť (prahy jsou dané, popisky ne).
3. Konkrétní podobu šablon dokumentů — vzniknou při psaní obsahu kapitol.

---

## 18. Nasazení a provoz

Protože v1 nemá žádnou síťovou závislost ani tajné klíče (§10.1), nasazení se výrazně zjednodušuje.

### 18.1 Model A: cloud (doporučeno)

**Aplikace běží na běžném hostingu, orgové ji otevřou na normální adrese.** Žádné IP adresy, žádný terminál, žádné „musíš být na naší wifi". To je zásadní pro to, aby ji ostatní organizátoři vůbec chtěli používat.

| Vrstva   | Volba                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Hosting  | **Vercel** — od tvůrců Next.js, nasazení propojením GitHub repa, `git push` = nasazeno. Nejblíž tomu, co znáš z GitHub Pages. |
| Databáze | **Neon (Postgres)** — Vercel ho připojí na pár kliknutí, má free tier.                                                        |

**Proč ne SQLite ve Vercelu:** nemá trvalý disk, každé nasazení začíná s prázdným souborovým systémem. _(Alternativa se SQLite: **Fly.io** nebo **Railway** s připojeným diskem — levnější provoz, víc konfigurace.)_

**Přístup:** aplikace je na veřejném internetu, takže **jedno sdílené heslo je povinné**, ne volitelné.

**Když vypadne signál:** orgové zapíšou odpovědi na papír a zadají je později. Žádná synchronizace se nepíše. Pauzy mezi kapitolami trvají hodiny, hodinový výpadek se v nich ztratí — a dokumenty se stejně tisknou z Google Docs, což bez signálu taky nejde.

### 18.2 Model B: notebook v lokální síti — zamítnut [ROZHODNUTO]

Zvažován a **zamítnut**. Aplikace by běžela lokálně (`npm start`) a ostatní by se připojovali přes IP notebooku v lokální síti, s SQLite místo Postgresu.

Důvody zamítnutí:

1. **Ostatní organizátoři by to nepoužívali.** IP adresy, terminál a „musíš být na naší wifi" jsou bariéra, kterou dobrovolníci nepřekousnou. Nástroj, který tým nechce používat, je horší nástroj.
2. **Provozní křehkost:** firewall blokující port, měnící se IP, usínající notebook. Každá z těch věcí umí shodit práci na hře.
3. **Offline výhoda je menší, než vypadá** — dokumenty se stejně vkládají a tisknou z Google Docs, což bez signálu taky nejde.

**Záložní režim při výpadku je papír**, ne druhá instance aplikace. Orgové zapíšou odpovědi na papír a zadají je, až bude signál. Žádná synchronizace se nepíše.

### 18.3 Nikdy dvě živé kopie [ROZHODNUTO]

Kdyby v budoucnu přece jen vznikla lokální instance, platí: **nikdy neprovozovat dvě živé kopie zároveň.** Vznikly by dvě rozcházející se databáze, které nejde sloučit. V jednu chvíli je zdrojem pravdy právě jedna instance a přepnutí je vědomý ruční krok.

### 18.4 Varianta bez serveru — zamítnuta [ROZHODNUTO]

Zvažována a **zamítnuta**, i když v1 nemá tajné klíče a technicky by na GitHub Pages běžela.

Důvody:

1. **Server je od začátku, aby bylo kam ve fázi 2 přidat Google** (§10.6). Přidat `googleapis` do existující serverové aplikace je práce na odpoledne; předělat statickou aplikaci na serverovou je přepis.
2. **Dva souběžné běhy a víc orgů** potřebují jedno sdílené místo pro data. Stav v souboru, který si někdo stáhne a příště nahraje, by se při dvou bězích a více lidech nevyhnutelně rozešel.
3. **Data v prohlížeči jednoho člověka nejsou archiv** (§2, bod 2).

### 18.5 Zálohování [ROZHODNUTO]

**Tlačítko „Zazálohovat":**

1. Vytvoří konzistentní snapshot databáze (`pg_dump`, případně vlastní export všech tabulek běhu do JSON).
2. Nabídne ho ke stažení. Org ho odloží na Sdílený disk nebo flashku.

**Zálohovat po každé vydané kapitole.** Poslední snapshot spolu s `beh.json` a exportem konfigurace je kompletní archiv běhu (§2, bod 2).

### 18.6 Databázový soubor nepatří na Google Drive [ROZHODNUTO]

Netýká se zvoleného řešení (Postgres v cloudu), ale platí, kdyby kdokoli později sáhl po SQLite: **nechat `.db` soubor ve složce synchronizované Google Drivem, Dropboxem nebo OneDrivem vede ke ztrátě dat.** Sync klient nepodporuje zamykání částí souboru, neumí sloučit binární konflikt a dokáže nahrát rozepsaný stav uprostřed transakce.

Na Drive patří **snapshoty** (§18.5), ne živá databáze.

### 18.7 Verzování a archiv

- Kód v gitu.
- Pro každý běh se uloží: snapshot databáze, `beh.json`, importovaná konfigurace a výstupní zipy jednotlivých kapitol.
