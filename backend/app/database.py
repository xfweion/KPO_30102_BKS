import psycopg2
from psycopg2.extras import RealDictCursor

DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "recipes_app"
DB_USER = "postgres"
DB_PASSWORD = "12345"  # подставь свои реальные данные

def get_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor,  # чтобы результаты были dict, а не tuple
    )
    return conn
