const stockData = {};
const stockFiles = {
  tcs: "tcs.csv",
  infosys: "infy.csv",
  itc: "itc.csv",
  yesbank: "yes.csv",
  hdfc: "hdfc.csv"
};

let chart;

// Load CSV when needed
async function loadCSV(stock) {
  if (stockData[stock]) return stockData[stock];
  const file = stockFiles[stock];
  const res = await fetch(file);
  const text = await res.text();
  const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");
  stockData[stock] = rows.map(row => {
    const [date, close] = row.split(",");
    return { date: date.trim(), close: parseFloat(close) };
  });
  return stockData[stock];
}

// Predict button click
document.getElementById("predict-btn").addEventListener("click", async () => {
  const stock = document.getElementById("stock-select").value;
  const model = document.getElementById("model-select").value;
  const date = document.getElementById("date-input").value;

  if (!stock || !model || !date) {
    alert("Please select stock, model, and date before predicting!");
    return;
  }

  const data = await loadCSV(stock);

  try {
    const res = await fetch(
      `http://localhost:5000/predict?stock=${stock}&model=${model}&date=${date}`
    );
    const result = await res.json();

    const prediction = result.predictions[model].value;
    const conf = getConfidence(result.predictions[model].confidence * 100);

    // Update summary
    document.getElementById("summary").style.display = "block";
    document.getElementById("summary-stock").textContent = stock.toUpperCase();
    document.getElementById("summary-model").textContent = modelFullName(model);
    document.getElementById("summary-date").textContent = formatDateDisplay(date);
    document.getElementById("summary-prediction").textContent = `₹${prediction}`;
    document.getElementById("confidence").textContent = conf;

    // Update chart
    updateChart(stock, data, prediction, date);
  } catch (err) {
    console.error("Prediction fetch error:", err);
    alert("Error fetching prediction. Please check your Flask server.");
  }
});

// Logout button
document.getElementById("logout").addEventListener("click", () => {
  alert("You have been logged out.");
  window.location.replace("login.html");
});

// Chart update
function updateChart(stock, data, prediction, date) {
  document.getElementById("chart-section").style.display = "block";
  document.getElementById("stock-name").textContent = stock.toUpperCase();

  const labels = data.map(d => d.date);
  const prices = data.map(d => d.close);

  const ctx = document.getElementById("stockChart").getContext("2d");
  if (chart) chart.destroy();

  const predictedLabel = new Date(date).toLocaleString("default", { month: "short", year: "numeric" });

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [...labels, predictedLabel],
      datasets: [
        {
          label: "Historical",
          data: prices,
          borderColor: "#2E8B57",
          backgroundColor: "rgba(46,139,87,0.15)",
          fill: true,
          tension: 0.4
        },
        {
          label: "Predicted",
          data: [...Array(prices.length).fill(null), prediction],
          borderColor: "transparent",
          backgroundColor: "#000",
          pointRadius: 6,
          showLine: false
        }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "black" } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false } }
      }
    }
  });
}

// Helpers
function getConfidence(conf) {
  if (conf >= 70) return "High";
  if (conf >= 40) return "Medium";
  return "Low";
}
function formatDateDisplay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("default", { day: "2-digit", month: "short", year: "numeric" });
}
function modelFullName(model) {
  return { lr: "Linear Regression", dt: "Decision Tree", rf: "Random Forest" }[model] || model;
}
