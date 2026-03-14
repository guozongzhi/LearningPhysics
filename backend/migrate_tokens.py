import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "learningphysics.db")

if not os.path.exists(db_path):
    print(f"Database {db_path} does not exist. (If running tests/in-memory, skip this).")
    exit(0)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Try adding token_usage
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN token_usage INTEGER DEFAULT 0 NOT NULL;")
        print("Added token_usage column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("token_usage already exists")
        else:
            print(f"Error adding token_usage: {e}")

    # Try adding token_limit
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN token_limit INTEGER DEFAULT 100000 NOT NULL;")
        print("Added token_limit column")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("token_limit already exists")
        else:
            print(f"Error adding token_limit: {e}")

    conn.commit()
    conn.close()
    print("Migration finished successfully.")
except Exception as e:
    print(f"Migration failed: {e}")
