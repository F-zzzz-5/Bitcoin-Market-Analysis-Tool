import nltk
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer, WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
import os.path
import pandas as pd

nltk_resources = ['stopwords', 'punkt', 'wordnet']
for resource in nltk_resources:
    nltk.download(resource, quiet=True)

data_path = os.path.join('nlp', 'data.csv')
df = pd.read_csv(data_path)
df.fillna("Unknown", inplace=True)

texts = df['text'].astype(str)
labels = df['label']

X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)

stemmer = SnowballStemmer('english')
lemmatizer = WordNetLemmatizer()
english_stopwords = set(stopwords.words('english'))

def tokenize(text):
    tokens = word_tokenize(text.lower())
    lemmatized = [lemmatizer.lemmatize(token) for token in tokens if token.isalpha()]
    return [word for word in lemmatized if word not in english_stopwords]


tfidf_vectorizer = TfidfVectorizer(tokenizer=tokenize, stop_words=None, max_features=1000)

model_pipeline = Pipeline([
    ('tfidf', tfidf_vectorizer),
    ('classifier', LogisticRegression(solver='liblinear'))
])

model_pipeline.fit(X_train, y_train)

y_pred = model_pipeline.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

def predict_sentiment(new_text):
    return model_pipeline.predict([new_text])[0]  
