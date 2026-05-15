# qr-blocky — Speaker notes & slovník pojmov

Cieľ tohto dokumentu: prejsť si ho pred prezentáciou a vedieť **každý pojem v slidoch obhájiť na obhajobnej úrovni**, aj keď ťa skúšajúci stiahne do detailov.

Štruktúra:

1. [Príbeh aplikácie v 60 sekundách](#1-pribeh-aplikacie-v-60-sekundach)
2. [Architektúra – kto s kým hovorí a prečo](#2-architektura)
3. [Slovník pojmov A–Z](#3-slovnik-pojmov-a-z) — definícia + kontext + ako to vyznieť ako odborník
4. [Doménové entity (Mongoose modely)](#4-domenove-entity)
5. [Komunikačné cesty krok za krokom](#5-komunikacne-cesty-krok-za-krokom)
6. [Čo ti môžu poslať za otázky a ako odpovedať](#6-typicke-otazky)
7. [„Anti-cheat sheet" – čo nehovoriť](#7-anti-cheat-sheet)

---

## 1. Príbeh aplikácie v 60 sekundách

**Názov „qr-blocky"** vychádza z dvoch slov: **QR kód** + **pokladničný blok**. Pôvodný nápad bol postaviť frontend, ktorý naskenuje QR kód z bločku (slovenská eKasa má na bločkoch QR), pošle jeho ID na backend a backend si potiahne detaily bločku z eKasa API.

Postupne sa nápad presunul z „aplikácia pre bločky" na **monitoring framework nad volaniami tej aplikácie**:

- Backend má endpoint `/qr-app/getReceipt` (a ďalšie: `saveReceipt`, `shareReceipt`).
- **Každé volanie** na `/qr-app/*` sa zaloguje do MongoDB kolekcie `auditlogs`.
- Nad auditlogmi beží **pipeline** — výpočtová úloha, ktorá zagreguje volania (koľko bolo, koľko bolo úspešných, koľko zlyhalo) v zadanom časovom okne a zapíše štatistiku do kolekcie `computationstats`.
- Frontend nakoniec vie ukázať dashboard: „aké pipelines máme, aké behy prebehli, ktoré skončili chybou".

Z jednej myšlienky (skenovať bloček) tak vznikla **generická infraštruktúra na dávkový výpočet nad logmi** — to je tá „big data" časť, lebo pri rastúcich objemoch volaní by synchrónne počítanie v API nestíhalo.

---

## 2. Architektúra

Aplikácia je rozdelená na **tri samostatné služby** (microservices) plus dva infraštruktúrne kúsky (DB a broker):

```
┌────────────┐      HTTP/JSON      ┌────────────┐  publish   ┌──────────────┐  consume   ┌─────────────────┐
│ qr-frontend│ ─────────────────► │ qr-backend │ ─────────► │  RabbitMQ    │ ─────────► │ qr-computation- │
│ (Next.js)  │                     │ (Express)  │            │ queue:       │            │ module          │
│            │ ◄───────── RSC ──── │            │            │ "computations"│           │ (Node worker)   │
└────────────┘                     └─────┬──────┘            └──────────────┘            └────────┬────────┘
                                         │ Mongoose                                              │
                                         ▼                                                       │
                                   ┌──────────┐  ◄─────── aggregate auditlogs ────────────────── ┘
                                   │ MongoDB  │
                                   │ (collections: auditlogs, datasets, pipelines, runs,
                                   │  alertrules, alerts, computationstats, computationmodule)
                                   └──────────┘
```

**Prečo tri služby?**

- API musí byť **rýchle** (vrátiť odpoveď v stovkách ms). Ak by samo počítalo agregáciu nad miliónmi auditlogov, používateľ by sa pozeral 30 sekúnd na točiace sa kolečko.
- Riešenie: API len **založí úlohu** (zapíše JobRun do DB, pošle správu do fronty) a okamžite vráti `202 Accepted`.
- Reálnu prácu robí **iný proces (worker)** – môže bežať na inom stroji, môže byť ich N, môžu padnúť a reštartnúť sa bez toho, aby spadlo API.

**Prečo medzi nimi fronta a nie priame HTTP volanie?**

- Fronta funguje ako **buffer**: ak príde naraz tisíc požiadaviek a workerov je len 5, deväťstodeväťdesiatpäť úloh počká v queue. Nikto nestratí dáta.
- Fronta dáva **decoupling**: backend nemusí vedieť, kde worker beží, koľko ich je, či žije. Len pošle správu.
- Fronta dáva **retry zadarmo**: ak worker padne uprostred správy, RabbitMQ ju vráti späť do fronty (cez `nack`).

---

## 3. Slovník pojmov A–Z

### Ack / Nack (acknowledgment / negative acknowledgment)

**Definícia.** V RabbitMQ — keď worker dostane správu, RabbitMQ ju z fronty hneď neodstráni. Čaká, kým worker pošle:
- `channel.ack(msg)` — „dostal som, spracoval, môžeš zabudnúť",
- alebo `channel.nack(msg, requeue=false)` — „spadlo mi to; nedávaj späť do fronty" (alebo s `requeue=true` „skús dať niekomu inému").

**V kóde:** `qr-computation-module/app/rabbit-consumer/index.js` riadky 216, 219.

**Prečo to existuje?** Bez ack-u by RabbitMQ správu zmazal hneď, ako ju pošle, a keby worker padol pred dokončením, správa by sa stratila. Ack je **zmluva**: „kým mi nepotvrdíš spracovanie, držím tvoju správu".

**Ako to vyznieť odborne:** *„Používame manuálne acknowledgments, takže dostávame at-least-once delivery semantiku — správa môže byť doručená viackrát (napríklad pri reštarte workera tesne pred ack), preto si vedieme `receiveCount` a vieme detegovať duplicitu."*

### Aggregation pipeline (MongoDB)

**Definícia.** Sekvencia transformačných krokov nad kolekciou, ktoré MongoDB vykoná na serveri DB. Nie je to to isté ako naša „pipeline" entita — len zhoda mena.

**Najčastejšie kroky:**
- `$match` — filtruje dokumenty (ako `WHERE` v SQL).
- `$group` — zoskupí podľa kľúča a počíta agregáty (ako `GROUP BY`).
- `$sum`, `$avg`, `$cond` — agregačné funkcie / podmienky.
- `$sort`, `$project` — usporiadanie a výber polí.

**V kóde:** `qr-computation-module/app/rabbit-consumer/index.js` riadky 26–45 — agregujeme `auditlogs` podľa `action`, počítame totalCalls / successfulCalls / unsuccessfulCalls.

**Ako to vyznieť:** *„Agregácia beží priamo v MongoDB — worker nevyťahuje milióny dokumentov cez sieť, len pošle pipeline definíciu a dostane späť zoskupené výsledky."*

### App Router (Next.js)

**Definícia.** Spôsob, akým Next.js verzie 13+ definuje stránky a layouty cez priečinkovú štruktúru pod `src/app/`. Predtým bol `pages/` router (starý), teraz je `app/` router (nový).

**Konvencie:**
- `app/runs/page.tsx` → URL `/runs`.
- `app/runs/[id]/page.tsx` → URL `/runs/:id` s dynamickým ID.
- `layout.tsx` → spoločný obal pre podstránky.

**V kóde:** `qr-frontend/src/app/` má presne tieto priečinky.

### Audit log / auditovanie

**Definícia (všeobecne).** Záznam o tom, čo sa stalo v systéme: kto, kedy, čo zavolal, s akým výsledkom. Používa sa na bezpečnosť (kto pristúpil k dátam) aj na analýzu prevádzky (koľko volaní bolo, ktoré endpointy sú populárne).

**V tomto projekte:** kolekcia `auditlogs` v MongoDB, model `AuditLog`. Polia: `action`, `endpoint`, `requestBody`, `requestQuery`, `ip`, `status`, `timestamp`. Zapisuje sa **automaticky** v Express middlewari `qr-backend/app/qr-app/index.js` (riadky 7–19) — po každom requeste sa zavesí na `res.on('finish')` callback.

### Backoff (exponenciálny)

**Definícia.** Stratégia opakovaného pripájania pri zlyhaní: ak prvý pokus zlyhá, počkám 2 s, druhý 4 s, tretí 8 s, štvrtý 16 s… so stropom (napr. 30 s). Predchádza tomu, aby tisíc workerov nepadlo naraz na RabbitMQ a okamžite ho znova dorazilo, ale aj zbytočnému zaťažovaniu siete.

**V kóde:** `qr-computation-module/app/rabbit-consumer/index.js` riadky 164–169 a 229–230: `backoffMs = Math.min(30_000, backoffMs * 2)`.

**Ako to vyznieť:** *„Worker pri nedostupnom brokerovi nečaká fixne, ale exponenciálne — predchádzame tým thundering herd problému."*

### CORS (Cross-Origin Resource Sharing)

**Definícia.** Bezpečnostný mechanizmus prehliadača: keď stránka beží na `http://localhost:3001` a JavaScript chce volať `http://localhost:3000/api`, prehliadač to štandardne **zablokuje**. Server musí explicitne povedať „áno, tento origin smie", inak fail.

**Ako to obchádzame:** v `qr-frontend/next.config.ts` máme rewrite `/blocky-api/:path* → http://localhost:3000/:path*`. Frontend volá `/blocky-api/datasets` — z pohľadu prehliadača **same-origin** (rovnaký host). Next.js server to interne preposiela na backend. Prehliadač CORS nerieši, lebo nevidí cross-origin.

**Ako to vyznieť:** *„Same-origin volania cez Next.js rewrite — prehliadač CORS nerieši, server-to-server volanie je transparentne preposlané backendovému API na inom porte."*

### CRUD

Skratka pre **Create, Read, Update, Delete** — štyri základné operácie nad záznamom. V REST-e mapované na HTTP metódy:

| Operácia | HTTP    | Príklad                  |
|----------|---------|--------------------------|
| Create   | POST    | `POST /datasets`         |
| Read     | GET     | `GET /datasets/:id`      |
| Update   | PATCH/PUT | `PATCH /pipelines/:id` |
| Delete   | DELETE  | `DELETE /pipelines/:id`  |

### Decoupling (oddelenie zložiek)

**Definícia.** Architektonický princíp: dve komponenty by mali vedieť o sebe **čo najmenej**. Backend nemusí poznať IP adresu workera; vie len, že pošle správu do fronty s názvom `computations`. Komu sa to dostane, kedy, či je workerov 1 alebo 50 — to nezaujíma.

**Prečo:** decoupled systémy sa dajú **nasadiť, škálovať a meniť samostatne** bez toho, aby spadli ostatné.

### Durable queue

**Definícia.** Konfigurácia fronty v RabbitMQ: `durable: true` znamená, že fronta **prežije reštart brokera** (jej definícia sa zapíše na disk). Bez `durable: true` by sa po reštarte RabbitMQ stratila aj fronta.

**Pozor — dve veci:**
- `durable: true` na fronte → prežije definícia fronty.
- `persistent: true` na správe → prežije samotný obsah správy.

V `qr-backend/app/pipelines/index.js:115` posielame s `{ persistent: true }`. V `qr-backend/app/rabbitmq.js:11` zakladáme frontu s `{ durable: true }`. Spolu to znamená: **správa neumiera ani pri reštarte brokera**.

### Eventual consistency

**Definícia.** Distribuovaný systém nedáva všetkým zložkám rovnaké dáta v rovnakom okamihu — môže byť krátka chvíľa, keď API vie o run-e, ale worker ho ešte nevidí (resp. worker ho už pošle ako `successful`, ale BE to ešte nestihol uložiť). Konečný stav je konzistentný, ale „medzistavy" sú prechodné.

**V tomto projekte:** medzi `POST /pipelines/:id/run` (vznik JobRun-u so statusom `pending`) a prvým PATCH-om z workera na `running` môže byť sekunda-dve. To je v poriadku — frontend medzitým zobrazí `pending`.

### Express (Express.js)

**Definícia.** Najpopulárnejší minimalistický webový framework pre Node.js. Definujeme routy:

```js
app.get('/datasets', (req, res) => { ... })
app.post('/pipelines', (req, res, next) => { ... })
```

**V projekte:** verzia **5** (`qr-backend/package.json: express ^5.2.1`). Express 5 priniesol native async/await error handling, nemusíme všade riešiť `next(err)` ručne (ale my to aj tak robíme pre čitateľnosť).

### Idempotency (idempotencia)

**Definícia.** Operácia je idempotentná, ak jej **opakovanie** dáva **rovnaký výsledok** ako jediné vykonanie. Napríklad `DELETE /pipelines/123` — či zavoláš raz, päťkrát, výsledok je „pipeline 123 neexistuje". `POST` na vytvorenie záznamu naopak idempotentný nie je: päť POST-ov = päť záznamov.

**V messagingu:** RabbitMQ doručuje správy **at-least-once** (zaručene aspoň raz, ale občas viackrát — napríklad keď worker spracoval správu, ale spadol predtým, ako poslal ack). Aby duplicita nespôsobila duplicitnú prácu, worker musí byť idempotentný.

**V tomto projekte (presná pravda!):** v Slide 8 sa hovorí o „idempotencii", ale reálne v kóde je to **deduplication tracking, nie idempotencia v striktnom zmysle**. Pri každej správe sa robí upsert do `computationmodule` podľa `runId`, inkrementuje sa `receiveCount`. **Pri `receiveCount > 1` worker job nepreskočí, ale `force-rerunne`** (`qr-computation-module/app/rabbit-consumer/index.js` riadky 200–212).

**Ako to vyznieť poctivo:** *„Sledujeme duplicitné správy cez `receiveCount`. Sémanticky to nie je striktná idempotencia (rovnaký výsledok pri opakovaní) — je to skôr deduplication tracking s force-rerun politikou. To je vedomé rozhodnutie: chceli sme vedieť, že došlo k duplicite, a manuálne na ňu reagovať."*

### JSON

**Definícia.** JavaScript Object Notation — textový formát na výmenu dát. `{"name": "Jozef", "age": 30}`. Štandard pre REST API.

**V projekte:** všetky HTTP requesty a response sú JSON. Express middleware `app.use(express.json())` automaticky parsuje request body.

### Joi (validačná knižnica)

**Definícia.** JS knižnica na **deklaratívnu validáciu** dátových štruktúr. Napíšeš schému, čo má objekt obsahovať, Joi povie áno/nie + dôvod.

```js
const schema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('aggregation', 'file').required(),
})
```

**V projekte:** každý modul má `validation.js`. Príklad pre datasety: `qr-backend/app/datasets/validation.js` — používa `Joi.when(...)`, čiže **konditívnu validáciu**: ak `type === 'file'`, musí byť `fileType` prítomné a `aggregation` zakázané, a naopak.

**Prečo Joi a nie Mongoose validation?** Dvojúrovňová obrana: **Joi na HTTP vstupe** zachytí chybu skôr (vráti 400 s presnou hláškou). Mongoose validuje pri ukladaní (poistka).

### KEDA (Kubernetes Event-Driven Autoscaling)

**Definícia.** Open-source komponent pre Kubernetes, ktorý **škáluje pody podľa externých metrík** — najčastejšie podľa **hĺbky fronty** (`queue depth`). Pre Kubernetes natívne k dispozícii je Horizontal Pod Autoscaler (HPA), ten ale štandardne sleduje len CPU/RAM. KEDA pridáva trigger pre RabbitMQ, Kafka, Azure Service Bus, atď.

**Ako to funguje (zjednodušene):**
1. Definuješ `ScaledObject` v YAML: „pre deployment X sleduj queue `computations`, cieľ je 5 správ na pod, min 0 / max 50 podov".
2. KEDA periodicky (každých 30 s) sa pýta RabbitMQ na hĺbku fronty.
3. Ak je v queue 100 správ a target je 5/pod → KEDA povie HPA, že chce 20 podov.
4. Ak je queue prázdna → škáluje na 0 (**scale-to-zero**).

**V našom projekte:** KEDA tu **fyzicky nie je nasadené** — žiaden YAML manifest v repe. Je to **forward-looking** koncept: ak by sme šli na produkciu, takto by sme to škálovali.

**Ako to vyznieť:** *„Nasadenie computation modulu sme navrhli tak, aby bol stateless a horizontálne škálovateľný — typický scenár je KEDA ScaledObject s RabbitMQ triggerom, kde scaler sleduje hĺbku fronty `computations` a škáluje pody vrátane scale-to-zero."*

### Load balancing (rozloženie záťaže)

**Definícia.** Rozdelenie príchodzích požiadaviek medzi viacero rovnakých inštancií.

**V RabbitMQ:** ak máš jednu frontu `computations` a tri workery, ktorí z nej konzumujú, RabbitMQ rozdelí správy medzi nich. S `prefetch(1)` to ide férovo — každý dostane jednu, kým ju nezacknuje, ďalšiu nedostane. Bez `prefetch(1)` by RabbitMQ jednému workerovi nasypal stovku správ a ostatní by čakali (round-robin na úrovni doručenia, nie spravodlivosti dokončenia).

### Mongoose (ODM pre MongoDB)

**Definícia.** Object-Document Mapper pre MongoDB. Definuje **schémy** v JS (ktoré MongoDB samo o sebe nevyžaduje, lebo je schemaless) a poskytuje API ako `Model.find()`, `Model.create()`, `Model.findByIdAndUpdate()`.

```js
const Dataset = mongoose.model('Dataset', new mongoose.Schema({
  name:  { type: String, required: true },
  owner: { type: String, required: true },
  type:  { type: String, enum: ['aggregation', 'file'], required: true },
}))
```

**Rozdiel ODM vs ORM:** ORM (Object-Relational Mapping) sa používa pre SQL databázy (Sequelize, TypeORM, Prisma). ODM sa používa pre dokumentové databázy.

### Microservices (mikroservisy)

**Definícia.** Architektonický štýl — aplikácia je rozdelená na viacero malých, samostatných služieb, ktoré komunikujú cez sieť (HTTP, fronty, gRPC). Opak: **monolit** — všetko v jednom procese.

**V projekte (poctivo):** máme **tri služby** = blízko k microservices, ale nie ortodoxne (zdieľame jednu MongoDB, nie každá služba má vlastnú). Niekedy sa tomu hovorí **„modular monolith"** alebo **„services architecture"**.

**Výhody:**
- nezávislé nasadenie (deploynem worker bez toho, aby som zhodil API),
- nezávislé škálovanie (môžem mať 20 workerov a 2 API instances),
- izolácia chýb (padne worker, API funguje ďalej).

**Nevýhody:**
- viac premenných na sledovanie (sieť, fronta, distribuované transakcie),
- eventual consistency,
- prevádzková réžia (k8s, monitoring, logy).

### MongoDB (dokumentová DB)

**Definícia.** NoSQL dokumentová databáza. Namiesto tabuľiek a riadkov má **kolekcie a dokumenty** (JSON-like objekty, fyzicky uložené ako BSON).

- Žiadne JOIN-y v klasickom zmysle (sú agregačné pipeliny, ale typicky sa dáta denormalizujú).
- **Schema-less** — dokument môže mať akékoľvek polia. Nad MongoDB sa schéma vynucuje aplikačne (cez Mongoose).
- Vhodné pre **dáta, ktoré sa prirodzene správajú ako dokumenty**: konfiguračné objekty, logy, eventy.

**Prečo ju používame:** doménové entity (Dataset, Pipeline, JobRun, Alert) sú prirodzene dokumenty s vnorenými poľami (napr. Dataset má `aggregation: { timeFrom, timeTo }`).

### Next.js

**Definícia.** React framework pre full-stack aplikácie. Pridáva nad React:
- Routing podľa priečinkovej štruktúry (App Router).
- **Server-side rendering (SSR)** — stránka sa najprv vyrenderuje na serveri, klient dostane hotové HTML (rýchlejší prvý load + lepšie SEO).
- **React Server Components (RSC)** — odlišný spôsob renderu, ďalej dolu.
- Build/dev server, optimalizácia obrázkov, API routy…

**V projekte:** verzia **16.2.4** (`qr-frontend/package.json`).

### Node.js

**Definícia.** Runtime pre JavaScript mimo prehliadača. Postavený na V8 engine z Chromu. Single-threaded event loop, ne-blokujúce I/O — vhodné na sieťové služby s množstvom súbežných spojení.

### Persistent message (RabbitMQ)

**Definícia.** `channel.sendToQueue(queue, content, { persistent: true })` — broker zapíše správu na disk skôr, než ju doručí. Ak broker spadne, pri reštarte správu obnoví.

**Pozor:** persistent = zapíše sa na disk, ale neznamená to 100 % záruku — medzi prijatím správy a fsync-om je krátke okno, kde sa môže stratiť. Pre full guarantee sa používajú **publisher confirms**.

### Polling (dotazovanie)

**Definícia.** Klient sa periodicky pýta servera „už hotovo?". Opak: push (server-sent events, WebSocket).

**V projekte:** komponenty `RunStatusLive` a `PipelineLastStatusLive` na frontende periodicky fetchujú stav behu z API. Backend nemá WebSocket, takže polling je najjednoduchšie riešenie.

**Náklady polling-u:** dáva sa do trade-offu: kratšia perióda = rýchlejšia reakcia, ale viac volaní; dlhšia perióda = menej volaní, ale latencia.

### Prefetch (RabbitMQ)

**Definícia.** `channel.prefetch(N)` — koľko správ smie mať worker „v ruke" (doručených, ale ešte nezacknutých) naraz. `prefetch(1)` znamená: dostanem správu, spracujem, acknem; až potom dostanem ďalšiu.

**Prečo `prefetch(1)`:**
- Spravodlivá distribúcia medzi workermi (žiadny si nenahromadí frontu navyše).
- Ak worker spadne, vráti sa do fronty len 1 nezacknutá správa, nie stovka.
- Worker nemusí v RAM držať veľa správ.

**Trade-off:** `prefetch(1)` znamená vyššiu latenciu pri lacných úlohách (medzi spracovaním je round-trip). Pri dlhých úlohách (sekundy a viac) je `prefetch(1)` ideál.

### Publisher / Consumer / Producer / Subscriber

**Terminológia v messagingu:**
- **Producer** (alebo **Publisher**) — kto posiela správy do fronty. U nás `qr-backend`.
- **Consumer** (alebo **Subscriber**) — kto z fronty číta. U nás `qr-computation-module`.

**Rozdiel publisher/subscriber vs producer/consumer** sa miešajú — RabbitMQ je principiálne queue (work-queue, jeden consumer per message), Kafka je log/pub-sub (viacero consumerov vie čítať tú istú správu). Pre účely tejto prezentácie ich používame zameniteľne.

### React Server Components (RSC)

**Definícia.** Nová generácia React komponentov, ktoré sa **renderujú výlučne na serveri** — žiaden JS sa za ne nestiahne do prehliadača. Vhodné na zoznamy, dashboardy, výpisy.

**Ako sa to líši od starého SSR?**
- Klasický SSR: stránka sa vyrenderuje na serveri, ale komponent sa **opäť** „hydratuje" v prehliadači (JS sa stiahne a oživí ho).
- RSC: server vráti **už serializovaný výsledok**, klient ho len vykreslí. JS pre komponent sa nikdy nestiahne.

**Klientske komponenty** (`'use client'` direktíva v hlavičke súboru) sú tie, ktoré potrebujú interaktivitu (kliky, formuláre, polling) — tie sa do prehliadača stiahnu a fungujú klasicky.

**V projekte:** stránky (`page.tsx`) sú RSC a fetchujú dáta priamo z API v `src/lib/api.ts → apiGetServer()`. Interaktívne časti (`RunPipelineButton`, `AcknowledgeAlertButton`) majú `'use client'`.

### REST API

**Definícia.** Štýl webového API založený na HTTP. Charakteristiky:
- **Resource-oriented** — URL identifikuje **vec** (`/pipelines/123`), nie akciu (`/getPipeline?id=123`).
- **HTTP metódy** ako sloveso (`GET`, `POST`, `PATCH`, `DELETE`).
- **Stateless** — server si medzi requestmi nepamätá nič (každý request musí obsahovať všetko potrebné).
- **JSON body** + **status kódy** ako odpoveď.

### Rewrite (Next.js)

**Definícia.** `next.config.ts → rewrites()` — pravidlo „ak prehliadač chce `/blocky-api/xyz`, posuň ho transparentne na `http://localhost:3000/xyz`". Z pohľadu prehliadača je celé volanie na **rovnaký origin** (žiaden CORS).

### Same-origin policy

Súvisí s CORS — pozri vyššie. „Origin" = `(protokol, host, port)`. `http://localhost:3001` a `http://localhost:3000` sú dva rôzne originy (rozdielne porty).

### Scale-to-zero

**Definícia.** Schopnosť autoscaleru znížiť počet inštancií na **0** keď nie je práca. Šetrí peniaze v cloude (neplatíš za bežiaci pod, ktorý nič nerobí).

**Pre nás:** ak je queue `computations` prázdna 5 minút, KEDA zhasne všetky pody. Pri prvej správe sa znova zapnú (cold start trvá pár sekúnd).

### Schedule (cron)

Pole `schedule` na Pipeline modeli (`qr-backend/app/pipelines/model.js`) je **string** — typicky cron výraz typu `"0 * * * *"` (každú hodinu). V aktuálnej verzii sa **netriguje automaticky** — pipeline sa spúšťa manuálne cez `POST /pipelines/:id/run`. Schedule je tam pripravený do budúcna.

### State machine (stavový stroj)

**Definícia.** Matematický model: objekt má konečný počet **stavov** a presne definované **prechody** medzi nimi. Iné prechody sú zakázané.

**Pre JobRun:**

```
pending ──► running ──► successful
              └──────► error
```

Prechod `pending → successful` je **zakázaný** (musí cez `running`). Validácia je v `qr-backend/app/runs/index.js` riadky 69–81 — neplatný prechod vracia HTTP 409.

**Prečo state machine:** robí biznis pravidlá explicitnými. Bez nej by hocikde v kóde mohol niekto napísať `run.status = 'successful'` priamo, čo by porušilo invarianty (napr. `startTime` by chýbal).

### Status kódy HTTP

Krátky cheatsheet podľa toho, čo používame v projekte:

| Kód | Význam              | U nás                                                          |
|-----|---------------------|----------------------------------------------------------------|
| 200 | OK                  | GET/PATCH úspešne                                              |
| 201 | Created             | Nový záznam vytvorený (POST `/datasets`, `/pipelines`)         |
| 202 | Accepted            | Spustenie pipeline – úloha zaradená do fronty                  |
| 204 | No Content          | Úspešný DELETE bez body                                        |
| 400 | Bad Request         | Validácia Joi zlyhala                                          |
| 404 | Not Found           | Záznam neexistuje                                              |
| 409 | Conflict            | Neplatný stavový prechod, neaktívna pipeline, finálny stav     |
| 500 | Internal Server Error | Neočakávaná chyba (centrálny handler v `server.js`)          |
| 503 | Service Unavailable | RabbitMQ nedostupný pri pokuse o `enqueue`                     |

**Pre prezentáciu:** „Vraciame sémanticky správne HTTP kódy — frontend sa môže rozhodnúť, či zobraziť toast s chybou alebo formulárovú validáciu, podľa kódu."

### Stateless

**Definícia.** Komponent, ktorý si **nepamätá nič medzi volaniami**. Backend API je stateless — každý request musí obsahovať všetko potrebné (napr. ID v URL). Stav žije v databáze.

**Prečo to chceme:** stateless server vieš ľubovoľne replikovať. Load balancer pošle request hocikomu — výsledok bude rovnaký. Stateful server musí byť „sticky" (rovnaký používateľ ide vždy na rovnaký pod), čo komplikuje škálovanie.

**Worker (computation module) v našom kóde NIE JE čisto stateless** — drží si `activeJobs` Mapu v RAM (running setInterval-y pre každý JobRun). Pri reštarte poda túto pamäť stratíme — vedeli sme o tom a je to vedomé zjednodušenie pre semestrálku.

### Throttling / Backpressure

**Backpressure** = mechanizmus, ako spomaliť producenta, ak konzument nestíha. V RabbitMQ to vzniká prirodzene: producent volá `sendToQueue`, ak je broker pretlačený, vráti `false` (`qr-backend/app/pipelines/index.js:117` to kontrolujeme — ak `sendToQueue` vráti false, hlásime chybu).

### Upsert

**Definícia.** Spojenie **insert** a **update** — „ak záznam existuje, updatni, ak nie, vlož". V MongoDB cez `findOneAndUpdate(filter, update, { upsert: true })`.

**V kóde:** `qr-computation-module/app/rabbit-consumer/index.js` riadky 191–199 — upsert do `computationmodule` podľa `runId`, s `$inc` na `receiveCount`. Pri prvom príchode sa vytvorí nový dokument; pri opakovanom príchode rovnakého `runId` sa zvýši counter.

---

## 4. Doménové entity

Všetky modely + ich účel naraz, aby si vedel odprezentovať data flow.

### `Dataset` (kolekcia `datasets`)
**Účel:** definícia zdroja dát pre pipeline.

- `name`, `owner` — človek a popis.
- `type: 'aggregation' | 'file'` — buď agregujeme nad inou kolekciou v DB (typ `aggregation`), alebo by sme spracovávali nahraný súbor (typ `file`, neimplementované do konca).
- `aggregation.timeFrom`, `aggregation.timeTo` — časové okno, nad ktorým sa robí agregácia auditlogov.

### `Pipeline` (kolekcia `pipelines`)
**Účel:** ako sa spracúva ten dataset.

- `datasetOid` — referencia na dataset.
- `active: boolean` — gate; ak `false`, pipeline sa nedá spustiť (`409`).
- `pipelineVersion` — inkrementuje sa pri každom PATCH-i; verzia sa zapisuje do JobRun-u pri spustení (auditovateľnosť — vieme, ktorá verzia konfigurácie zbehla).
- `schedule` — cron expression (do budúcna; teraz manuálne).
- `lastStatus`, `lastRunTime` — cache posledného behu pre rýchle UI.

### `JobRun` (kolekcia `jobruns`)
**Účel:** jeden konkrétny beh pipeline.

- `pipelineOid`, `pipelineVersion` — ku ktorej pipeline (a jej verzii) patrí.
- `status: 'pending' | 'running' | 'successful' | 'error'` — riadený state machine.
- `startTime`, `finishTime`, `errorMessage`, `processedRecords`.

### `AlertRule` (kolekcia `alertrules`)
**Účel:** „ak pre pipeline X nastane stav Y, vytvor alert".

- `pipelineOid`, `reportWhenState`.

### `Alert` (kolekcia `alerts`)
**Účel:** vyvolaný incident — viditeľný v UI, dá sa acknowledgnuť.

- Väzba na pipeline a konkrétny run, `acknowledgedAt`.

### `AuditLog` (kolekcia `auditlogs`)
**Účel:** vstupné dáta pre celú pipeline.

- `action`, `endpoint`, `requestBody`, `requestQuery`, `ip`, `status`, `timestamp`.
- Zapisuje sa automaticky middlewarom v `app/qr-app/index.js` pri každom volaní `/qr-app/*`.

### `ComputationJob` (kolekcia `computationmodule`)
**Účel:** stav, ktorý si worker drží o doručených správach.

- `runId` — kľúč.
- `receiveCount` — koľkokrát som túto správu dostal (na detekciu duplicity).
- `frequency`, `timeInterval`, `cmds` — payload z RabbitMQ správy.

### `computationstats` (kolekcia, bez Mongoose modelu)
**Účel:** výstup pipeline — výsledok agregácie auditlogov.

- `runId`, `timeInterval`, `calculatedAt`, `stats: { actionName: { successfulCalls, unsuccessfulCalls, totalCalls } }`.

---

## 5. Komunikačné cesty krok za krokom

### A) Spustenie pipeline (od kliku po výsledok)

1. **User** klikne v UI „Run pipeline".
2. **Frontend** (klientský komponent `RunPipelineButton`) volá `POST /blocky-api/pipelines/:id/run` (cez `apiClient` v `src/lib/api.ts`).
3. Next.js **rewrite** to posunie na `http://localhost:3000/pipelines/:id/run`.
4. **Backend handler** (`qr-backend/app/pipelines/index.js:64`):
   - Načíta Pipeline, overí `active === true` (inak 409).
   - Načíta Dataset (aby vedel `timeFrom`, `timeTo`).
   - Vytvorí `JobRun` so statusom `pending`.
   - Aktualizuje Pipeline (`lastStatus: 'pending'`, `lastRunTime`).
   - Pošle správu do RabbitMQ:
     ```json
     { "runId": "...", "frequency": "d",
       "timeInterval": { "start": "...", "end": "..." },
       "cmds": ["calcStats"] }
     ```
   - Vyhodnotí alerty (ak je AlertRule s `reportWhenState: 'pending'`, vytvorí Alert).
   - Vráti `202 Accepted` s telom `JobRun`.
5. **RabbitMQ** drží správu v `computations` (durable + persistent).
6. **Computation module** consumer (`qr-computation-module/app/rabbit-consumer/index.js:184`):
   - Upsertne `ComputationJob` (`runId` + `$inc receiveCount`).
   - Naplánuje `executeJob` cez `setTimeout(1s)` + `setInterval(60s)`.
   - `channel.ack(msg)`.
7. **`executeJob`** o 1 s neskôr:
   - `PATCH /runs/:id { status: 'running', startTime }` → backend validuje prechod `pending → running`, ak OK, uloží.
   - Volá `calcStats(msg)`:
     - `db.auditlogs.aggregate([{$match: time window}, {$group: action}, ...])`.
     - `db.computationstats.findOneAndUpdate({runId}, { $set: { stats } }, {upsert: true})`.
   - `PATCH /runs/:id { status: 'successful', processedRecords, finishTime }`.
8. **Backend** pri `PATCH running` aj `successful` znovu vyhodnotí alerty (`createAlertsForMatchingRules`).
9. **Frontend** medzitým paralelne polluje `GET /runs/:id` (cez `RunStatusLive`) a vidí stav v reálnom čase.

### B) Edge case: RabbitMQ je dole

V kroku 4 pri `sendToQueue` zachytíme chybu (`qr-backend/app/pipelines/index.js:120`):
- Update JobRun → `error` s `errorMessage = 'RabbitMQ unreachable: ...'`.
- Update Pipeline → `lastStatus: 'error'`.
- Vyhodnotenie alertov (môžu sa spustiť aj pre `error` stav).
- Vráti `503 Service Unavailable`.

Užitočné odprezentovať: **nedostupnosť brokera nespôsobí 500, ale štruktúrovaný 503**, a v UI sa zobrazí chyba aj v zozname behov ako `error` run.

### C) Edge case: duplicitná správa

RabbitMQ poslal rovnakú správu druhý raz (povedzme worker spadol tesne pred ack):
- Consumer upsertne `ComputationJob` → `receiveCount` skočí na 2.
- `isForceRun = true`.
- Ak je v `activeJobs` Mape záznam pre tento `runId`, **zruší naplánovaný cron** a okamžite spustí `scheduleJob(msg, forceImmediate=true)`.
- Beh skončí s novými dátami; predchádzajúci JobRun stav nebol stratený, lebo PATCH-uje BE s validáciou prechodov (a worker drží `MIN_RUNNING_MS` na to, aby `running` bol viditeľný aspoň 1 s).

---

## 6. Typické otázky

**Q: Prečo MongoDB a nie PostgreSQL?**
A: Doménové entity sú prirodzene dokumenty s vnorenými poľami (Dataset má `aggregation: { timeFrom, timeTo }`, AlertRule referencuje pipeline). Auditlogy sú navyše semištruktúrované — `requestBody` je všeobecný objekt. Vo SQL by sme potrebovali viacero tabuliek alebo `jsonb` stĺpec; MongoDB to drží natívne. Plus: MongoDB má veľmi dobrý aggregation framework, ktorý priamo využívame v computation module.

**Q: Prečo RabbitMQ a nie Kafka?**
A: RabbitMQ je **work queue** — jedna správa = jeden konzument. Presne to, čo potrebujeme: pipeline run sa nemá spracovať päťkrát rôznymi workermi. Kafka je **distribuovaný log** — viacero consumer groups vie čítať tie isté správy nezávisle. Vhodnejšia pre event sourcing / stream processing. Pre work queue je RabbitMQ jednoduchší a má lepšiu prefetch/ack sémantiku.

**Q: Prečo three-tier (FE/BE/worker) a nie monolit?**
A: Synchrónne počítanie agregácie v API by blokovalo HTTP thread. Pri 1000 paralelných pipeline runov by API spadlo. Asynchrónne spracovanie cez fronu znamená, že API je vždy responzívne (vráti 202 do 50 ms) a worker škáluje nezávisle podľa záťaže.

**Q: Čo sa stane pri reštarte computation modulu?**
A: `activeJobs` Mapa v RAM sa stratí (cron-y, ktoré bežali, sú preč). Správa v RabbitMQ ostane, ak nebola zacknutá. Po reštarte sa worker pripojí, dostane nezacknuté správy znova a všetko sa rozbehne. **Pravdivé priznanie:** ak bola správa už zacknutá a worker bol len uprostred cron periódy, periodické behy sa stratia — to je trade-off voči zložitejšej persistentnej scheduler logike, ktorú sme nepotrebovali pre semestrálku.

**Q: Idempotencia — popíš to.**
A: V striktnom zmysle nemáme idempotenciu (rovnaké volanie = rovnaký výsledok); máme **deduplication tracking**: každú správu upsertneme do `computationmodule` podľa `runId`, inkrementujeme `receiveCount`. Pri opakovanom príchode (`receiveCount > 1`) **vynútime re-run** — to je vedomé rozhodnutie pre prípady, keď nás zaujíma najaktuálnejší výsledok agregácie pri zmenených dátach. Skutočná idempotencia (skip pri duplicite) by sa dala dosiahnuť pridaním kontroly `if receiveCount > 1: skip`.

**Q: Ako by si škáloval pri 100 000 správach/s?**
A: Tri samostatné osi:
1. **Worker layer:** KEDA na základe queue depth, scale-out na desiatky až stovky podov. Trade-off: prefetch by sa zvýšil, aby každý pod stihol robotu (povedzme prefetch(10) namiesto 1).
2. **Broker:** RabbitMQ cluster (mirror queues alebo quorum queues) cez 3+ nody. Alternatíva pri ešte vyššej záťaži: prejsť na Kafka/Pulsar.
3. **DB:** sharding MongoDB podľa `timeInterval.start` (časový shard key), čítacie replicas. Aggregation index na `auditlogs.timestamp`.

**Q: Prečo má run state machine prechody validované na serveri?**
A: **Single source of truth.** Keby validáciu robil len frontend, attacker by mohol obísť UI a poslať `PATCH /runs/:id { status: 'successful' }` priamo, bez toho, aby kedy bol `running`. Frontend môže (a robí to) validovať pre UX, ale finálne pravidlo musí byť na serveri. Server vracia 409, aby klient vedel, že to nebola validačná chyba (400), ale konflikt so súčasným stavom.

**Q: Prečo manuálny ack a nie auto-ack?**
A: Auto-ack = RabbitMQ označí správu za doručenú v momente odoslania workerovi. Ak worker padne pred spracovaním, správa je preč. Manuálny ack = označí sa za doručenú až po `channel.ack(msg)`, čo robíme až keď celý job (alebo aspoň jeho zaplánovanie) prebehol. **At-least-once delivery namiesto at-most-once.**

**Q: Prečo Joi aj Mongoose validácia?**
A: Defence in depth + UX. Joi spadne s HTTP 400 a presnou hláškou („field `name` is required"). Mongoose je posledná poistka, keby niekto obišiel HTTP vrstvu (interný call, migrácia). Aj Joi má `when()` konditívne validácie, ktoré Mongoose schéma nedokáže (napr. „ak type=file, fileType musí byť, ale ak type=aggregation, fileType je zakázané").

---

## 7. Anti-cheat sheet

Veci, ktoré v prezentácii **nesmieš** povedať, lebo to v kóde nie je:

- **„Používame Docker / Kubernetes / KEDA"** — neexistujú v repe žiadne manifest súbory. Hovor v podmieňovacom spôsobe: *„Tento návrh je pripravený na nasadenie v Kubernetes s KEDA — implementačné manifesty by boli ďalším krokom."*
- **„Pipeline beží podľa schedule cron-u"** — pole `schedule` je v modeli, ale **netriguje sa automaticky**. Pipeline sa spúšťa manuálne cez `POST /pipelines/:id/run`.
- **„Máme idempotenciu"** — striktne vzaté nie. Máme deduplication tracking s force re-run politikou. (Pozri otázku vyššie.)
- **„Computation module per channel"** — v kóde je len **jedna queue `computations`**. Toto je forward-looking koncept.
- **„Máme autentifikáciu/autorizáciu"** — v `qr-backend/app/auth/` síce existuje router, ale podľa `server.js` je len namountnutý — nejde o ochranu endpointov. JWT, role, atď. nie sú implementované.
- **„Frontend má testy"** — žiadne `*.test.tsx` súbory.
- **„Spracovanie je striktne stateless"** — worker drží `activeJobs` Mapu v RAM.

A naopak, veci, ktoré si **musíš pamätať pre obhajobu**:

- **Tri služby, jedna DB.** Niekto môže namietnuť, že to nie je „pure microservices". Odpovedz: *„Vedome sme zvolili shared DB pre semestrálku — pridáva to coupling na úrovni dát, ale uberá to operatívnu réžiu. V produkčnej verzii by každá služba mala svoju vlastnú schemu alebo databázu."*
- **At-least-once delivery.** Nie exactly-once. Duplicitu vieme detegovať (`receiveCount`).
- **Auditlogy sú v rovnakej DB ako konfigurácia.** V produkcii by sa vysokoobjemové auditlogy oddelili do dedikovanej time-series DB (TimescaleDB, InfluxDB) alebo sharded MongoDB clusteru.
- **HTTP kódy nesú sémantiku.** 400 = ja som blbo poslal request; 404 = neexistuje; 409 = je v stave, v ktorom to nejde; 503 = ja viem o tom, ale infraštruktúra mi spadla. Toto by si mal vedieť obhájiť pri každom z nich.

---

## TL;DR pre vstupné minútku

> *„qr-blocky je trojvrstvová architektúra pre dávkový výpočet nad logmi z webového API. Frontend v Next.jse s React Server Components volá Express/Mongoose backend, ktorý cez RabbitMQ posiela úlohy workerovi v samostatnom Node procese. Worker agreguje auditlogy v MongoDB cez aggregation pipeline a PATCH-uje výsledok späť do API. Backend riadi stavový stroj behu (pending → running → successful|error) s validáciou na serveri, RabbitMQ má durable queue + persistent messages + manuálny ack pre at-least-once delivery. Návrh je pripravený na horizontálne škálovanie workera cez KEDA s RabbitMQ triggerom v Kubernetes prostredí."*

Tých 60 sekúnd obsahuje **každý** kľúčový pojem v slidoch a každý z nich máš v tomto dokumente vysvetlený. Keď ti niekto vytrhne ktorékoľvek slovo a spýta sa „čo to je", máš na to odpoveď tu.
