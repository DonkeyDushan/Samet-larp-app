# CLAUDE.md

Interní webová aplikace pro organizátory LARPu: zpracuje dotazníky z konce
kapitoly, přepočítá stav postav a vygeneruje materiály pro další kapitolu.

**Zdroj pravdy o zadání je `documents/zadani-larp-engine.md`.** Sekce označené
`[ROZHODNUTO]` se neotevírají znovu. Tenhle soubor je jen shrnutí pravidel,
která platí v každé session.

Rozsah: **23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy**, ~3 otázky na
postavu a kapitolu, jediná role (organizátor), deadline ~3 měsíce. Objem dat je
malý — **optimalizuj na srozumitelnost, ne na výkon.**

## Kde si zadání odporuje samo se sebou

Zadání vznikalo postupně a tři místa zůstala z dřívějšího návrhu. **Platí vždy
konkrétní revidovaná sekce, ne souhrnná tabulka.** Fixtures v `documents/` to
potvrzují.

| Zastaralé místo | Co říká | Co platí |
|---|---|---|
| §16, řádek 12 | značky `{BLOK}`…`{/BLOK}` jsou párové, nevybrané bloky se mažou ze šablony | **§8.2 + §8.4:** značky jsou **nepárové**, varianty textu žijí v listu `N_Content` |
| §7.1 a §15 | podmínky pravidel se zapisují strukturovaně do listu `N_Conditions` | **§4.5:** podmínky jsou **výrazy v jedné buňce**, parsuje je knihovna |
| §15 | „nepiš parser, začni strukturovanými sloupci" | **§4.5:** ten návrh je výslovně **zrušen** — autor hlasoval tím, jak tabulku píše |

§8.2 i §4.5 ten obrat samy pojmenovávají („Upraveno podle reálného listu
`2_Content`", „Dřívější návrh … se tím ruší"). Když na některé z těch tří míst
narazíš, **neřiď se jím.**

## Tři architektonická pravidla

### 1. Engine pravidel je čistá funkce

