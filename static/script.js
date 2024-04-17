/* Main script.js file
 Travis Trzcinski FYP */

 document.addEventListener('DOMContentLoaded', function() {
    updateNewsPanel();
    updateMarketInfo();
    initializeChart();
    document.getElementById('userInput').focus();

    setInterval(updateNewsPanel, 15000);  // update news 15 seconds
    setInterval(updateMarketInfo, 15000); // update market 15 seconds
    setInterval(initializeChart, 15000);  // update chart 15 seconds
});

currentArticles = []

function updateNewsPanel() {
    fetch('/api/scrape')
        .then(response => response.json())
        .then(data => {
            const newsContainer = document.getElementById('newsContainer');
            newsContainer.innerHTML = ''; // Clear previous news items
            data.forEach(article => {
                const sentimentClass = `sentiment ${article.sentiment.toLowerCase()}`;
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';
                newsItem.innerHTML = `
                    <div class="article-content">
                        <img src="${article.image}" alt="Article Image" class="article-image">
                        <div>
                            <h2>${article.title}</h2>
                            <p>${article.summary}</p>
                            <p class="${sentimentClass}">Sentiment: ${article.sentiment}</p>
                            <a href="${article.url}" target="_blank">Read more</a>
                            <p class="article-timestamp">${new Date(article.time).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
                newsContainer.appendChild(newsItem);
            });
        })
        .catch(error => {
            console.error('Error fetching news data:', error);
            const newsContainer = document.getElementById('newsContainer');
            newsContainer.innerHTML = '<p class="error">Failed to load news. Please try again later.</p>';
        });
}

function updateMarketInfo() {
    fetch('/api/market-data')
        .then(response => response.json())
        .then(data => {
            data = data.data;
            _G_BTC = data;
            document.getElementById('marketCapRank').textContent = `Market Cap Rank: #${data.rank}`;
            document.getElementById('marketCap').textContent = `Market Cap: ${formatCurrency(data.marketCapUsd, 'USD')}`;
            document.getElementById('volume24h').textContent = `24h Volume: ${formatCurrency(data.volumeUsd24Hr, 'USD')}`;
            document.getElementById('bitcoinPrice').textContent = `Bitcoin Price: $${parseFloat(data.priceUsd).toFixed(2)}`;
        })
        .catch(error => {
            console.error('Error fetching market data:', error);
        });
}

function initializeChart() {
    fetch('/api/bitcoin-history')
        .then(response => response.json())
        .then(data => {
            const priceData = processChartData(data);
            createChart(priceData);
        })
        .catch(error => {
            console.error('Error fetching or processing Bitcoin data:', error);
            const chartContainer = document.getElementById('chartContainer');
            chartContainer.innerHTML = '<p class="error">Error loading chart. Please try again later.</p>';
        });
}

function processChartData(data) {
    return data.data.map(entry => {
        return {
            time: entry.time / 1000,
            open: parseFloat(entry.priceUsd),
            high: parseFloat(entry.priceUsd),
            low: parseFloat(entry.priceUsd),
            close: parseFloat(entry.priceUsd)
        };
    });
}

function createChart(priceData) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = '';
    const chart = LightweightCharts.createChart(document.getElementById('chartContainer'), {
        width: 600,
        height: 400,
    });
    const lineSeries = chart.addLineSeries();
    lineSeries.setData(priceData.map(data => ({
        time: data.time,
        value: data.close
    })));
}
  
function updateNewsPanel() {
    fetch('/api/scrape')
        .then(response => response.json())
        .then(data => {
            console.log(data)
            data.forEach(article => {
                console.log(article)
                const isArticlePresent = currentArticles.some(currentArticle => 
                    currentArticle.title === article.title &&
                    currentArticle.summary === article.summary &&
                    currentArticle.url === article.url &&
                    currentArticle.image === article.image &&
                    currentArticle.time === article.time &&
                    currentArticle.sentiment === article.sentiment
                );

                if (!isArticlePresent) {
                    const newsItem = document.createElement('div');
                    newsItem.className = 'news-item';

                    const articleContent = document.createElement('div');
                    articleContent.className = 'article-content';

                    articleContent.innerHTML = `
                    <h2>${article.title}</h2>
                    <p>${article.summary}</p>
                    <p class="sentiment ${article["sentiment"]}">Sentiment: ${article["sentiment"]}</p> 
                    <a href="${article.url}" target="_blank">Read more</a>
                `;

                    const articleImage = document.createElement('img');
                    articleImage.src = article.image;
                    articleImage.className = 'article-image';

                    const timestamp = document.createElement('p');
                    timestamp.textContent = article.time;
                    timestamp.className = 'article-timestamp';

                    newsItem.appendChild(timestamp);
                    newsItem.appendChild(articleImage);
                    newsItem.appendChild(articleContent);

                    const newsContainer = document.getElementById('newsContainer');
                    newsContainer.appendChild(newsItem);

                    newsItem.style.animation = 'fade-in 1s';

                    currentArticles.push(article);
                }
            });
        })
        .catch(error => console.error('Error fetching news data:', error));
}

function updateMarketInfo() {
    fetch('/api/market-data')
    .then(response => response.json())
    .then(data => {
        data = data.data;
        _G_BTC = data;
        console.log(_G_BTC)
        document.getElementById('marketCapRank').textContent = `Market Cap Rank: #${data.rank}`;
        document.getElementById('marketCap').textContent = `Market Cap: ${data.marketCapUsd}`;
        document.getElementById('volume24h').textContent = `24h Volume: ${data.volumeUsd24Hr}`;
        document.getElementById('bitcoinPrice').textContent = `Bitcoin Price: $${parseFloat(data.priceUsd).toFixed(2)}`;
        updateDisplays('USD');
        
        const greedIndexImage = document.getElementById('greedIndexImage');
        if (greedIndexImage) {
            greedIndexImage.style.maxWidth = '50%';
        } else {
            console.log('Greed Index Image not found');
        }
    })
    .catch(error => {
        console.error('Error fetching market data:', error);
    });
}

function updateDisplays(currency) {
    document.getElementById('marketCapRank').textContent = `Market Cap Rank: #${_G_BTC.rank}`;
    document.getElementById('marketCap').textContent = `Market Cap: ${formatCurrency(_G_BTC.marketCapUsd, currency)}`;
    document.getElementById('volume24h').textContent = `24h Volume: ${formatCurrency(_G_BTC.volumeUsd24Hr, currency)}`;
    document.getElementById('bitcoinPrice').textContent = `Bitcoin Price: ${formatCurrency(_G_BTC.priceUsd, currency)}`;
}

function formatCurrency(value, currency) {
    const number = parseFloat(value);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(number);
}

const currencyConverter = {
    rates: {},
    base: 'USD',
    fetchInterval: 3600000,

    updateRates: function() {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(response => response.json())
            .then(data => {
                this.rates = data.rates;
                const currencySelector = document.getElementById('currencySelector');

                for (let currencyCode in data.rates) {
                    let option = new Option(currencyCode, currencyCode);
                    currencySelector.add(option);
                }
    
                $(currencySelector).select2({
                    width: '100%',
                    placeholder: 'Select currency',
                    allowClear: true
                });
    
                $(currencySelector).on('change', updateCurrency);
            })
            .catch(error => console.error('Error fetching currency rates:', error));
    },

    startFetching: function() {
        this.updateRates();
        setInterval(() => this.updateRates(), this.fetchInterval);
    },

    convert: function(amount, currency) {
        const rate = this.rates[currency];
        return rate ? amount * rate : amount;
    },

    format: function(amount, currency) {
        return new Intl.NumberFormat('en', { style: 'currency', currency: currency }).format(amount);
    }
};

function updateCurrency() {
    let selectedCurrency = $('#currencySelector').val();
    let marketCapRaw = marketCap
    console.log("Text:", marketCapRaw, _G_BTC)

    updateMarketCapDisplay(_G_BTC.marketCapUsd, selectedCurrency);
    updateVolumeDisplay(_G_BTC.volumeUsd24Hr, selectedCurrency);
}

function updateMarketCapDisplay(marketCap, currency) {
    console.log(marketCap, currency, currencyConverter.rates);
    const convertedValue = currencyConverter.convert(marketCap, currency);
    const formattedValue = currencyConverter.format(convertedValue, currency);
    document.getElementById('marketCap').textContent = `Market Cap: ${formattedValue}`;
}

function updateVolumeDisplay(volume, currency) {
    const convertedValue = currencyConverter.convert(volume, currency);
    const formattedValue = currencyConverter.format(convertedValue, currency);
    document.getElementById('volume24h').textContent = `24h Volume: ${formattedValue}`;
}

function formatTimestamp(timestamp) {

    const date = new Date(timestamp);
    return date.toLocaleString();
}

function sendChat() {
    let input = document.getElementById('userInput');
    let message = input.value.trim();
    if (message === "") return;
    
    displayMessage(message, 'user');
    fetch('/api/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({question: message})
    })
    .then(response => response.json())
    .then(data => {
        displayMessage(data.response, 'ai');
    })
    .catch(error => console.error('Error:', error));
    input.value = '';
}

function displayMessage(message, sender) {
    let chatMessages = document.getElementById('chatMessages');
    let msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', sender);
    msgDiv.textContent = message;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleChatWindow() {
    let chatBody = document.getElementById('chatBody');
    let chatContainer = document.getElementById('chatContainer');
    if (chatBody.style.display === 'none') {
        chatBody.style.display = 'flex';
        document.getElementById('chatToggle').textContent = '-';
        chatContainer.classList.remove('collapsed');
    } else {
        chatBody.style.display = 'none';
        document.getElementById('chatToggle').textContent = '+';
        chatContainer.classList.add('collapsed');
    }
}

function handleKeypress(event) {
    if (event.key === "Enter") {
        sendChat();
    }
}

document.addEventListener('DOMContentLoaded', currencyConverter.startFetching.bind(currencyConverter));