# Pritrkavanje

Spletna aplikacija za vadbo pritrkavanja na štiri zvonove. Melodije se predvajajo kot zaporedje udarcev (podobno bobnarskemu stroju), pritrkovalec pa lahko enega od zvonov utiša in ga igra sam s preslednico.

Melodije so povzete po zapisu **Letna** (avtor Jože Mehle):

- Mercinova naokoli
- Štirka naokoli
- Mercinova naokoli; s poudarki (variacija)
- Po pet (navadna)

## Funkcije

- **Predvajanje** melodije v zanki, s sprotnim označevanjem trenutne vrstice, stolpca, udarca in zvona.
- **Tempo**: drsnik preklaplja med 150, 180, 200 in 250 udarci na minuto (privzeto 180). Vrednosti so v `TEMPOS` v `src/App.vue`.
- **Igram zvon**: izbrani zvon je utišan, njegova linija je označena rumeno, igraš ga s preslednico. Če izbereš zvon 1, prvi pritisk preslednice začne melodijo v tempu.
- **Počakaj name**: melodija se pred vsako tvojo noto ustavi in počaka na pritisk (100 ms tolerance, da ob pravočasnem udarcu ritem ostane nespremenjen).
- **Glasnost spremljave (x)**: utišanje ali stišanje zvona, ki »gosti« (udarci x), tako da se sliši le vodilna melodija.
- **Metronom** v taktu melodije (Mercinova 3/4, Štirka 4/4) in gumb **Samo metronom**.
- **Uglasitev** zvonov: privzeto naši zvonovi (h1-6, a1-4, fis1-7, d1-8), za primerjavo še Te Deum in durov akord.
- **Vrsta zapisa**:
  - _Bobnarske note_: kot v izvirnem zapisu, oštevilčeni kvadratki in x.
  - _Sekvenca_: vsak zvon v svoji barvi, krog je udarec melodije, romb udarec spremljave, prazen krog premor, navpične črte ločujejo takte.
  - _Po Malavašiču_: vsaka vrstica je en krog zvona, ki začne; velika številka je zvon melodije, mala nadpisana številka zvon, ki gosti. Med predvajanjem se trenutna številka obarva v barvi zvona.

### Bližnjice

| Tipka       | Dejanje                                        |
| ----------- | ---------------------------------------------- |
| preslednica | udari izbrani zvon (na zvonu 1 začne melodijo) |
| S           | predvajaj / pavza                              |
| ← →         | nota nazaj / naprej                            |
| Esc         | ustavi (na začetek)                            |
| 1–4         | izberi zvon, ki ga igraš                       |
| 0           | vsi zvonovi igrajo                             |
| P           | počakaj name                                   |
| M           | metronom                                       |

## Zagon

Potrebuješ Node.js 20.19 ali novejšega (zahteva Vite 8).

```sh
npm install
npm run dev      # razvojni strežnik
npm test         # preverjanje melodij
npm run build    # statična stran v mapi dist/
```

Vsebino mape `dist/` lahko objaviš na katerem koli brezplačnem statičnem gostovanju (Netlify, GitHub Pages, Cloudflare Pages). Nastavitev `base: './'` v `vite.config.js` omogoča delovanje tudi v podmapi.

## Zgradba

```
src/
  melodies.js       melodije (podatki in pravilo kroženja)
  melodies.test.js  preverjanje melodij proti izvirnemu zapisu
  bell.js           uglasitve in zvok zvonov (Web Audio)
  App.vue           vmesnik, predvajanje, bližnjice
```

## Kako so melodije zapisane

Melodije niso prepisane udarec za udarcem, ampak se zgradijo iz **pravila kroženja** (»naokoli«), ki ga sledi zapis.

### Udarec

Melodija je zaporedje udarcev. Vsak udarec je en stolpec v zapisu:

```js
{ bell: 0, label: '1', accent: false }
```

- `bell`: kateri zvon udari, od 0 do 3 (0 = zvon 1, najmanjši).
- `label`: številka note v melodiji (`'1'`, `'2'`, …) ali `'x'` za udarec zvona, ki gosti.
- `accent`: poudarjen udarec (znak `>` v zapisu), zaigra se glasneje.

### Pravilo kroženja

