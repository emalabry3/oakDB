"""
Exécute les requêtes partielles d'un StepDecomposer et retourne
les colonnes + lignes pour chaque étape.
"""
from .slot_loader import SlotDatabase
from .step_decomposer import QueryStep


def execute_steps(steps: list[QueryStep], db: SlotDatabase) -> list[dict]:
    result = []
    for step in steps:
        try:
            data = db.execute(step.partial_sql)
            columns = data["columns"]
            rows = data["rows"]
        except Exception:
            columns = []
            rows = []

        step_dict = {
            "id": step.id,
            "label": step.label,
            "explanation": step.explanation,
            "highlight_start": step.highlight_start,
            "highlight_end": step.highlight_end,
            "columns": columns,
            "rows": rows,
        }

        if step.subquery_steps:
            enriched_subq = []
            for sub in step.subquery_steps:
                try:
                    sub_data = db.execute(sub["partial_sql"])
                    sub_cols = sub_data["columns"]
                    sub_rows = sub_data["rows"]
                except Exception:
                    sub_cols = []
                    sub_rows = []
                enriched_subq.append({**sub, "columns": sub_cols, "rows": sub_rows})
            step_dict["subquery_steps"] = enriched_subq
        else:
            step_dict["subquery_steps"] = None

        result.append(step_dict)
    return result
