# Session 2: Import konfigurace a validace

_Kompletní specifikace je v `zadani-larp-engine.md`. Ten je zdrojem pravdy._

## Kde jsme

Projekt je inicializovaný, datové schéma stojí. Engine ještě neexistuje — a v téhle session ho nezakládej.

## Co se staví teď

**Cesta od nahraného souboru k naplněné databázi, a kontrola, že to, co přišlo, dává smysl.**

Bez tohohle nemá engine na čem běžet a autor hry nemá jak zjistit, že se v tabulce upsal.

## Vstup

Autor hry stáhne Google Sheet přes _Soubor → Stáhnout → Microsoft Excel_. Vznikne **jeden `.xlsx` se všemi listy**. Ten se nahraje do aplikace přetažením.

### Listy v souboru

| List                                        | Obsah                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Characters`                                | Registr postav: ID, jméno, příjmení, skupina, ID šablony, počáteční hodnoty škál pro kapitolu 1                    |
| `1_Questions`, `2_Questions`, `3_Questions` | Otázky, odpovědi, dopady na škály, zapínané bloky a příznaky, zdroj (`hráč` / `org`), příznak `párová`             |
| `1_Scales`, `2_Scales`, `3_Scales`          | Definice škál: rozsah platnosti (`postava` / `domácnost`), prahy a názvy pásem, strategie sloučení a rozdělení     |
| `1_Content`, `2_Content`, `3_Content`       | Bloky a jejich varianty: text, priorita, podmínka (§8.2). **Ukázka je v `Konfigurace_Struktura_-_2_Content.csv`.** |
| `Validations`                               | Konfigurace kontrol                                                                                                |

Konvence ID a formát sloupců jsou v §4.2 a §4.5. **Formát dopadu na škály:** čárkou oddělený seznam `S_<Postava>_<Skala><znaménko><číslo>`, například `S_Marie_Wealth_osobni+3, S_Marie_Regime-2`.

## Co má session dodat

1. **Parser `.xlsx`** přes SheetJS. Čte všechny listy, mapuje je na tabulky ze schématu.
2. **Verzování konfigurace.** Každý import je nová verze. Konfigurace se váže na běh při jeho založení (§6.5) — rozjetý běh se novým importem sám od sebe nezmění.
3. **Diff proti předchozí verzi.** Co přibylo, zmizelo, změnilo se. Autor musí vidět dopad importu dřív, než ho potvrdí.
4. **Validace** (seznam níže) se zobrazeným výsledkem.
5. **Nahrání šablon** jako `.md` souborů, víc najednou nebo v zipu. Přiřazení šablony k postavě podle ID, s přehledem, komu šablona chybí.
6. **Obrazovka „Správa"** — nahrání souborů, historie verzí, výsledky validací.

## Validace

Rozděl na **chyby** (blokují použití konfigurace) a **varování** (pustí dál, ale upozorní).

**Chyby:**

- Chybějící povinný list nebo sloupec
- Odkaz na neexistující postavu, škálu, skupinu nebo blok
- Odpověď bez otázky, otázka bez odpovědí
- Nesplnitelný formát dopadu na škály (překlep v ID, chybějící znaménko)
- Nespárovaná značka `{BLOK}` v šabloně
- Blok očekávaný z odpovědí a chybějící v šabloně, nebo naopak
- Domácnostní škála bez definované strategie sloučení a rozdělení
- Postava bez přiřazené šablony

**Varování:**

- Pravidlo, jehož podmínka nemůže nikdy nastat
- Dvě pravidla se stejnou prioritou a protichůdným efektem
- Textový blok, na který nevede žádná cesta
- Žádná odpověď v kapitole nesahá na jeden z dvojice účtů `_osobni` / `_spolecny` — skoro jistě překlep v ID škály
- Škála, se kterou nikdy nic nehýbe

**Každá hláška musí říct, kde je problém: list, řádek, sloupec, hodnota.** „Neplatný odkaz na škálu" je nepoužitelné. „List `2_Questions`, řádek 34, sloupec `Scale Impact`: škála `S_Marie_Welth_osobni` neexistuje, mysleli jste `S_Marie_Wealth_osobni`?" je použitelné. Autor hry opravuje v tabulce a musí tam ten řádek najít.

## Na co si dát pozor

- **Chybná konfigurace nikdy nesmí shodit aplikaci.** Parser sbírá všechny chyby a vrátí je najednou, nekončí na první. Autor chce opravit dvacet překlepů v jednom kole, ne dvacetkrát nahrávat soubor.
- **Import je idempotentní.** Dvojí nahrání téhož souboru nesmí nic zdvojit.
- **`run_id` je povinný argument datové vrstvy** i tady.
- Diakritika v ID a názvech listů musí projít bez poškození.
- Prázdné buňky, mezery navíc a slučované buňky jsou v exportu z Google Sheets běžné. Ošetři je tiše, ale zmíň v přehledu importu, co se ořezávalo.
- **Fill-down sloučených buněk.** Ve skutečném listu jsou `Character` a `Block ID` vyplněné jen na prvním řádku skupiny, další řádky mají prázdno. Parser musí hodnotu dopěstovat dolů.
- **Výrazy v `Conditions` v téhle session jen načti, ulož a zkontroluj syntaxi** pomocí `jsep` nebo `expr-eval`. Vyhodnocování je session 3. Kontrola syntaxe ale patří sem — v ukázkovém listu už je jedna chybějící závorka.
- **Parsování formátu dopadu na škály piš jako čistou funkci s testy.** Je to malá věc, kterou budeš volat všude, a její chyba se projeví jako špatná čísla v dokumentech.

## Co v téhle session nedělat

- Engine pravidel. Výrazy z `Conditions` jen načti, ulož a zkontroluj syntaxi — nevyhodnocuj je.
- Zadávání odpovědí, přepočet, generování dokumentů.
- Jakékoli napojení na Google API.

## Na konci

Nahraj dostupný list `2_Content` a ukaž, co validace našly. Zbytek listů zatím neexistuje — vyrob si k nim minimální fixtures podle §4.2 a čdej se jimi i v testech. **Očekávej, že najdou dost** — to je známka, že fungují, ne že je něco rozbité. Napiš, které chyby se opakují a jestli jde některé ošetřit tolerantněji už v parseru.
