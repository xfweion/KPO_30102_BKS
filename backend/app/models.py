from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class FavoriteRecipeCreate(BaseModel):
    spoonacular_id: int
    title: str
    image: str | None = None

class SearchQueryCreate(BaseModel):
    ingredients: list[str]

class RecipeSearchRequest(BaseModel):
    ingredients: list[str]
    number: int = 10

class FavoriteByIdCreate(BaseModel):
    spoonacular_id: int