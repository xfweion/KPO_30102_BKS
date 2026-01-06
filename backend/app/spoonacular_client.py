from typing import List, Any
import httpx

from app.config import SPOONACULAR_API_KEY

BASE_URL = "https://api.spoonacular.com"

async def find_by_ingredients(ingredients: List[str], number: int = 10) -> list[dict[str, Any]]:
    url = f"{BASE_URL}/recipes/findByIngredients"

    params = {
        "apiKey": SPOONACULAR_API_KEY,
        "ingredients": ",".join(ingredients),
        "number": number,
        "ranking": 1,
        "ignorePantry": True,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()