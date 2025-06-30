// Dashboard Chart Functionality
document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("salesChart");

  if (canvas) {
    const salesLabels = JSON.parse(canvas.dataset.labels);
    const salesData = JSON.parse(canvas.dataset.sales);

    const ctx = canvas.getContext("2d");
    const salesChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: salesLabels,
        datasets: [
          {
            label: "Sales (EGP)",
            data: salesData,
            borderColor: "#0d6efd",
            backgroundColor: "rgba(13, 110, 253, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0,0,0,0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }
});
