import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const REP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SET_OPTIONS = [1, 2, 3, 4, 5];
const ROUNDING_STEP_KG = 0.5;

const RATIO_PERCENTAGES = {
  1: { 1: 100.0, 2: 98.6, 3: 97.2, 4: 95.8, 5: 94.4 },
  2: { 1: 96.5, 2: 94.9, 3: 93.3, 4: 91.8, 5: 90.3 },
  3: { 1: 93.4, 2: 91.6, 3: 89.8, 4: 88.1, 5: 86.5 },
  4: { 1: 90.5, 2: 88.5, 3: 86.6, 4: 84.8, 5: 83.0 },
  5: { 1: 87.7, 2: 85.6, 3: 83.5, 4: 81.6, 5: 79.7 },
  6: { 1: 85.1, 2: 82.8, 3: 80.6, 4: 78.5, 5: 76.5 },
  7: { 1: 82.6, 2: 80.1, 3: 77.8, 4: 75.6, 5: 73.5 },
  8: { 1: 80.2, 2: 77.5, 3: 75.1, 4: 72.8, 5: 70.6 },
  9: { 1: 77.8, 2: 75.0, 3: 72.5, 4: 70.1, 5: 67.8 },
  10: { 1: 75.5, 2: 72.6, 3: 70.0, 4: 67.5, 5: 65.1 },
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundToStep(value, step) {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function formatKg(value, decimals = 1) {
  return value.toFixed(decimals) + " kg";
}

function App() {
  const [weightInput, setWeightInput] = useState("75");
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(1);
  const [additional1RmInput, setAdditional1RmInput] = useState("1.7");
  const [toleranceInput, setToleranceInput] = useState("0.1");
  const [filterReps, setFilterReps] = useState(0);
  const [filterSets, setFilterSets] = useState(0);

  const calculations = useMemo(() => {
    const weight = toNumber(weightInput, 0);
    const additional1Rm = toNumber(additional1RmInput, 0);
    const tolerance = Math.max(0, toNumber(toleranceInput, 0));
    const percentage = RATIO_PERCENTAGES[reps] && RATIO_PERCENTAGES[reps][sets];

    if (!percentage || weight <= 0) {
      return { valid: false, message: "Enter a working weight above 0 kg." };
    }

    const baseRatio = percentage / 100;
    const baseEstimated1Rm = weight / baseRatio;
    const target1Rm = baseEstimated1Rm + additional1Rm;

    if (target1Rm <= 0) {
      return { valid: false, message: "Target 1RM must be above 0 kg." };
    }

    var matches = [];
    for (var ri = 0; ri < REP_OPTIONS.length; ri++) {
      for (var si = 0; si < SET_OPTIONS.length; si++) {
        var repOption = REP_OPTIONS[ri];
        var setOption = SET_OPTIONS[si];
        var optionPct = RATIO_PERCENTAGES[repOption][setOption];
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
      var d = Math.abs(a.error) - Math.abs(b.error);
      if (d !== 0) return d;
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
