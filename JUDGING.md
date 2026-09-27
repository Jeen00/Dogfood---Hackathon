# Judging System

## Overview

The DOGFOOD 2026 judging system uses a **track-based assignment strategy**, a **weighted rubric scoring model**, and **Z-score cross-judge normalization** to produce fair, comparable scores across all judges.

---

## 1. Judge Assignment Strategy

### Track-Based Assignment

Each judge is associated with one or more tracks (stored in `fixtures.json` under `judges[].tracks`). During seeding, the auto-assignment algorithm runs:

```
For each project:
  If any judges have this project's track in their track list:
    Assign all those judges to this project
  Else (no track match):
    Assign the first 3 judges as fallback
```

This ensures subject-matter relevance: a judge who covers "Security" only reviews Security-track projects.

The result is stored in the `judge_assignments` table with a UNIQUE constraint on `(judge_id, project_id)` to prevent duplicate assignments.

---

## 2. Weighted Scoring Formula

Each judge rates a project on 3 criteria, each on a 1-5 integer scale:

| Criterion     | Weight | Justification |
|---------------|--------|---------------|
| Functionality | 50%    | Does it work? Core technical execution. |
| Quality       | 30%    | Code quality, architecture, documentation. |
| Presentation  | 20%    | Demo clarity and communication of impact. |

**Weighted score formula:**

```
weighted_score = (functionality * 0.5) + (quality * 0.3) + (presentation * 0.2)
```

Range: minimum 1.0 (all criteria = 1), maximum 5.0 (all criteria = 5).

Weights sum to 1.0 by design. They are stored in the `rubric_criteria` table and can be modified per event.

---

## 3. Cross-Judge Normalization (Z-Score)

Different judges have different grading tendencies. A generous judge giving 4-5 across the board is not comparable to a strict judge giving 1-3. Z-score normalization corrects for this.

### Algorithm

For each judge separately:

1. Collect all of the judge's weighted scores.
2. Compute the **mean** across all their scores:
   ```
   mean = sum(weighted_scores) / count
   ```
3. Compute the **standard deviation**:
   ```
   variance = sum((score - mean)^2) / count
   stddev = sqrt(variance)
   ```
4. Compute the **Z-score** for each score:
   ```
   z = (weighted_score - mean) / stddev
   ```

### Edge Case: stddev = 0

If a judge gives the exact same score to every project (e.g., all criteria = 3 for all projects), their standard deviation is 0. Division by zero is avoided by setting:

```
if stddev == 0: z = 0
```

This is explicitly handled in `src/routes/normalization.js`. It means the judge's scores are uninformative for cross-judge comparison but are not discarded. The jdg_05 fixture judge exercises this edge case.

### Result Interpretation

A Z-score of 0 means the project scored exactly at that judge's average. A Z-score of +1.5 means the project scored 1.5 standard deviations above that judge's average. Negative Z-scores are below the judge's average.

Z-scores are stored in the `normalized_scores` table and exposed via:
- `GET /api/normalization/results` (JSON)
- `GET /organizer/normalization` (HTML table)

---

## 4. Why Z-Score Over Min-Max Normalization

Min-max normalization maps scores to [0, 1]:
```
normalized = (score - min) / (max - min)
```

This is sensitive to **outliers**: a single extreme score compresses all other scores. It also loses meaning when a judge only reviews 2 projects (range = 1 score gap).

Z-score normalization is **outlier-robust** and **scale-invariant**: it measures relative performance within each judge's distribution. A project that consistently outperforms a judge's other reviews will show a high positive Z-score regardless of the judge's absolute leniency.

---

## 5. Role Isolation Enforcement

The judging system enforces strict data isolation by role:

| Route | Judge (own) | Judge (other's) | Organizer |
|-------|-------------|-----------------|-----------|
| `GET /api/judge/scores` | 200 own scores | 403 Forbidden | 200 all scores |
| `GET /api/judge/scores?judge=jdg_01` | 200 (if jdg_01) | 403 Forbidden | 200 jdg_01's scores |
| `POST /api/judge/scores` | 201 if assigned | N/A (own) | N/A |
| `GET /api/export.csv` | 403 | 403 | 200 full CSV |
| `POST /api/normalization/run` | 403 | 403 | 200 |

This is enforced at the route level by the `requireRole()` middleware and additional `req.session.userId !== req.query.judge` checks.

---

## 6. Audit Trail

Every score submission and project edit is recorded in the `audit_log` table:

```sql
INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at)
```

Actions logged: `score_submitted`, `project_submitted`, `project_updated`, `team_created`, `team_joined`.

This provides a non-repudiable record of all judging activity for dispute resolution.
