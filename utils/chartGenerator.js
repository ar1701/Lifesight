// Fallback chart generator when AI quota is exceeded
const generateFallbackChart = (data, prompt) => {
  try {
    // Parse CSV data
    const lines = data.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("Insufficient data");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines
      .slice(1)
      .map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      );

    // Simple heuristics for chart type based on prompt
    const promptLower = prompt.toLowerCase();
    let chartType = "bar";

    if (promptLower.includes("pie") || promptLower.includes("percentage")) {
      chartType = "pie";
    } else if (promptLower.includes("line") || promptLower.includes("trend")) {
      chartType = "line";
    }

    // Find numeric columns
    const numericColumns = [];
    headers.forEach((header, index) => {
      const sampleValues = rows.slice(0, 5).map((row) => row[index]);
      const hasNumbers = sampleValues.some(
        (val) => !isNaN(parseFloat(val)) && isFinite(val)
      );
      if (hasNumbers) {
        numericColumns.push({ header, index });
      }
    });

    if (numericColumns.length === 0) {
      throw new Error("No numeric data found");
    }

    // Use first numeric column for values
    const valueColumn = numericColumns[0];
    const labelColumn =
      headers.find((_, index) => index !== valueColumn.index) || headers[0];
    const labelIndex = headers.indexOf(labelColumn);

    // Prepare data
    const chartData = rows.slice(0, 10).map((row) => ({
      label: row[labelIndex] || `Item ${rows.indexOf(row) + 1}`,
      value: parseFloat(row[valueColumn.index]) || 0,
    }));

    if (chartType === "pie") {
      return {
        type: "chart",
        chartType: "pie",
        config: {
          type: "pie",
          data: {
            labels: chartData.map((d) => d.label),
            datasets: [
              {
                data: chartData.map((d) => d.value),
                backgroundColor: [
                  "#FF6384",
                  "#36A2EB",
                  "#FFCE56",
                  "#4BC0C0",
                  "#9966FF",
                  "#FF9F40",
                  "#FF6384",
                  "#C9CBCF",
                ],
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `Data Analysis: ${valueColumn.header}`,
              },
            },
          },
        },
      };
    } else if (chartType === "line") {
      return {
        type: "chart",
        chartType: "line",
        config: {
          type: "line",
          data: {
            labels: chartData.map((d) => d.label),
            datasets: [
              {
                label: valueColumn.header,
                data: chartData.map((d) => d.value),
                borderColor: "#36A2EB",
                backgroundColor: "rgba(54, 162, 235, 0.1)",
                tension: 0.1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `Trend Analysis: ${valueColumn.header}`,
              },
            },
          },
        },
      };
    } else {
      return {
        type: "chart",
        chartType: "bar",
        config: {
          type: "bar",
          data: {
            labels: chartData.map((d) => d.label),
            datasets: [
              {
                label: valueColumn.header,
                data: chartData.map((d) => d.value),
                backgroundColor: "rgba(54, 162, 235, 0.8)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `Data Analysis: ${valueColumn.header}`,
              },
            },
          },
        },
      };
    }
  } catch (error) {
    throw new Error("Unable to generate fallback chart: " + error.message);
  }
};

const generateFallbackTable = (data) => {
  try {
    const lines = data.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("Insufficient data");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines
      .slice(1, 11)
      .map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
      );

    return {
      type: "table",
      data: {
        headers: headers,
        rows: rows,
      },
    };
  } catch (error) {
    throw new Error("Unable to generate fallback table: " + error.message);
  }
};

module.exports = {
  generateFallbackChart,
  generateFallbackTable,
};
