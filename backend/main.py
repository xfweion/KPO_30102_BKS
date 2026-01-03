from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import hashlib
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_connection


app = FastAPI()

SECRET_KEY = "your_secret_key_here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

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

def sha256_password(password: str) -> bytes:
    return hashlib.sha256(password.encode('utf-8')).digest()

def get_password_hash(password: str) -> str:
    sha256_pw_bytes = sha256_password(password)
    return pwd_context.hash(sha256_pw_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_pw_bytes = sha256_password(plain_password)
    return pwd_context.verify(sha256_pw_bytes, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=600))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return email

def get_user_by_email(email: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def get_user_by_id(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def get_current_user_db(current_user_email: str = Depends(get_current_user)):
    user = get_user_by_email(current_user_email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def create_user(email: str, password_hash: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s)",
        (email, password_hash),
    )
    conn.commit()
    cur.close()
    conn.close()


@app.post("/register")
async def register(user: UserCreate):
    existing = get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    create_user(user.email, hashed_password)
    return {"message": "User registered successfully"}


@app.post("/login")
async def login(user: UserLogin):
    db_user = get_user_by_email(user.email)
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(
        {"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me")
async def me(current_user_email: str = Depends(get_current_user)):
    return {"email": current_user_email}

@app.get("/favorites")
async def get_favorites(current_user=Depends(get_current_user_db)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT spoonacular_id, title, image, created_at
        FROM favorites
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (current_user["id"],)
    )
    items = cur.fetchall()
    cur.close()
    conn.close()
    return {"items": items}

@app.post("/favorites")
async def add_favorite(recipe: FavoriteRecipeCreate, current_user=Depends(get_current_user_db)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO favorites (user_id, spoonacular_id, title, image)
            VALUES (%s, %s, %s, %s)
            """,
            (current_user["id"], recipe.spoonacular_id, recipe.title, recipe.image)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        # unique
        raise HTTPException(status_code=400, detail="Recipe already in favorites")
    finally:
        cur.close()
        conn.close()

    return {"message": "Added to favorites"}


@app.delete("/favorites/{spoonacular_id}")
async def remove_favorite(spoonacular_id: int, current_user=Depends(get_current_user_db)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM favorites WHERE user_id = %s AND spoonacular_id = %s",
        (current_user["id"], spoonacular_id)
    )
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")

    return {"message": "Removed from favorites"}


@app.get("/history")
async def get_history(current_user=Depends(get_current_user_db)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, ingredients, created_at
        FROM search_history
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (current_user["id"],)
    )
    items = cur.fetchall()
    cur.close()
    conn.close()

    for x in items:
        x["ingredients"] = [s for s in x["ingredients"].split(",") if s]

    return {"items": items}


@app.post("/history")
async def add_history_item(query: SearchQueryCreate, current_user=Depends(get_current_user_db)):
    ingredients_str = ",".join(query.ingredients)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO search_history (user_id, ingredients)
        VALUES (%s, %s)
        """,
        (current_user["id"], ingredients_str)
    )
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Saved to history"}