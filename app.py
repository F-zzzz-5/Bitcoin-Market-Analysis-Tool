from flask import Flask, jsonify, render_template
from datetime import datetime, timedelta
import requests, click
from bs4 import BeautifulSoup

from flask import Flask, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from openai import OpenAI
from modules.trainer import predict_sentiment
from modules.db import get_db, init_db, close_db, insert_article, get_articles, article_exists

app = Flask(__name__)
limiter = Limiter(
    key_func=get_remote_address, 
)

cache = {
    "news": {"timestamp": None, "data": None},
    "market_data": {"timestamp": None, "data": None},
    "history": {"timestamp": None, "data": None}
}

# Cache Timeout
CACHE_TIMEOUT = timedelta(minutes=10)
client = OpenAI(api_key="") # KEY REDACTED FOR SECURITY

@app.cli.command('init-db')
def init_db_command():
    init_db()
    print('Initialized the database.')

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/api/ask', methods=['POST'])
@limiter.limit("10 per minute")
def ask():
    user_input = request.json['question']
    context = get_latest_context()
    prompt = f"{context}\n\nUser: {user_input}\nAI:"
    
    chat_response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": context},
            {"role": "user", "content": user_input}
        ],
        model="gpt-3.5-turbo",
        max_tokens=150,
        temperature=0.5
    )
    message_text = chat_response.choices[0].message.content if chat_response.choices else "Sorry, I couldn't understand that."
    return jsonify({'response': message_text})

@app.route('/api/market-data')
@limiter.limit("1 per minute")
def get_market_data():
    current_time = datetime.now()
    response = requests.get('https://api.coincap.io/v2/assets/bitcoin', timeout=5)
    if response and response.status_code == 200:
        cache['market_data'] = {"timestamp": current_time, "data": response.json()}
    else:
        return jsonify({"error": "Failed to fetch market data"}), 500

    return jsonify(cache['market_data']['data'])

@app.route('/api/bitcoin-history')
@limiter.limit("1 per minute")
def get_bitcoin_history():
    current_time = datetime.now()
    if cache['history']['timestamp'] is None or (current_time - cache['history']['timestamp']) > CACHE_TIMEOUT:
        response = requests.get('https://api.coincap.io/v2/assets/bitcoin/history?interval=h1')
        if response.status_code == 200:
            cache['history'] = {"timestamp": current_time, "data": response.json()}
        else:
            return jsonify({"error": "Failed to fetch Bitcoin history"}), 500

    return jsonify(cache['history']['data'])

@app.route('/api/scrape', methods=['GET'])
@limiter.limit("10 per minute")
def scrape_news():
    current_time = datetime.now()

    url = 'https://coinmarketcap.com/headlines/news/'
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    articles = soup.find_all('div', class_='uikit-row')
    news_data = []
    
    for article in articles:
        time = article.find('p', class_='sc-4984dd93-0 bAeTER').text if article.find('p', class_='sc-4984dd93-0 bAeTER') else "Unknown time"
        title_div = article.find(class_='sc-aef7b723-0 coCmGz')
        title = title_div.find('a').text.strip() if title_div and title_div.find('a') else "No Title"
        url = title_div.find('a')['href'] if title_div and title_div.find('a') else "No URL"
        source = article.find('span', class_='sc-4984dd93-0 kKpPOn').text if article.find('span', class_='sc-4984dd93-0 kKpPOn') else "Unknown source"
        summary = article.find(class_='sc-4984dd93-0 hLvDsV').text if article.find(class_='sc-4984dd93-0 hLvDsV') else "No summary"
        image = article.find('img')['src'] if article.find('img') else "No image"
        sentiment = predict_sentiment(title or summary or "")

        if (not article_exists(url) or url==None) and (title and "bitcoin" in title.lower() or title and "btc" in title.lower()):
            insert_article(title, url, summary, sentiment, image, source, time)
            news_data.append({
                'title': title, 'url': url, 'summary': summary, 
                'sentiment': sentiment, 'image': image, 'time': time
            })

    cache['news'] = {"timestamp": current_time, "data": news_data}


    if len(news_data) < 15:
        extra_articles_needed = 15 - len(news_data)
        older_articles = get_articles(extra_articles_needed)
        news_data.extend([dict(article) for article in older_articles])

    return jsonify(news_data[:15])


def get_latest_context():
    news = " ".join([f"{item['title']}. {item['summary']} (Published on: {item['time']})." 
                     for item in cache['news']['data']]) if cache['news']['data'] else "No recent news."
    market_data = cache['market_data']['data']
    market_info = f"Bitcoin's current price is ${market_data['data']['priceUsd']}, 24h volume is ${market_data['data']['volumeUsd24Hr']}."

    return f"Latest Bitcoin news: {news} Market Data: {market_info}"

@app.route('/api/articles', methods=['GET'])
def articles():
    articles = get_articles()
    return jsonify([dict(article) for article in articles])

@app.cli.command('init-db')
def init_db_command():
    """Clear existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

app.teardown_appcontext(close_db)

if __name__ == '__main__':
    app.run(debug=True)