```ts
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Žije v `src/engine/`. **Bez databáze, bez sítě, bez Reactu, bez importů z `app/`.**
Musí jít otestovat na desítkách scénářů bez rozjetí aplikace. ESLint to hlídá
(`no-restricted-imports` v `eslint.config.mjs`) — když to pravidlo začne
překážet, není chyba v ESLintu.

`trace[]` je zároveň podkladem pro vysvětlení „proč" v UI. Nese **data
s popisky, ne hotovou větu** — formulace je věc UI a musí jít změnit bez
přepočítávání. Kdyby engine sahal do databáze, ztratíš testovatelnost i trace.

**Tohle je nejdůležitější pravidlo v celém projektu** (§15).

### 2. `run_id` je v každé tabulce a v každém dotazu

Dva běhy hry běží současně a jejich data se **nesmí potkat** (§3.3).

- Každá tabulka s herními daty nese `run_id` (kontroluje test `src/db/schema.test.ts`).
- Každý odkaz uvnitř běhu je **složený cizí klíč** `(run_id, id)`. Databáze sama
  odmítne odpověď z běhu A navázanou na otázku z běhu B.
- Aplikační kód se k datům dostává **výhradně přes `forRun(runId)`**
  (`src/db/run-scope.ts`). Neomezené spojení `unscopedDb` není v
  `src/db/index.ts` exportované; smí ho importovat jen skripty (seed, záloha,
  migrace) a je to v diffu vidět.
- Chybí-li dotaz, který `RunScope` neumí, přidej metodu **do `RunScope`**,
  ne obcházení v aplikaci.

Izolace drží **strukturou kódu, ne kázní.**

V UI platí navíc: přepínač běhu trvale v hlavičce na každé obrazovce,
**odlišná barva rozhraní pro každý běh** (A modrá, B jantarová), potvrzovací
dialogy u zásadních akcí vždy jmenují běh („Uzamknout kapitolu 2 běhu
**2026-09-12_B**?"), název běhu je v názvu každého exportu.

### 3. Nic se nepřepisuje destruktivně

- Každý přepočet je **nový řádek** v `computations`, nikdy update. Dry-run jde
  pustit stokrát.
- Stav postav je snapshot na kapitolu s vazbou na verzi přepočtu
  (`computation_id`). Nepřepisuje se.
- Nová šablona nebo konfigurace = nová verze, stará zůstává.
- Všechny cizí klíče jsou `on delete restrict`. **Archivovaný běh se nikdy nemaže**
  a zůstává navždy prohlížitelný včetně odpovědí, stavů a trace.
- `audit_log` je **append-only** a vynucuje to databázový trigger
  (`db/sql/001_audit_append_only.sql`), ne jen konvence. U každé změny je
  zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po
  a které pravidlo změnu způsobilo.

Jediné místo, které smí mazat, je seed skript — a jen svůj vlastní lokální běh.

**Důsledek pro import:** konfigurační entity se při reimportu **neaktualizují
mazáním**. Každá nese `source_config_version_id`; entita, kterou nová verze už
nepřinesla, si nechá starý otisk a tím vypadne z aktivní sady. Nic se nemaže.

## Technologie [ROZHODNUTO]

| Vrstva | Volba |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Databáze | Postgres (Neon), lokálně `scripts/pg.sh` nebo Docker |
| ORM | Drizzle |
| UI | Tailwind, vlastní jednoduché komponenty |
| Testy | Vitest, primárně na engine pravidel a import |
| Import tabulek | SheetJS (`xlsx`) |
| Výrazy v podmínkách | `jsep` |
| Zip | `jszip` |
| Hosting | Vercel, `git push` = nasazeno |

**Žádné Google API.** Verze 1 komunikuje se světem výhradně přes nahrané
a stažené soubory: `.xlsx` a `.md` dovnitř, `.zip` ven. Napojení na Google je
fáze 2 a **nikdy nenahradí** souborovou cestu — ta zůstává navždy funkční jako
záložní režim.

PDF se negeneruje — tiskne se z Google Docs. Round-trip přes Markdown je
ověřený na reálném dokumentu (§8.5), formátování se zachovává.

## Čtyři vrstvy logiky — pravidlo píš až jako poslední

Většina hry se bez pravidel obejde. Než sáhneš po vyšší vrstvě, zkus nižší:

| Vrstva | Kde je | Co umí |
|---|---|---|
| 1. Dopad na škály | sloupec `Scale Impact` v `N_Questions` | odpověď posune škály |
| 2. Příznaky a efekty | sloupce `Flags` a `Effects` v `N_Questions` | odpověď nastaví příznak, vyvolá sňatek, změní vedení skupiny |
| 3. Varianty bloků | sloupce `Priority` a `Conditions` v `N_Content` | **která varianta textu se použije** |
| 4. Pravidla | list `N_Rules` *(nepovinný)* | logika, která nepatří k jedné odpovědi ani k jednomu bloku |

**Vrstva 4 nemusí v první verzi vzniknout vůbec** (§4.5). Reálný list ukazuje,
že většinu rozhodování nese vrstva 3 přímo u textu, kterého se týká. `N_Rules`
zakládej až ve chvíli, kdy narazíš na něco, co se jinam nevejde — do té doby je
to prázdná struktura navíc. **Fixtures list `N_Rules` ani `N_Conditions` nemají.**

V databázi vrstvy 1, 2 a 4 ústí do jedné tabulky `effects`: u vrstev 1 a 2 je
vlastníkem efektu `answer_option_id`, u vrstvy 4 `rule_id`. Engine je zpracovává
stejným kódem. Vrstva 3 žije v `content_blocks` + `block_variations`.

## Podmínky jsou výrazy, ne strukturované sloupce (§4.5)

Autor hry píše podmínky **jako výraz v jedné buňce**:

```
A_Marie_2_1_Mirek AND !(S_Marie_Wealth_osobni <= 3 OR F_Svatba)
```

**Parser nepiš. Vlastní gramatiku nepiš nikdy.** Používá se `jsep`
(`src/import/expression.ts`), nad jeho stromem se napíše vyhodnocení.

| Prvek | Zápis | Význam |
|---|---|---|
| Odpověď | `A_Marie_1_1_Karel` | postava odpověděla takto |
| Negace | `!A_Marie_1_1_Karel` | neodpověděla |
| Spojky | `AND`, `OR` | `AND` váže silněji |
| Závorky | `( )` | priorita vyhodnocení |
| Škála | `S_Marie_Wealth >= 7` | operátory `=`, `!=`, `>`, `<`, `>=`, `<=` |
| Příznak | `F_Svatba` | příznak je nastaven |
| Náhoda | `RANDOM(50)` | pravděpodobnost v procentech, hod se ukládá (§7.4) |
| Výchozí | `DEFAULT` | vždy pravdivé, stojí poslední |

Dvě věci, na které `jsep` sám nestačí: `AND`/`OR` se musí zaregistrovat jako
binární operátory a autorovo jednoduché `=` se před parsováním přepíše na `==`
(pozor na `<=`, `>=`, `!=`). Podmínka se ukládá **jako text** (`condition_expr`)
plus seznam nalezených referencí — formulace zůstává autorova a validace může
citovat, co napsal.

## Bloky a jejich varianty (§8.2)

**Varianty textu žijí v tabulce, šablona obsahuje jen značku.**

Struktura listu `N_Content`:

| Sloupec | Význam |
|---|---|
| `Character` | které postavy se blok týká — **vyplněno jen na prvním řádku skupiny** |
| `Block ID` | identifikátor bloku, `B_Marie_2_Historie_1` — **jen na prvním řádku** |
| `Variation ID` | identifikátor varianty, `V_Marie_2_Historie_1_A` |
| `Variation Description` | poznámka autora, do výstupu nejde |
| `Variation Text` | text do dokumentu; **smí být prázdný** — varianta „nic se nestalo" |
| `Priority` | pořadí vyhodnocení, nižší číslo dřív |
| `Conditions` | výraz podle §4.5 |

**Vyhodnocení:** varianty se procházejí **vzestupně podle `Priority`** a použije
se **první, jejíž podmínka platí**. `DEFAULT` je vždy pravdivá, takže stojí
poslední a zaručuje, že blok vždy něco vrátí.

Z toho plyne: **mezi variantami nevznikají konflikty.** Priorita rozhoduje
úplně, engine nemusí nic hlásit orgovi. Zato platí dvě validace: dvě varianty
téhož bloku se **stejnou prioritou** jsou chyba (výsledek by závisel na pořadí
řádků) a blok **bez varianty `DEFAULT`** je chyba (nevrátil by nic).

## Značky v šabloně jsou nepárové (§8.4)

| Značka | Význam |
|---|---|
| `{BLOK <Block ID>}` | nahradí se textem vybrané varianty z `N_Content` |
| `{JMENO}`, `{PRIJMENI}`, `{VEK}`, `{SKUPINA}` | proměnná ze stavu postavy |

- **`{/BLOK}` neexistuje.** Text nese tabulka, ne šablona, takže není co uzavírat.
  Zavírací značka v šabloně je chyba validace.
- **Žádná značka nesmí přežít do výsledného dokumentu.** Zbylá značka = chyba.
- Blok v šabloně bez záznamu v `N_Content` i blok v `N_Content`, na který nevede
  žádná značka, jsou chyby validace (§11.6).
- Text mimo značky je pevná část šablony a aplikace se ho nedotkne. Sem patří
  charakterizace postavy, která se nemění (§4.6).
- Prázdný `Variation Text` znamená, že značka zmizí beze stopy.

## Domácnosti a sdílené škály (§4.4)

- **Škála má v definici rozsah platnosti:** `postava` (`Regime`, `Control`) nebo
  `domacnost` (`Wealth_spolecny`, `Bony`, firemní byt, auto).
- **Sdílená hodnota se nikdy nekopíruje mezi postavami.** Má vlastního
  vlastníka: hodnoty škál `postava` leží v `character_scale_values`, hodnoty
  škál `domacnost` v `household_scale_values`.
- **Každá postava je vždy v nějaké domácnosti.** Svobodná postava je domácnost
  o jednom členovi — při založení běhu vznikne jedna na každou postavu. Tím
  v enginu **odpadá větev pro „postavu bez domácnosti"**; nezaváděj ji.
- **Postava smí být nejvýše v jedné domácnosti**; vynucuje to unikát na
  `household_memberships`, ne jen validace.
- **Efekty členů na sdílenou škálu se sčítají** — oba do společného účtu
  vydělávají. Události, které postihnou domácnost jako celek (vykradli vás,
  dostali jste byt), musí mít na pravidle `applies_once_per_household`.
- **Vznik i zánik domácnosti je efekt pravidla**, ne ruční operace:
  `domacnost_slouceni` / `domacnost_rozdeleni`.
- **Cíl efektu umí být odvozený z odpovědi** (§7.3). Efekt nese
  `related_character_id` (jmenovitě) nebo `related_from_answer` (postava, na
  kterou odkazuje vybraná volba odpovědi). Používá se pro partnera při sňatku,
  pro to, kdo se stal vedoucím skupiny, i pro členství. Druhá cesta je ta, kvůli
  které nemusí autor psát pravidlo pro každou kombinaci 23 postav.
- Strategie slévání při sňatku (`soucet` / `prumer` / `vyssi` / `otazka`)
  a dělení při rozvodu (`kopie` / `polovina` / `otazka`) jsou **v definici
  škály**, ne v kódu. Výchozí je součet s ořezem na 10, resp. každý si odnáší
  aktuální hodnotu. Sloučení i rozdělení jde do trace a auditu **s oběma
  původními hodnotami**.
- **Sdílené škály jsou největší riziko pro princip „žádný black box".**
  Mariiny peníze se změní kvůli Mirkově odpovědi. Proto `TraceContribution`
  u sdílené škály **vždy nese `characterId` zdroje** a UI musí říct
  „−3 Wealth, zdroj: odpověď Mirka Pokorného na Q_Mirek2_1". V detailu postavy
  je u sdílené škály značka „společný účet s Mirkem Pokorným" a odkaz na druhou
  postavu. Bez toho je to přesně ten black box, který §2 zakazuje.

## Soukromý i společný účet (§4.4)

Manželé mohou mít obojí. Model to zvládá **bez rozšíření**: jsou to **dvě
samostatné škály s různým rozsahem platnosti**, ne jedna přepínaná do sdíleného
režimu.

| Škála | Rozsah |
|---|---|
| `Wealth_osobni` | `postava` |
| `Wealth_spolecny` | `domacnost` |

- Konvence pojmenování `_osobni` / `_spolecny`, aby se v tabulce nedaly splést.
- **Který účet efekt zasáhne, určuje ID škály v dopadu odpovědi.** Engine nic
  nedomýšlí. Převod mezi účty je jeden efekt nad dvěma škálami
  (`Wealth_osobni−2, Wealth_spolecny+2`) — žádná zvláštní mašinérie.
- **Vznik společného účtu při sňatku se nepočítá automaticky.** Kolik kdo do
  společného vložil, je **otázka v dotazníku**, ne dopočítaná hodnota — hráči si
  to rozehrávají sami. Proto má škála strategii `otazka` = nedopočítávat.
  Totéž u rozdělení při rozvodu: buď otázka, nebo rozhodnutí orga,
  **nikdy tiché dopočítání**.
- Svobodná postava společný účet technicky má (domácnost o jednom členovi), ale
  v dokumentu se neobjeví — zobrazení řídí příznak `Spolecny_ucet` a blok
  v šabloně, ne existence hodnoty.
- **Validace:** když v kapitole žádná odpověď nesahá na jeden z dvojice účtů, je
  to skoro jistě překlep v ID škály — hlas to jako varování.

## Organizátorské a párové otázky (§6.7)

- Otázka má **zdroj**: `hrac` (výchozí) nebo `org`. Organizátorská se
  **netiskne do dotazníku pro hráče**, jinak se chová úplně stejně —
  stejné typy, stejné dopady, stejná pravidla. **Je to jen jiný zdroj vstupu,
  ne jiný mechanismus; engine mezi nimi nerozlišuje.**
- V UI jsou v **jednom proudu** s ostatními otázkami postavy, na svém místě
  podle pořadí, jen s decentní značkou „zadává org". **Ne oddělená sekce a ne
  druhý ukazatel postupu** — je jich málo, zvláštní sekce by rozbila plynulý
  průchod dotazníkem.
- **Párová otázka** (sňatek) se zadává **jen jednou**. V datech existuje
  **jedna odpověď**, ne dvě zrcadlené: řádek v `answers` patří té postavě,
  u které byla zadaná, a druhá ji vidí provázanou přes
  `answer_options.referenced_character_id`. **Nezavádět oboustranné potvrzení
  ani hlášení nesouladu** — nesoulad nemůže vzniknout, když je odpověď jedna.
  U provázané odpovědi je vidět, u které postavy byla zadaná.
- Zůstává validace: postava smí být cílem nejvýše jednoho sňatku v kapitole
  a nejvýše v jedné domácnosti.
- `scale_direct` nastavuje hodnotu **absolutně** a aplikuje se **na začátku
  hodnotové fáze, před všemi posuny**. Každé absolutní nastavení je v trace
  zvlášť viditelné.
- Sběr odpovědí probíhá **ve dvou vlnách** (papíry od hráčů, pak porada orgů).
  Aplikace kvůli tomu nepotřebuje nic zvláštního.

## Pořadí vyhodnocení je dvoufázové (§7.3)

```
1. sběr odpovědí
2. vyloučení (negace) — má přednost před přiřazením
3. STRUKTURÁLNÍ fáze — domácnosti, sňatky, členství a vedení skupin
4. HODNOTOVÁ fáze — nejprve absolutní nastavení z org otázek, pak škály a příznaky
5. pásma
6. detekce zbylých konfliktů
```

**Fáze 3 musí proběhnout celá před fází 4.** Sdílená škála potřebuje vědět, kdo
do domácnosti patří, dřív než se do ní začnou sčítat příspěvky. Kdyby se sňatek
vyhodnotil až mezi změnami škál, výsledek by závisel na pořadí pravidel — a to je
přesně ten nedeterminismus, kterému se vyhýbáme.

Uvnitř fází 3 i 4 se jede **podle priority sestupně**.

Rozdělení efektů do fází je v datech (`STRUCTURAL_EFFECT_KINDS`,
`VALUE_EFFECT_KINDS` v `src/engine/constants/effectPhases.ts`), aby ho implementace `evaluate`
nešla omylem obejít.

## Import konfigurace a validace (§10.2, §11)

Kód je v `src/import/`, čisté funkce bez databáze — celá cesta od souboru
k hlášením jde otestovat na fixtures v `documents/`.

- **Primárně jeden `.xlsx`** se všemi listy (Google Sheet → *Stáhnout →
  Microsoft Excel*). Jednotlivé `.csv` jsou záložní cesta; v UI ji nenabízej
  jako první volbu.
- **Chybná konfigurace nikdy nesmí shodit aplikaci.** Parser sbírá všechny chyby
  a vrátí je najednou, nekončí na první. Autor chce opravit dvacet překlepů
  v jednom kole.
- **Každá hláška musí říct, kde je problém: list, řádek, sloupec, hodnota.**
  „Neplatný odkaz na škálu" je nepoužitelné. „List `2_Questions`, řádek 34,
  sloupec `Scale Impact`: škála `S_Marie_Welth_osobni` neexistuje, mysleli jste
  `S_Marie_Wealth_osobni`?" je použitelné.
- **Chyby blokují** použití konfigurace, **varování pustí dál**.
- **Import je idempotentní.** Dvojí nahrání téhož souboru nesmí nic zdvojit —
  verze se pozná podle otisku obsahu, ne podle názvu souboru ani bajtů (Google
  Sheets přepíše soubor při každém stažení).
- **Každý import je nová verze** a **nový import sám nepřepne rozjetý běh**
  (§6.5). Aktivace verze je vědomý krok a jde do auditu.
- **Fill-down sloučených buněk.** `Character` a `Block ID` jsou vyplněné jen na
  prvním řádku skupiny; parser musí hodnotu dopěstovat dolů. Prázdný řádek
  skupinu ukončuje.
- Prázdné buňky, mezery navíc a nezlomitelné mezery ošetři tiše, ale **spočítej
  je a zmiň v přehledu importu.**
- **Diakritika v ID, názvech listů a exportech musí projít bez poškození.**

**Co se ošetřuje tolerantně** (a hlásí jako varování, ne chyba) — vždycky proto,
že jde o zvyk autora, který by jinak blokoval desítky řádků:

| Jev | Řešení |
|---|---|
| `Věra` ve sloupci `Character` místo ID `Vera` | dohledá se podle jména bez diakritiky; nejednoznačné jméno se **nehádá** |
| `Slouceni`/`Rozdeleni` vyplněné i u škál s rozsahem `postava` | tiše se zahodí (DB tam stejně vyžaduje `NULL`) |
| `kazdy_si_odnasi` | mapuje se na `kopie` |
| `,` i `;` jako oddělovač v `Scale Impact` | beru oba |

**Tolerantní naopak nebýt** u překlepu v ID škály, chybějící šablony, hodnoty
mimo rozsah, domácnostní škály bez strategií, odkazu na neexistující blok nebo
odpověď a nespárované závorky. Tam tolerance znamená špatná čísla v dokumentu —
místo toho nabídni „mysleli jste …?".

**Parsování formátu dopadu na škály je čistá funkce s testy**
(`src/import/scale-impact.ts`). Je to malá věc volaná všude a její chyba se
projeví jako špatná čísla v dokumentech.

Výrazy v `Conditions` se v importu **jen načtou, uloží a zkontrolují syntakticky**
— vyhodnocuje je až engine.

## Co se vědomě nemodeluje

- **Obecná tabulka vztahů.** Strukturně existují jen tři vazby: členství ve
  skupině, vedení skupiny a domácnost. Kde vztah mechanicky rozhoduje, je
  zachycený jako odpověď odkazující na ID jiné postavy — to jsou ta data.
  Všechno ostatní je text v šabloně.
- **Vášně, obavy, ambice.** Jsou to bloky šablony, ne tabulka. Mění se každou
  kapitolu tím, že se vybere jiná varianta. Když má některá ovlivnit pozdější
  kapitolu, přidá se k ní příznak nebo škála — **text sám se do enginu nikdy
  nevrací.**
- **Podmíněné podotázky.** Autoři je vědomě vyškrtli, dotazník je plochý.
- Obecné pravidlo: **text, který se jen tiskne, není datový model; co má
  ovlivnit budoucnost, je škála nebo příznak.**
- **Pásma nejsou per postava.** Definice škály včetně pásem je per běh a škálu;
  dvě postavy nemohou mít u téže škály jiná pásma.

## Doménová pravidla, na která se snadno zapomene

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích.** Ořez se loguje do
  auditu a hlásí v trace — je to signál špatně nastavených vah, ne detail.
  U sdílené škály to platí dvojnásob: přispívá do ní víc lidí, takže se hranice
  dosáhne snáz.
- **Pásma škál mají prahy i názvy v datech, nikdy v kódu.** Výchozí rozdělení
  1–3 / 4–5 / 6–8 / 9–10, ale počet i hranice jsou per škála a názvy jsou
  vlastní pro každou škálu.
- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem.
  Když hráč nedodá papír, org dotazník **vyklikne ručně** a odpověď se v auditu
  označí „doplněno orgem". Přepočet **nelze spustit**, dokud něco chybí;
  aplikace vypíše seznam chybějících. Žádné tiché doplňování na pozadí. Nikdy.
- **Otázky jsou vlastní pro každou postavu.** Žádná sdílená sada, ~3 otázky na
  postavu a kapitolu. Volby odpovědí, které jmenují jinou postavu, odkazují na
  **ID postavy z registru**, ne na volný text — po sňatku se jinak provázání
  rozpadne.
- **Náhoda se hodí jednou a uloží.** `RANDOM(50)` ve výrazu si vyžádá hod;
  výsledek se uloží k postavě, kapitole a variantě bloku jako běžná data.
  Přepočet hod **neopakuje**. Přehodit nebo přepsat lze jen ruční akcí orga,
  která jde do auditu včetně staré hodnoty. Engine nikdy negeneruje náhodu sám —
  dostane ji na vstupu. Žádné seedování není potřeba.
- **Vyloučení (negace) má vždy přednost před přiřazením.** Pořadí vyhodnocení je
  fixní a dvoufázové — viz výše.
- **Dvě pravidla se stejnou prioritou a protichůdným výsledkem engine neřeší** —
  vyhodí konflikt do UI a nechá rozhodnout orga. (Mezi **variantami bloku** ale
  konflikt vzniknout nemůže, tam rozhoduje priorita úplně.)
- **Postavy se nemodelují nad rámec škál, příznaků a členství.** Charakterizace
  („závislý na piku") žije v pevném textu šablony, kterého se engine nedotkne.
- **Jméno postavy nikdy natvrdo v textech** — ani v textech variant. Sňatek mění
  příjmení; všude `{JMENO}` / `{PRIJMENI}`, rozvine se až při naplnění
  dokumentu. Totéž platí pro názvy skupin a funkcí.
- **Kaskáda:** změna odpovědi ve vydané kapitole označí následující kapitoly jako
  `dotčené`. Aplikace **sama nic nepřepočítá** — vynutí si rozhodnutí orga
  (přepočítat / ponechat jak je). Při „ponechat" si zapíše, že se výpočet
  a vydaný stav rozcházejí, a proč. Během hry je zdrojem pravdy **papír v rukou
  hráče**, ne databáze.
- **Uzamčení kapitoly není nikdy nevratné.** Stav `vydaná` je měkká pojistka
  proti překlepu; editace vyžaduje potvrzení a důvod, obojí do auditu.
- **„Běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací.

## Rozvržení aplikace (§6.4)

**Klasická webová aplikace, ne mřížka.** Org přepisuje jeden papírový dotazník
po druhém, takže na obrazovce má být právě ta postava, jejíž papír drží v ruce.
Mřížka byla zvažována a zamítnuta — při 23 postavách nic neušetří.

- **Horní lišta:** přepínač běhu (barevně odlišený), kapitoly 1/2/3 se stavem,
  **pět sekcí — Postavy · Skupiny · Přepočet · Výstupy · Správa**, vpravo jméno
  z pole „Kdo jsi?".
- **Levý panel:** seznam postav se jménem, skupinou a indikátorem vyplněnosti
  (**barva plus tvar**, ne jen barva), nahoře souhrn „Vyplněno 14 / 23",
  hledání a filtr „jen nevyplněné". Panel si drží pozici při přepínání.
- **Hlavní plocha:** dotazník postavy, pod ním aktuální stav škál. **Automatické
  ukládání** po každé změně s viditelným potvrzením — žádné tlačítko „Uložit".
  Tlačítko **„Hotovo a další nevyplněná"** je hlavní cesta procházení, má
  klávesovou zkratku.
- **Vzhled:** nástroj pro práci pod časovým tlakem. Hustá čitelná sazba, stav
  vždy viditelný bez rolování, použitelné na notebooku i tabletu, ve světlém
  i tmavém režimu. Lehká **retro stylizace** (socialistické Československo) je
  vítaná, ale **nese ji barva a typografie** — tlumené vybledlé odstíny —
  **ne textury, ozdobné rámečky ani grafika napodobující starý papír.**
  Čitelnost má přednost před stylizací.

## Jazyk a pojmenování

- UI a data jsou **česky**, včetně diakritiky v exportech.
- Tabulky, sloupce a identifikátory v kódu jsou **anglicky** (`character_scale_values`).
- Hodnoty doménových stavů jsou **česky bez diakritiky** (`rozpracovana`,
  `spocitana`, `vydana`, `prepocet`, `rucni_uprava`) — aby se v SQL literálech
  nemíchala diakritika.
- Dokumentace (`.md`) česky. **Komentáře v kódu anglicky** — viz globální
  `~/.claude/CLAUDE.md`: co nejstručněji, jen k nezjevným věcem, a vysvětlují
  **proč**, ne co kód dělá.

## Konvence ID ze zdrojové tabulky

| Typ | Vzor | Příklad |
|---|---|---|
| Běh | `<datum>_<písmeno>` | `2026-09-12_A` |
| Otázka | `Q_<Postava>_<Kapitola>_<Poradi>` | `Q_Marie_1_1` |
| Odpověď | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel` |
| Škála | `S_<Postava>_<Skala>` | `S_Marie_Wealth_osobni` |
| Blok | `B_<Postava>_<Kapitola>_<Tema>_<Poradi>` | `B_Marie_2_Historie_1` |
| Varianta | `V_<BlockID>_<Pismeno>` | `V_Marie_2_Historie_1_A` |

