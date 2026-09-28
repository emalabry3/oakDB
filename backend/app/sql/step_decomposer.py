"""
Décompose une requête SQL en étapes d'exécution logiques.
Utilise la manipulation d'AST sqlglot pour construire les requêtes partielles.
"""
import re
from dataclasses import dataclass, field
from typing import Optional
import sqlglot
import sqlglot.expressions as exp


@dataclass
class QueryStep:
    id: str
    label: str
    explanation: str
    partial_sql: str
    highlight_start: int
    highlight_end: int
    columns: list = field(default_factory=list)
    rows: list = field(default_factory=list)
    subquery_steps: Optional[list] = None  # sous-requêtes imbriquées


class StepDecomposer:

    def decompose(self, query: str) -> list[QueryStep]:
        """Analyse la requête et retourne la liste ordonnée des étapes."""
        try:
            ast = sqlglot.parse_one(query, dialect="duckdb")
        except Exception as e:
            raise ValueError(f"Requête invalide : {e}")

        if not isinstance(ast, exp.Select):
            raise ValueError("Seules les requêtes SELECT sont supportées pour la visualisation.")

        from_node  = ast.args.get("from")
        if not from_node:
            raise ValueError("La requête doit contenir une clause FROM.")

        joins      = ast.args.get("joins") or []
        where_node = ast.args.get("where")
        group_node = ast.args.get("group")
        having_node= ast.args.get("having")
        order_node = ast.args.get("order")
        limit_node = ast.args.get("limit")
        distinct   = bool(ast.args.get("distinct"))
        select_exprs = ast.expressions

        has_aggregates = any(
            e.find(exp.AggFunc) is not None for e in select_exprs
        ) or (group_node is not None)

        steps: list[QueryStep] = []

        # ── Sous-requêtes dans FROM (tables dérivées) ────────────────────────
        subquery_in_from = None
        if isinstance(from_node.this, exp.Subquery):
            subq_ast = from_node.this.this
            subq_sql = subq_ast.sql(dialect="duckdb")
            subq_steps = self._decompose_subquery(subq_sql, query)
            hs, he = self._find_range(query, r'\bFROM\b')
            steps.append(QueryStep(
                id="SUBQUERY",
                label="Sous-requête dans FROM",
                explanation="Cette sous-requête est exécutée en premier. Son résultat forme une table temporaire utilisée par la requête principale.",
                partial_sql=subq_sql,
                highlight_start=hs,
                highlight_end=he,
                subquery_steps=subq_steps,
            ))
            subquery_in_from = True

        # ── Sous-requêtes dans WHERE (IN, EXISTS, scalaire) ──────────────────
        subquery_in_where = None
        if where_node:
            for subq_node in where_node.find_all(exp.Subquery):
                subq_sql = subq_node.this.sql(dialect="duckdb")
                subq_steps = self._decompose_subquery(subq_sql, query)
                hs, he = self._find_range(query, r'\bWHERE\b')
                steps.append(QueryStep(
                    id="SUBQUERY",
                    label="Sous-requête dans WHERE",
                    explanation="Cette sous-requête s'exécute en premier. Son résultat est injecté dans la condition WHERE de la requête principale.",
                    partial_sql=subq_sql,
                    highlight_start=hs,
                    highlight_end=he,
                    subquery_steps=subq_steps,
                ))
                subquery_in_where = True
                break  # une seule sous-requête traitée pour l'instant

        # ── Étape FROM ───────────────────────────────────────────────────────
        from_ast = ast.copy()
        from_ast.set("where", None)
        from_ast.set("group", None)
        from_ast.set("having", None)
        from_ast.set("order", None)
        from_ast.set("limit", None)
        from_ast.set("offset", None)
        from_ast.set("distinct", None)
        from_ast.set("expressions", [exp.Star()])
        table_name = self._table_name(from_node)
        hs, he = self._find_range(query, r'\bFROM\b')
        steps.append(QueryStep(
            id="FROM",
            label="Lecture de la table",
            explanation=f"SQL commence par charger toutes les lignes de la table «\u202f{table_name}\u202f».",
            partial_sql=from_ast.sql(dialect="duckdb"),
            highlight_start=hs,
            highlight_end=he,
        ))

        # ── Étapes JOIN ──────────────────────────────────────────────────────
        if joins:
            for i, join in enumerate(joins):
                join_ast = ast.copy()
                join_ast.set("where", None)
                join_ast.set("group", None)
                join_ast.set("having", None)
                join_ast.set("order", None)
                join_ast.set("limit", None)
                join_ast.set("offset", None)
                join_ast.set("distinct", None)
                join_ast.set("expressions", [exp.Star()])
                # Ne garder que les i+1 premiers JOINs
                join_ast.set("joins", joins[:i+1])
                join_type = self._join_type(join)
                join_table = self._join_table_name(join)
                hs, he = self._find_range(query, r'\bJOIN\b')
                steps.append(QueryStep(
                    id="JOIN",
                    label=f"Jointure ({join_type})",
                    explanation=f"{join_type} avec la table «\u202f{join_table}\u202f»\u202f: les lignes des deux tables sont combinées selon la condition de jointure.",
                    partial_sql=join_ast.sql(dialect="duckdb"),
                    highlight_start=hs,
                    highlight_end=he,
                ))

        # ── Étape WHERE ──────────────────────────────────────────────────────
        if where_node:
            where_ast = ast.copy()
            where_ast.set("group", None)
            where_ast.set("having", None)
            where_ast.set("order", None)
            where_ast.set("limit", None)
            where_ast.set("offset", None)
            where_ast.set("distinct", None)
            where_ast.set("expressions", [exp.Star()])
            cond_text = where_node.this.sql(dialect="duckdb")
            hs, he = self._find_range(query, r'\bWHERE\b')
            steps.append(QueryStep(
                id="WHERE",
                label="Filtrage des lignes",
                explanation=f"La condition «\u202f{cond_text}\u202f» est évaluée pour chaque ligne. Les lignes qui ne la satisfont pas sont éliminées.",
                partial_sql=where_ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        # ── Étape GROUP BY + agrégations ──────────────────────────────────────
        if group_node:
            group_ast = ast.copy()
            group_ast.set("having", None)
            group_ast.set("order", None)
            group_ast.set("limit", None)
            group_ast.set("offset", None)
            group_ast.set("distinct", None)
            group_cols = ", ".join(c.sql(dialect="duckdb") for c in group_node.expressions)
            agg_names = [
                e.alias or e.sql(dialect="duckdb")
                for e in select_exprs
                if e.find(exp.AggFunc) is not None
            ]
            agg_text = ", ".join(agg_names) if agg_names else "les agrégats"
            hs, he = self._find_range(query, r'\bGROUP\s+BY\b')
            steps.append(QueryStep(
                id="GROUP_BY",
                label="Regroupement et agrégation",
                explanation=f"Les lignes ayant la même valeur de «\u202f{group_cols}\u202f» sont regroupées. Les fonctions d'agrégation ({agg_text}) sont calculées pour chaque groupe.",
                partial_sql=group_ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        # ── Étape HAVING ─────────────────────────────────────────────────────
        if having_node:
            having_ast = ast.copy()
            having_ast.set("order", None)
            having_ast.set("limit", None)
            having_ast.set("offset", None)
            having_ast.set("distinct", None)
            cond_text = having_node.this.sql(dialect="duckdb")
            hs, he = self._find_range(query, r'\bHAVING\b')
            steps.append(QueryStep(
                id="HAVING",
                label="Filtrage des groupes",
                explanation=f"La condition «\u202f{cond_text}\u202f» est appliquée sur les groupes. Les groupes qui ne la satisfont pas sont éliminés.",
                partial_sql=having_ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        # ── Étape SELECT (projection) — uniquement si pas de GROUP BY ─────────
        if not has_aggregates:
            is_star = len(select_exprs) == 1 and isinstance(select_exprs[0], exp.Star)
            if not is_star:
                select_ast = ast.copy()
                select_ast.set("order", None)
                select_ast.set("limit", None)
                select_ast.set("offset", None)
                select_ast.set("distinct", None)
                cols_sql = ", ".join(c.sql(dialect="duckdb") for c in select_exprs)
                hs, he = self._find_range(query, r'\bSELECT\b')
                steps.append(QueryStep(
                    id="SELECT",
                    label="Projection des colonnes",
                    explanation=f"Seules les colonnes demandées sont conservées\u202f: {cols_sql}.",
                    partial_sql=select_ast.sql(dialect="duckdb"),
                    highlight_start=hs,
                    highlight_end=he,
                ))

        # ── Étape DISTINCT ───────────────────────────────────────────────────
        if distinct:
            distinct_ast = ast.copy()
            distinct_ast.set("order", None)
            distinct_ast.set("limit", None)
            distinct_ast.set("offset", None)
            hs, he = self._find_range(query, r'\bDISTINCT\b')
            steps.append(QueryStep(
                id="DISTINCT",
                label="Suppression des doublons",
                explanation="Les lignes identiques sont éliminées\u202f: DISTINCT ne conserve qu'une seule occurrence de chaque combinaison de valeurs.",
                partial_sql=distinct_ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        # ── Étape ORDER BY ───────────────────────────────────────────────────
        if order_node:
            order_ast = ast.copy()
            order_ast.set("limit", None)
            order_ast.set("offset", None)
            order_cols = ", ".join(s.sql(dialect="duckdb") for s in order_node.expressions)
            hs, he = self._find_range(query, r'\bORDER\s+BY\b')
            steps.append(QueryStep(
                id="ORDER_BY",
                label="Tri des résultats",
                explanation=f"Les lignes sont triées selon\u202f: {order_cols}.",
                partial_sql=order_ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        # ── Étape LIMIT ──────────────────────────────────────────────────────
        if limit_node:
            limit_val = limit_node.sql(dialect="duckdb").replace("LIMIT", "").strip()
            hs, he = self._find_range(query, r'\bLIMIT\b')
            steps.append(QueryStep(
                id="LIMIT",
                label="Limitation du nombre de résultats",
                explanation=f"Seules les {limit_val} premières lignes sont conservées.",
                partial_sql=ast.sql(dialect="duckdb"),
                highlight_start=hs,
                highlight_end=he,
            ))

        return steps

    def _decompose_subquery(self, subq_sql: str, parent_query: str) -> list[dict]:
        """Décompose une sous-requête. Retourne une liste de dicts sérialisables."""
        try:
            sub_steps = self.decompose(subq_sql)
            return [
                {
                    "id": s.id,
                    "label": s.label,
                    "explanation": s.explanation,
                    "partial_sql": s.partial_sql,
                    "highlight_start": s.highlight_start,
                    "highlight_end": s.highlight_end,
                }
                for s in sub_steps
            ]
        except Exception:
            return []

    def _table_name(self, from_node: exp.From) -> str:
        t = from_node.this
        if isinstance(t, exp.Subquery):
            alias = t.alias
            return f"({alias})" if alias else "(sous-requête)"
        if hasattr(t, "alias") and t.alias:
            return t.alias
        if hasattr(t, "name") and t.name:
            return t.name
        return t.sql(dialect="duckdb")

    def _join_type(self, join: exp.Join) -> str:
        kind = join.args.get("kind")
        side = join.args.get("side")
        if kind:
            k = kind.upper() if isinstance(kind, str) else kind.sql().upper()
            if "CROSS" in k:
                return "CROSS JOIN"
        if side:
            s = side.upper() if isinstance(side, str) else side.sql().upper()
            if "LEFT" in s:
                return "LEFT JOIN"
            if "RIGHT" in s:
                return "RIGHT JOIN"
            if "FULL" in s:
                return "FULL OUTER JOIN"
        return "INNER JOIN"

    def _join_table_name(self, join: exp.Join) -> str:
        t = join.this
        if hasattr(t, "alias") and t.alias:
            return t.alias
        if hasattr(t, "name") and t.name:
            return t.name
        return t.sql(dialect="duckdb")

    def _find_range(self, query: str, pattern: str) -> tuple[int, int]:
        m = re.search(pattern, query, re.IGNORECASE)
        if m:
            return m.start(), m.end()
        return 0, len(query)


decomposer = StepDecomposer()
