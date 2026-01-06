from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class FavoriteRecipeCreate(BaseModel):
    spoonacular_id: int
    title: str
    image: str | None = None

class SearchQueryCreate(BaseModel):
    ingredients: list[str]

class RecipeSearchRequest(BaseModel):
    ingredients: list[str]
    number: int = 10