Dopad na škály: čárkou (nebo středníkem) oddělený seznam
`S_Marie_Wealth_osobni+3, S_Marie_Regime-2`. Prázdná buňka = žádný dopad.
U `scale_direct` se píše `S_Marie_Wealth_osobni=VALUE` — číslo přijde z odpovědi.
Speciální hodnota odpovědi `_OTHER_` = volný text doplněný orgem.

Listy konfigurace: `Characters`, `N_Questions` (otázky, odpovědi, `Zdroj`,
`Parova`, `Scale Impact`, `Blocks`, `Flags`, `Effects`), `N_Scales` (škály,
pásma, rozsah platnosti, strategie slévání), `N_Content`, `Validations`,
volitelně `N_Rules`.

Škála se v databázi ukládá **rozložená**: `S_Marie_Wealth_osobni` = postava
`Marie` + škála `Wealth_osobni`. Definice škály včetně pásem je per běh
a škálu, ne per postavu. **Příznaky se nikde nedeklarují** — vznikají tím, že je
nějaká odpověď nastaví.

## Výstupy

Jeden zip na kapitolu (§10.4): dokumenty postav a skupin, highlighty, dotazník
pro další kapitolu, `vysledky.xlsx` a `beh.json`. Název běhu je součástí názvu
souboru. U každého dokumentu navíc tlačítko **„Kopírovat do schránky"** — org
pak jen přepíná záložky a mačká Ctrl+V (§10.5).

