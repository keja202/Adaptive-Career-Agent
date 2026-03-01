def normalize(items):
    return [x.strip().lower() for x in items if x and x.strip()]


SKILL_SYNONYMS = {
    "tensorflow": ["deep_learning", "ml"],
    "pytorch": ["deep_learning", "ml"],
    "keras": ["deep_learning"],
    "sklearn": ["ml"],
    "scikit-learn": ["ml"],
    "numpy": ["python"],
    "pandas": ["python"],
    "transformers": ["nlp", "deep_learning"],
}


def expand_user_skills(user_skills):
    expanded = set(normalize(user_skills))
    for s in list(expanded):
        if s in SKILL_SYNONYMS:
            expanded.update(SKILL_SYNONYMS[s])
    return list(expanded)
