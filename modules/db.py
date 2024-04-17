import sqlite3
from flask import g, current_app

DATABASE = 'database.db'

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            DATABASE,
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    with open('schema.sql', 'r') as f:
        db.executescript(f.read())
    db.commit()

def insert_article(title, url, summary, sentiment, image, source, time):
    db = get_db()
    try:
        db.execute('''
            INSERT INTO articles (title, url, summary, sentiment, image, source, time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (title, url, summary, sentiment, image, source, time))
        db.commit()
    except sqlite3.IntegrityError as e:
        print(f"Error inserting article: {e}")
        print(f"Title: {title}, URL: {url}")

def get_articles(limit=15):
    db = get_db()
    query = 'SELECT * FROM articles ORDER BY timestamp DESC LIMIT ?'
    articles = db.execute(query, (limit,)).fetchall()
    return articles

def article_exists(url):
    db = get_db()
    article = db.execute('SELECT 1 FROM articles WHERE url = ?', (url,)).fetchone()
    return bool(article)
