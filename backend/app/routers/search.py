from fastapi import APIRouter, HTTPException, Depends, Request
from jose import JWTError, jwt
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models import RecipeSearchRequest
from app.spoonacular_client import find_by_ingredients
from app.repositories import add_history_item, get_user_by_email
from app.security import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["search"])

bearer_optional = HTTPBearer(auto_error=False)

def try_get_user_from_auth(credentials: HTTPAuthorizationCredentials | None): # гость или зарегистрированный пользователь
    if credentials is None:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None

    return get_user_by_email(email)

@router.post("/search")
async def search_recipes(
    body: RecipeSearchRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_optional),
):
    ingredients = [x.strip() for x in body.ingredients if x.strip()]
    if not ingredients:
        raise HTTPException(status_code=400, detail="Ingredients list is empty")

    try:
        recipes = await find_by_ingredients(ingredients, number=body.number)
    except Exception:
        #пока так
        raise HTTPException(status_code=502, detail="Spoonacular API error")

    user = try_get_user_from_auth(credentials)
    if user:
        add_history_item(user["id"], ingredients)

    return {"ingredients": ingredients, "results": recipes}
