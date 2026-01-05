from app.database import get_connection

# users

def get_user_by_email(email: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()
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

# favorites

def list_favorites(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT spoonacular_id, title, image, created_at
        FROM favorites
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,),
    )
    items = cur.fetchall()
    cur.close()
    conn.close()
    return items

def add_favorite(user_id: int, spoonacular_id: int, title: str, image: str | None):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO favorites (user_id, spoonacular_id, title, image)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, spoonacular_id, title, image),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

def remove_favorite(user_id: int, spoonacular_id: int) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM favorites WHERE user_id = %s AND spoonacular_id = %s",
        (user_id, spoonacular_id),
    )
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return deleted

# history

def add_history_item(user_id: int, ingredients: list[str]):
    ingredients_str = ",".join(ingredients)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO search_history (user_id, ingredients) VALUES (%s, %s)",
        (user_id, ingredients_str),
    )
    conn.commit()
    cur.close()
    conn.close()

def list_history(user_id: int, limit: int = 50):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, ingredients, created_at
        FROM search_history
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (user_id, limit),
    )
    items = cur.fetchall()
    cur.close()
    conn.close()

    for x in items:
        x["ingredients"] = [s for s in x["ingredients"].split(",") if s]

    return items
