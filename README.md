# Primer Games

Standalone browser-based math game prototype using the existing Node/Express server and a vanilla JavaScript canvas frontend.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## URL configuration

Configure operations and difficulty without rebuilding by adding query params:

- `http://localhost:5173/?ops=+&digits=1`
- `http://localhost:5173/?ops=%C3%97,%C3%B7&digits=3`
- `http://localhost:5173/?ops=+&digits=1&briefAfter=2`
- `http://localhost:5173/?ops=%2B,-&digits=2&quizPerOp=5`
- `http://localhost:5173/?ops=%2B,%C3%97&digits=1&briefAfter=2&quizPerOp=4`

Supported params:

- `ops`: comma-separated operators such as `+,-,×,÷`
- `digits`: `1`, `2`, or `3` for max operand sizes `9`, `99`, or `999`
- `rounds`: optional rounds per operator, defaults to `3`
- `briefAfter`: optional positive integer; open the Planning Mission after that many completed levels, defaults to all levels
- `quizPerOp`: optional positive integer; generate that many Planning Mission questions for each enabled operator, defaults to `3`
