"""Проверка data/services.json. Запуск: python tools/validate.py"""
import json
import re
import sys
from pathlib import Path

PATH = Path(__file__).resolve().parent.parent / "data" / "services.json"
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main() -> int:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    cats = data["categories"]
    errors, seen = [], set()

    for i, s in enumerate(data["services"]):
        where = f"#{i} {s.get('id', '?')}"
        for key in ("id", "name", "category", "steps"):
            if not s.get(key):
                errors.append(f"{where}: нет поля {key}")
        if not re.fullmatch(r"[a-z0-9-]+", s.get("id", "")):
            errors.append(f"{where}: id только из a-z, 0-9 и дефиса")
        if s.get("id") in seen:
            errors.append(f"{where}: повторяющийся id")
        seen.add(s.get("id"))
        if s.get("category") not in cats:
            errors.append(f"{where}: неизвестная категория {s.get('category')}")
        if not all(isinstance(x, str) and x.strip() for x in s.get("steps", [])):
            errors.append(f"{where}: пустой шаг")
        for link in s.get("links", []):
            if not str(link.get("url", "")).startswith("https://"):
                errors.append(f"{where}: ссылка должна начинаться с https://")
        checked = s.get("checked")
        if checked is not None and not DATE.match(str(checked)):
            errors.append(f"{where}: checked — дата ГГГГ-ММ-ДД или null")

    for e in errors:
        print("✗", e)
    print(f"{len(data['services'])} сервисов, ошибок: {len(errors)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
