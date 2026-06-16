# DNS Setup for smeg.am  /  Configurazione DNS per smeg.am

> Server IP / IP del server: **89.108.66.148**

---

## 🇬🇧 English

We are moving the **smeg.am** website to a new server. To make the domain point to it,
please create (or update) the following DNS records in the zone for `smeg.am`.

### Records to set

| Type  | Host / Name        | Value (points to) | TTL          |
|-------|--------------------|-------------------|--------------|
| A     | `@`  (smeg.am)     | `89.108.66.148`   | 3600 (1h)    |
| A     | `www`              | `89.108.66.148`   | 3600 (1h)    |

Notes:
- `@` means the root/apex domain (i.e. `smeg.am` itself). Some panels show it as an empty
  field or as `smeg.am`.
- `www` makes `www.smeg.am` work as well.

### Important — remove conflicting records
If records already exist for `@` or `www` pointing somewhere else, please **delete or
replace** them so they point only to `89.108.66.148`:
- Remove any old **A** records for `@` and `www` that use a different IP.
- Remove any **CNAME** record on `@` or `www` (a CNAME would conflict with the A record).
- Do **not** change `MX` (email) or `TXT` records — leave existing email/verification
  records as they are.

### After the change
- Propagation usually takes from a few minutes up to a few hours.
- Once the domain resolves to the new IP, we will enable HTTPS (SSL certificate) on our side.
- Please let us know once the records are updated.

---

## 🇮🇹 Italiano

Stiamo spostando il sito **smeg.am** su un nuovo server. Per far puntare il dominio al
nuovo server, vi chiediamo di creare (o aggiornare) i seguenti record DNS nella zona di
`smeg.am`.

### Record da impostare

| Tipo  | Host / Nome        | Valore (punta a)  | TTL          |
|-------|--------------------|-------------------|--------------|
| A     | `@`  (smeg.am)     | `89.108.66.148`   | 3600 (1h)    |
| A     | `www`              | `89.108.66.148`   | 3600 (1h)    |

Note:
- `@` indica il dominio principale (cioè `smeg.am` stesso). In alcuni pannelli appare come
  campo vuoto oppure come `smeg.am`.
- `www` fa funzionare anche `www.smeg.am`.

### Importante — rimuovere i record in conflitto
Se esistono già record per `@` o `www` che puntano altrove, vi preghiamo di **eliminarli o
sostituirli** in modo che puntino solo a `89.108.66.148`:
- Eliminare eventuali vecchi record **A** per `@` e `www` con un IP diverso.
- Eliminare eventuali record **CNAME** su `@` o `www` (un CNAME andrebbe in conflitto con
  il record A).
- **Non** modificare i record `MX` (email) o `TXT`: lasciare invariati i record di posta e
  di verifica esistenti.

### Dopo la modifica
- La propagazione richiede di solito da pochi minuti fino ad alcune ore.
- Quando il dominio punterà al nuovo IP, attiveremo l'HTTPS (certificato SSL) dal nostro lato.
- Vi preghiamo di avvisarci una volta aggiornati i record.

---

### Summary / Riepilogo

```
smeg.am.       A   89.108.66.148
www.smeg.am.   A   89.108.66.148
```
