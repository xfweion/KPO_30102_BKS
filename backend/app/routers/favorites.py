from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_db
from app.models import FavoriteByIdCreate
from app.repositories import list_favorites, add_favorite, remove_favorite
from app.spoonacular_client import get_recipe_information

router = APIRouter(tags=["favorites"])

@router.get("/favorites")
async def get_favorites(current_user=Depends(get_current_user_db)):
    return {"items": list_favorites(current_user["id"])}

@router.post("/favorites")
async def create_favorite(body: FavoriteByIdCreate, current_user=Depends(get_current_user_db)):
    try:
        recipe = await get_recipe_information(body.spoonacular_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Spoonacular API error")

    title = recipe.get("title")
    image = recipe.get("image")

    if not title:
        raise HTTPException(status_code=502, detail="Spoonacular response missing title")

    try:
        add_favorite(current_user["id"], body.spoonacular_id, title, image)
    except Exception:
        raise HTTPException(status_code=400, detail="Recipe already in favorites")

    return {"message": "Added to favorites", "spoonacular_id": body.spoonacular_id, "title": title, "image": image}


@router.delete("/favorites/{spoonacular_id}")
async def delete_favorite(spoonacular_id: int, current_user=Depends(get_current_user_db)):
    deleted = remove_favorite(current_user["id"], spoonacular_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Removed from favorites"}
