# Curbside Shade Mapper

Curbside Shade Mapper helps mobile ice cream vendors pick a more comfortable place to serve. Tap a curbside spot on the map or search for an address, then see which parts of the day are likely to be sunny or shaded.

The app combines the sun’s position with nearby OpenStreetMap building footprints and estimated building heights. It runs the shade calculation in the browser, so a spot can be saved locally and revisited without creating an account.

## Run it locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data sources and limits

- Building footprints come from OpenStreetMap through the Overpass API.
- A tagged building height is used when available; `building:levels` is converted using 3.2 m per level; otherwise the app assumes 10 m.
- The demo buildings are synthetic and are clearly labelled in the app.
- Trees, parked vehicles, terrain, awnings, and temporary shade are not included yet.
- Saved spots live only in this browser’s local storage.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```
