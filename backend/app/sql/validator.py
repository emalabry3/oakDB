"""
Compare le résultat d'une requête soumise avec la réponse de référence.
"""
from decimal import Decimal
from datetime import date, datetime


def _normalize(v):
    """Normalise une valeur pour la comparaison (float, string de date, etc.)."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _row_key(row: list, col_indices: list[int]) -> tuple:
    return tuple(_normalize(row[i]) for i in col_indices)


def compare_results(
    submitted: dict,
    expected: dict,
    order_sensitive: bool = False
) -> tuple[bool, str]:
    """
    Compare deux résultats SQL.
    Retourne (success, feedback_message).
    """
    sub_cols = [c.lower() for c in submitted.get("columns", [])]
    exp_cols = [c.lower() for c in expected.get("columns", [])]
    sub_rows = submitted.get("rows", [])
    exp_rows = expected.get("rows", [])

    # Vérifier les colonnes
    if set(sub_cols) != set(exp_cols):
        missing = set(exp_cols) - set(sub_cols)
        extra   = set(sub_cols) - set(exp_cols)
        parts = []
        if missing:
            parts.append(f"colonne(s) manquante(s) : {', '.join(missing)}")
        if extra:
            parts.append(f"colonne(s) inattendue(s) : {', '.join(extra)}")
        return False, "Colonnes incorrectes — " + " ; ".join(parts) + "."

    # Vérifier le nombre de lignes
    if len(sub_rows) != len(exp_rows):
        return False, (
            f"Votre requête retourne {len(sub_rows)} ligne(s), "
            f"{len(exp_rows)} attendue(s)."
        )

    if len(exp_rows) == 0:
        return True, "Correct ✓"

    # Réordonner les colonnes soumises pour correspondre à l'ordre attendu
    try:
        col_map = [sub_cols.index(c) for c in exp_cols]
    except ValueError as e:
        return False, f"Colonne introuvable : {e}"

    # Normaliser les lignes soumises dans l'ordre des colonnes attendues
    def reorder(row):
        return [_normalize(row[i]) for i in col_map]

    def normalize_exp(row):
        return [_normalize(v) for v in row]

    sub_normalized = [reorder(r) for r in sub_rows]
    exp_normalized = [normalize_exp(r) for r in exp_rows]

    if order_sensitive:
        if sub_normalized != exp_normalized:
            # Trouver la première ligne différente
            for i, (s, e) in enumerate(zip(sub_normalized, exp_normalized)):
                if s != e:
                    return False, f"L'ordre des lignes est incorrect (différence à la ligne {i + 1})."
            return False, "L'ordre des lignes ne correspond pas au résultat attendu."
    else:
        def to_set(rows):
            return sorted([tuple(r) for r in rows])
        if to_set(sub_normalized) != to_set(exp_normalized):
            return False, (
                f"Votre requête retourne {len(sub_rows)} ligne(s) mais le contenu "
                f"ne correspond pas au résultat attendu."
            )

    return True, "Correct ✓"