V vsakem krogu melodijo začne naslednji zvon, zvon pred njim pa gosti in udarja x med vsako noto melodije:

| Krog | Melodijo začne | Gosti (x) |
| ---- | -------------- | --------- |
| 1    | zvon 1         | zvon 4    |
| 2    | zvon 2         | zvon 1    |
| 3    | zvon 3         | zvon 2    |
| 4    | zvon 4         | zvon 3    |

Melodija je zapisana kot **odmiki od zvona, ki začne**. Mercinova je `[0, 1, 2]`: v prvem krogu zvonovi 1 2 3, v drugem 2 3 4, v tretjem 3 4 1 … Štirka je `[0, 2, 1, 2]`: v prvem krogu zvonovi 1 3 2 3.

Funkcija `turn(melodija, { reps, accent })` vrne en cel krog (vse štiri kroge zvonov). V vsakem krogu se melodija zaigra `reps`-krat (privzeto 2), za vsako noto sledi x:

```
Mercinova, krog 1:  1 x 2 x 3 x 1 x 2 x 3 x    (zvonovi 1 4 2 4 3 4 1 4 2 4 3 4)
```

Ena ponovitev melodije z x-i je en takt: Mercinova (3 note) je v 3/4, Štirka (4 note) v 4/4.

### Seznam melodij

```js
export const pieces = [
  { name: "Mercinova naokoli", strikes: turn(MERCINOVA) },
  {
    name: "Štirka naokoli",
    strikes: [...turn(STIRKA), ...turn(STIRKA), ...turn(STIRKA)],
  },
  {
    name: "Mercinova naokoli; s poudarki (variacija)",
    strikes: [...turn(MERCINOVA), ...turn(MERCINOVA, { accent: true })],
  },
];
```

Zapis se izriše v vrsticah po 48 udarcev (`ROW`), kot v izvirniku. Mercinova je ena vrstica, Štirka štiri, variacija dve (poudarki v drugi).

### Dodajanje nove melodije

1. Zapiši melodijo kot odmike od zvona, ki začne, npr. `const NOVA = [0, 1, 3, 2]`.
2. Dodaj jo v `pieces` z imenom in številom krogov: `{ name: 'Nova naokoli', strikes: [...turn(NOVA), ...turn(NOVA)] }`.
3. V `melodies.test.js` dodaj preverjanje prvih udarcev proti zapisu in poženi `npm test`.

### Melodije, ki ne krožijo

Melodija, ki ne sledi pravilu kroženja, se zapiše kot zaporedje zvonov melodije (0 = zvon 1) in zvon, ki gosti, za vsako noto, s funkcijo `hosted(zvonovi, gostitelji, perBar = 4)`. Za vsako noto sledi x zvona, ki gosti; note se v vsakem taktu oštevilčijo od 1 do `perBar`. `mirror` zrcali zvonove (1↔4, 2↔3):

```js
const PO_PET = [0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 1, 3, 3, 3, 1, 3, 3, 3, 1, 3, 1, 3, 1, 3, 3, 3]
const PO_PET_HOSTS = PO_PET.map((_, i) => (i < 16 ? 3 : 2)) // 4 takte gosti zvon 4, nato 4 takte zvon 3
strikes: [...hosted(PO_PET, PO_PET_HOSTS), ...hosted(PO_PET.map(mirror), PO_PET_HOSTS.map(mirror))]
```

Pri pogledih Po Malavašiču in obeh notnih zapisih se vrstica začne ob menjavi zvona, ki gosti, ali po dveh taktih. Melodija se lahko zapiše tudi neposredno kot seznam udarcev `{ bell, label, accent }`.

## Uglasitev

Uglasitve so v `src/bell.js`. Ton zvona je zapisan kot odmik v poltonih od a1 (440 Hz) in odstopanje v **šestnajstinah poltona**, kot ga navajajo poročila o pregledu zvonov:

```js
'Naši zvonovi (h1-6 a1-4 fis1-7 d1-8)': [note(2, -6), note(0, -4), note(-3, -7), note(-7, -8)],
```

Vrstni red je od najmanjšega zvona (zvon 1) do največjega (zvon 4). Zvok zvona je sintetiziran iz več delnih tonov, ki približno posnemajo cerkveni zvon.
