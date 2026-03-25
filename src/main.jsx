import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const REP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SET_OPTIONS = [1, 2, 3, 4, 5];
const ROUNDING_STEP_KG = 0.5;

// Ratios from the provided chart: reps x number of top sets.
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
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

function formatKg(value, decimals = 1) {
  return `${value.toFixed(decimals)} kg`;
}

function App() {
  const [weightInput, setWeightInput] = useState("75");
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(1);
  const [additional1RmInput, setAdditional1RmInput] = useState("1.7");
  const [toleranceInput, setToleranceInput] = useState("0.1");

  const calculations = useMemo(() => {
    const weight = toNumber(weightInput, 0);
    const additional1Rm = toNumber(additional1RmInput, 0);
    const tolerance = Math.max(0, toNumber(toleranceInput, 0));
    const percentage = RATIO_PERCENTAGES[reps]?.[sets];

    if (!percentage || weight <= 0) {
      return {
        valid: false,
        message: "Enter a working weight above 0 kg.",
      };
    }

    const baseRatio = percentage / 100;
    const baseEstimated1Rm = weight / baseRatio;
    const target1Rm = baseEstimated1Rm + additional1Rm;
    if (target1Rm <= 0) {
      return {
        valid: false,
        message: "Target 1RM must be above 0 kg.",
      };
    }

    const matches = [];
    for (const repOption of REP_OPTIONS) {
      for (const setOption of SET_OPTIONS) {
        const optionPct = RATIO_PERCENTAGES[repOption][setOption];
        const optionRatio = optionPct / 100;

        const exactWorkingWeight = target1Rm * optionRatio;
        const roundedWorkingWeight = roundToStep(exactWorkingWeight, ROUNDING_STEP_KG);
        const achieved1Rm = roundedWorkingWeight / optionRatio;
        const error = achieved1Rm - target1Rm;

        if (Math.abs(error) <= tolerance) {
          matches.push({
            reps: repOption,
            sets: setOption,
            ratioPct: optionPct,
            exactWorkingWeight,
            roundedWorkingWeight,
            achieved1Rm,
            error,
          });
        }
      }
    }

    matches.sort((a, b) => {
      const absErrorDiff = Math.abs(a.error) - Math.abs(b.error);
      if (absErrorDiff !== 0) {
        return absErrorDiff;
      }
      if (a.sets !== b.sets) {
        return a.sets - b.sets;
      }
      return a.reps - b.reps;
    });

    return {
      valid: true,
      weight,
      reps,
      sets,
      ratioPct: percentage,
      baseEstimated1Rm,
      target1Rm,
      additional1Rm,
      tolerance,
      matches,
    };
  }, [weightInput, reps, sets, additional1RmInput, toleranceInput]);

  return (
    <div className="container">
      <section className="card">
        <h1>1RM Equivalent Set/Rep Calculator</h1>
        <p>Offline static app using your chart percentages (1-10 reps, 1-5 top sets).</p>

        <div className="inputs">
          <div className="input-group">
            <label htmlFor="weight">Working weight (kg)</label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={weightInput}
              onChange={(event) => setWeightInput(event.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="reps">Reps</label>
            <select
              id="reps"
              value={reps}
              onChange={(event) => setReps(Number(event.target.value))}
            >
              {REP_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="sets">Top sets</label>
            <select
              id="sets"
              value={sets}
              onChange={(event) => setSets(Number(event.target.value))}
            >
              {SET_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="add1rm">Add to estimated 1RM (kg)</label>
            <input
              id="add1rm"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={additional1RmInput}
              onChange={(event) => setAdditional1RmInput(event.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="tolerance">Margin of error (+/- kg on 1RM)</label>
            <input
              id="tolerance"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={toleranceInput}
              onChange={(event) => setToleranceInput(event.target.value)}
            />
          </div>
        </div>

        {calculations.valid ? (
          <div className="stats">
            <div className="stat">
              <span className="label">Base percentage used</span>
              <span className="value">{calculations.ratioPct.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="label">Estimated current 1RM</span>
              <span className="value">{formatKg(calculations.baseEstimated1Rm)}</span>
            </div>
            <div className="stat">
              <span className="label">Target 1RM (after addition)</span>
              <span className="value highlight">{formatKg(calculations.target1Rm)}</span>
            </div>
            <div className="stat">
              <span className="label">Matching schemes found</span>
              <span className="value">{calculations.matches.length}</span>
            </div>
          </div>
        ) : (
          <p className="note">{calculations.message}</p>
        )}
      </section>

      <section className="card">
        <h2>Equivalent alternatives</h2>
        <p>
          Working weights are rounded to the nearest {ROUNDING_STEP_KG.toFixed(1)} kg, then checked
          against your margin-of-error field.
        </p>

        {calculations.valid && calculations.matches.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reps</th>
                  <th>Sets</th>
                  <th>Ratio</th>
                  <th>Exact weight</th>
                  <th>Rounded weight</th>
                  <th>Achieved 1RM</th>
                  <th>Error vs target</th>
                </tr>
              </thead>
              <tbody>
                {calculations.matches.map((row) => (
                  <tr key={`${row.reps}-${row.sets}`}>
                    <td>{row.reps}</td>
                    <td>{row.sets}</td>
                    <td>{row.ratioPct.toFixed(1)}%</td>
                    <td>{formatKg(row.exactWorkingWeight, 2)}</td>
                    <td>{formatKg(row.roundedWorkingWeight, 1)}</td>
                    <td>{formatKg(row.achieved1Rm, 2)}</td>
                    <td>{`${row.error >= 0 ? "+" : ""}${row.error.toFixed(2)} kg`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : calculations.valid ? (
          <p className="note">No matches found with this tolerance. Increase margin of error.</p>
        ) : (
          <p className="note">Enter a valid weight to generate equivalents.</p>
        )}
      </section>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
