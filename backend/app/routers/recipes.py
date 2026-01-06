from fastapi import APIRouter, HTTPException
from app.spoonacular_client import get_recipe_information

router = APIRouter(tags=["recipes"])

@router.get("/recipes/{spoonacular_id}")
async def get_recipe(spoonacular_id: int):
    try:
        recipe = await get_recipe_information(spoonacular_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Spoonacular API error")

    return recipe