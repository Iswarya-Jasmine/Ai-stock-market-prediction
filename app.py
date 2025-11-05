from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor

app = Flask(__name__)
CORS(app)

# CSV file paths
stock_files = {
    'tcs': 'tcs.csv',
    'infosys': 'infy.csv',
    'itc': 'itc.csv',
    'yesbank': 'yes.csv',
    'hdfc': 'hdfc.csv'
}

# Dictionaries to store models and reference dates
stock_models = {s: {} for s in stock_files}
stock_start_dates = {}

# Train models for each stock
for stock, file in stock_files.items():
    df = pd.read_csv(file)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')

    start_date = df['Date'].min()
    stock_start_dates[stock] = start_date

    df['Days'] = (df['Date'] - start_date).dt.days
    X = df[['Days']]
    y = df['Close']

    # Train models
    lr = LinearRegression().fit(X, y)
    dt = DecisionTreeRegressor(random_state=42).fit(X, y)
    rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1).fit(X, y)

    # Save models
    stock_models[stock]['lr'] = lr
    stock_models[stock]['dt'] = dt
    stock_models[stock]['rf'] = rf

print("All stock models trained and ready.")

@app.route('/predict', methods=['GET'])
def predict():
    stock = request.args.get('stock', '').lower()
    mdl = request.args.get('model', '').lower()
    date_str = request.args.get('date', '')

    if stock not in stock_models:
        return jsonify({'error': 'Stock not found'}), 404

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400

    days_since_start = (date_obj - stock_start_dates[stock]).days
    days_array = np.array([[days_since_start]])

    lr = stock_models[stock]['lr']
    dt = stock_models[stock]['dt']
    rf = stock_models[stock]['rf']

    # Confidence (R² scores)
    df = pd.read_csv(stock_files[stock])
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date')
    df['Days'] = (df['Date'] - df['Date'].min()).dt.days
    X = df[['Days']]
    y = df['Close']

    lr_conf = round(lr.score(X, y), 3)
    dt_conf = round(dt.score(X, y), 3)
    rf_conf = round(rf.score(X, y), 3)

    return jsonify({
        'stock': stock,
        'model': mdl,
        'date': date_str,
        'predictions': {
            'lr': {
                'value': round(float(lr.predict(days_array)[0]), 2),
                'confidence': lr_conf
            },
            'dt': {
                'value': round(float(dt.predict(days_array)[0]), 2),
                'confidence': dt_conf
            },
            'rf': {
                'value': round(float(rf.predict(days_array)[0]), 2),
                'confidence': rf_conf
            }
        }
    })
if __name__ == '__main__':
    app.run(debug=True)