Typy dokumentů (§8.6): dokument postavy, dokument skupiny, highlight událostí,
sada otázek pro další kapitolu. Engine k nim umí vygenerovat **tag pro orga**
(„nastala událost X → vytáhni dokument č. 42") — strojově čitelný signál pro
fyzické materiály připravené mimo systém.

## Postup práce

- Migrace se **negenerují ručně**: `npm run db:generate` ze schématu. Schéma
  v `src/db/schema/` je jediný zdroj pravdy o struktuře databáze.
- Co Drizzle neumí vyjádřit, patří do `db/sql/` jako **idempotentní** skript
  a pouští se `npm run db:sql` po migracích.
- **Unikát, na který míří cizí klíč, musí být `unique()`, ne `uniqueIndex()`.**
  Drizzle generuje `CREATE UNIQUE INDEX` až za `ALTER TABLE ADD CONSTRAINT
  ... FOREIGN KEY`, takže FK na `(run_id, id)` by v migraci neměl na co ukázat
  a migrace spadne. `uniqueIndex()` zůstává jen pro **částečné** unikáty
  s `.where()`, které constraint neumí (aktivní verze konfigurace, vydaný přepočet,
  aktivní šablona).
- Testy pokrývají primárně **engine a import**. Zbytek se testuje ručně. Výjimka:
  `src/db/schema.test.ts` hlídá architektonické pravidlo 2.
- Fixtures pro import jsou v `documents/`: `fixture-platny.xlsx` musí projít,
  `fixture-vadny.xlsx` musí být odmítnutý se všemi chybami najednou.
- **Lokální Postgres:** `scripts/pg.sh start` (bez Dockeru a bez roota).
  Node je přes nvm, v novém shellu je potřeba `source ~/.nvm/nvm.sh`.
- Než začneš stavět další vrstvu, ověř `npm run typecheck` a `npm test`.

## Rozsah MVP (§14)

Do prvního běhu musí být, **bez jakéhokoli napojení na Google**:

1. Import konfigurace z `.xlsx` + validace
2. Nahrání šablon jako Markdown
3. Rozvržení aplikace a zadávání odpovědí
4. Engine: podmínky, efekty, priority, negace, váhy
5. Trace „proč" u každé změny
6. JSON mezivýstup → editace → zip s `.md` + „Kopírovat do schránky"

Fáze 2 (jen když zbude čas): napojení na Google, vizualizace vazeb, pokročilé
kontroly, porovnání dvou běhů. **Google vrstva je poslední, ne první** — je to
jediná část, kterou lze při skluzu vypustit a hra se přesto odehraje.
