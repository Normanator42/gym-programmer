import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

var REP_OPTIONS = [];
for (var i = 1; i <= 15; i++) REP_OPTIONS.push(i);
var SET_OPTIONS = [1, 2, 3, 4, 5];
var ROUNDING_STEP_KG = 0.5;

// 1-set base %1RM for reps 1-20, calibrated to Nuzzo et al. 2023
// meta-regression (Sports Medicine, n=7289 across 269 studies).
// Values represent the inverse of the reps~%1RM relationship for
// general compound barbell movements (between bench-specific and
// all-exercises models).
var BASE_PCT = [
  100.0, 97.0, 94.3, 91.5, 89.0,
  86.3, 83.9, 81.5, 79.3, 77.4,
  75.5, 73.5, 71.8, 70.0, 68.3,
  66.7, 65.2, 63.7, 62.3, 61.0
];

// Per-set fatigue discount (% points of 1RM per additional set).
// Increases with rep count since higher-rep sets create more
// cumulative fatigue. Capped at 15 reps (metabolic fatigue
// recovery is faster above this, limiting further growth).
// Based on Nuzzo 2024 repeated-sets fatigue analysis and
// Willardson et al. multi-set performance data, assuming
// 2-3 min inter-set rest and sets near failure.
function perSetDiscount(reps) {
  return 1.4 + Math.min(reps - 1, 14) * 0.13;
}

function getRatioPct(reps, sets) {
  var base = BASE_PCT[reps - 1];
  var discount = perSetDiscount(reps);
  return Math.max(base - (sets - 1) * discount, 30);
}

