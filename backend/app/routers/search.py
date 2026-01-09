from fastapi import APIRouter, HTTPException, Depends, Request
from jose import JWTError, jwt
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import requests
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

@router.get("/autocomplete")
def autocomplete_ingredients(query: str):
    api_key = "a880ccc7301246b5abe560f304b5407b"
    url = f"https://api.spoonacular.com/food/ingredients/autocomplete?query={query}&number=5&apiKey={api_key}"

    print(f"Отправляем запрос на: {url}")

    try:
        response = requests.get(url)
        data = response.json()
        print(f"Ответ от Spoonacular: {data}")

        if response.status_code == 200:
            return data
        else:
            print("Ошибка API:", response.status_code)
            return []
    except Exception as e:
        print(f"Ошибка запроса: {e}")
        return []


@router.get("/recipes")
def search_recipes(ingredients: str, number: int = 10):
    api_key = "a880ccc7301246b5abe560f304b5407b"
    url = "https://api.spoonacular.com/recipes/findByIngredients"

    params = {
        "apiKey": api_key,
        "ingredients": ingredients,
        "number": number,
        "ignorePantry": False
    }

    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Error fetching recipes: {e}")
        return []