function toNumber(value, fallback) {
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundToStep(value, step) {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function formatKg(value, decimals) {
  return value.toFixed(decimals === undefined ? 1 : decimals) + " kg";
}

var STORAGE_KEY = "1rm-calc-state";

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function App() {
  var saved = loadState();
  var _s = useState;
  var weightInput = _s(saved ? saved.w : "100"), setWeightInput = weightInput[1]; weightInput = weightInput[0];
  var reps = _s(saved ? saved.r : 10), setReps = reps[1]; reps = reps[0];
  var sets = _s(saved ? saved.s : 1), setSets = sets[1]; sets = sets[0];
  var additional1RmInput = _s(saved ? saved.a : "0"), setAdditional1RmInput = additional1RmInput[1]; additional1RmInput = additional1RmInput[0];
  var toleranceInput = _s(saved ? saved.t : "0.5"), setToleranceInput = toleranceInput[1]; toleranceInput = toleranceInput[0];
  var filterReps = _s(saved ? saved.fr : 0), setFilterReps = filterReps[1]; filterReps = filterReps[0];
  var filterSets = _s(saved ? saved.fs : 0), setFilterSets = filterSets[1]; filterSets = filterSets[0];

  React.useEffect(function () {
    saveState({ w: weightInput, r: reps, s: sets, a: additional1RmInput, t: toleranceInput, fr: filterReps, fs: filterSets });
  }, [weightInput, reps, sets, additional1RmInput, toleranceInput, filterReps, filterSets]);

  var calculations = useMemo(function () {
    var weight = toNumber(weightInput, 0);
    var additional1Rm = toNumber(additional1RmInput, 0);
    var tolerance = Math.max(0, toNumber(toleranceInput, 0));
    var percentage = getRatioPct(reps, sets);

    if (!percentage || weight <= 0) {
      return { valid: false, message: "Enter a working weight above 0 kg." };
    }

    var baseRatio = percentage / 100;
    var baseEstimated1Rm = weight / baseRatio;
    var target1Rm = baseEstimated1Rm + additional1Rm;

    if (target1Rm <= 0) {
      return { valid: false, message: "Target 1RM must be above 0 kg." };
    }

    var matches = [];
    for (var ri = 0; ri < REP_OPTIONS.length; ri++) {
      for (var si = 0; si < SET_OPTIONS.length; si++) {
        var repOption = REP_OPTIONS[ri];
        var setOption = SET_OPTIONS[si];
        var optionPct = getRatioPct(repOption, setOption);
        var optionRatio = optionPct / 100;
        var exactWorkingWeight = target1Rm * optionRatio;
        var roundedWorkingWeight = roundToStep(exactWorkingWeight, ROUNDING_STEP_KG);
        var achieved1Rm = roundedWorkingWeight / optionRatio;
        var error = achieved1Rm - target1Rm;

        if (Math.abs(error) <= tolerance) {
          matches.push({
            reps: repOption,
            sets: setOption,
            ratioPct: optionPct,
            exactWorkingWeight: exactWorkingWeight,
            roundedWorkingWeight: roundedWorkingWeight,
            achieved1Rm: achieved1Rm,
            error: error,
          });
        }
      }
    }

    matches.sort(function (a, b) {
      var w = a.roundedWorkingWeight - b.roundedWorkingWeight;
      if (w !== 0) return w;
      if (a.sets !== b.sets) return a.sets - b.sets;
      return a.reps - b.reps;
    });

    return {
      valid: true,
      ratioPct: percentage,
      baseEstimated1Rm: baseEstimated1Rm,
      target1Rm: target1Rm,
      matches: matches,
    };
  }, [weightInput, reps, sets, additional1RmInput, toleranceInput]);

  var filteredMatches = calculations.valid
    ? calculations.matches.filter(function (row) {
        if (filterReps > 0 && row.reps !== filterReps) return false;
        if (filterSets > 0 && row.sets !== filterSets) return false;
        return true;
      })
    : [];

  return (
    <div className="container">
      <div className="header">
        <h1>1RM Equivalent Calculator</h1>
      </div>

      <section className="card">
        <div className="card-title">Your current set</div>
        <div className="inputs">
          <div className="input-group">
            <label htmlFor="weight">Weight (kg)</label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={weightInput}
              onChange={function (e) { setWeightInput(e.target.value); }}
            />
          </div>
          <div className="input-group">
            <label htmlFor="reps">Reps</label>
            <select
              id="reps"
              value={reps}
              onChange={function (e) { setReps(Number(e.target.value)); }}
            >
              {REP_OPTIONS.map(function (o) {
                return <option value={o} key={o}>{o}</option>;
              })}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="sets">Top sets</label>
            <select
              id="sets"
              value={sets}
              onChange={function (e) { setSets(Number(e.target.value)); }}
            >
              {SET_OPTIONS.map(function (o) {
                return <option value={o} key={o}>{o}</option>;
              })}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="add1rm">Add to 1RM (kg)</label>
            <input
              id="add1rm"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={additional1RmInput}
              onChange={function (e) { setAdditional1RmInput(e.target.value); }}
            />
          </div>
          <div className="input-group full-width">
            <label htmlFor="tolerance">Margin of error (+/- kg)</label>
            <input
              id="tolerance"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={toleranceInput}
              onChange={function (e) { setToleranceInput(e.target.value); }}
            />
          </div>
        </div>
      </section>

      {calculations.valid && (
        <section className="card">
          <div className="card-title">Results</div>
          <div className="stats">
            <div className="stat">
              <span className="label">Base %</span>
              <span className="value">{calculations.ratioPct.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="label">Estimated 1RM</span>
              <span className="value">{formatKg(calculations.baseEstimated1Rm)}</span>
            </div>
            <div className="stat">
              <span className="label">Target 1RM</span>
              <span className="value highlight">{formatKg(calculations.target1Rm)}</span>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="results-header">
          <h2>Equivalents</h2>
          <div className="filter-row">
            <select
              className="filter-select"
              value={filterReps}
              onChange={function (e) { setFilterReps(Number(e.target.value)); }}
            >
              <option value={0}>All reps</option>
              {REP_OPTIONS.map(function (o) {
                return <option value={o} key={o}>{o} rep{o > 1 ? "s" : ""}</option>;
              })}
            </select>
            <select
              className="filter-select"
              value={filterSets}
              onChange={function (e) { setFilterSets(Number(e.target.value)); }}
            >
              <option value={0}>All sets</option>
              {SET_OPTIONS.map(function (o) {
                return <option value={o} key={o}>{o} set{o > 1 ? "s" : ""}</option>;
              })}
            </select>
          </div>
        </div>

        {filteredMatches.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-reps">Reps</th>
                  <th className="col-sets">Sets</th>
                  <th className="col-ratio">Ratio</th>
                  <th className="col-weight">Weight</th>
                  <th className="col-1rm">1RM</th>
                  <th className="col-error">Err</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map(function (row) {
                  return (
                    <tr key={row.reps + "-" + row.sets}>
                      <td>{row.reps}</td>
                      <td>{row.sets}</td>
                      <td>{row.ratioPct.toFixed(1)}%</td>
                      <td>{formatKg(row.roundedWorkingWeight, 1)}</td>
                      <td>{formatKg(row.achieved1Rm, 1)}</td>
                      <td>{(row.error >= 0 ? "+" : "") + row.error.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : calculations.valid ? (
          <p className="note">No matches. Try increasing the margin of error.</p>
        ) : (
          <p className="note">Enter a valid weight above.</p>
        )}
      </section>
    </div>
  );
}

var rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
