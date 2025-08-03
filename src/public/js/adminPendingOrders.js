// Admin Pending Orders JavaScript
// Handles all functionality for the pending orders page

document.addEventListener("DOMContentLoaded", function () {
  // Initialize select all functionality
  const selectAllCheckbox = document.getElementById("selectAll");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll(".order-checkbox");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
      });
    });
  }
});

// Process single order
function processOrder(orderId) {
  if (confirm("Are you sure you want to process this order?")) {
    fetch(`/admin/orders/process/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showAlert("Order processed successfully!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showAlert(data.error || "Failed to process order", "danger");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        showAlert("An error occurred while processing the order", "danger");
      });
  }
}

// Process all selected orders
function processAllOrders() {
  const selectedOrders = Array.from(
    document.querySelectorAll(".order-checkbox:checked")
  ).map((checkbox) => checkbox.value);

  if (selectedOrders.length === 0) {
    showAlert("Please select at least one order to process", "warning");
    return;
  }

  if (
    confirm(`Are you sure you want to process ${selectedOrders.length} orders?`)
  ) {
    fetch("/admin/orders/process-multiple", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderIds: selectedOrders }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showAlert(
            `${data.processedCount} orders processed successfully!`,
            "success"
          );
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showAlert(data.error || "Failed to process orders", "danger");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        showAlert("An error occurred while processing orders", "danger");
      });
  }
}

// View order details
function viewOrderDetails(orderId) {
  fetch(`/admin/orders/details/${orderId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("orderDetailsContent").innerHTML = data.html;
        document.getElementById("processOrderBtn").onclick = () =>
          processOrder(orderId);
        new bootstrap.Modal(
          document.getElementById("orderDetailsModal")
        ).show();
      } else {
        showAlert(data.error || "Failed to load order details", "danger");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showAlert("An error occurred while loading order details", "danger");
    });
}

// Edit order
function editOrder(orderId) {
  window.location.href = `/admin/orders/edit/${orderId}`;
}

// Export to CSV
function exportToCSV() {
  const table = document.getElementById("pendingOrdersTable");
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  let csv =
    "Order ID,Customer Name,Customer Email,Total,Shipping City,Shipping Price,Date\n";

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const orderId = cells[1].textContent.replace("#", "");
    const customerName = cells[2].querySelector("strong").textContent;
    const customerEmail = cells[2].querySelector("small").textContent;
    const total = cells[4].textContent;
    const shippingCity =
      cells[5].querySelector(".badge")?.textContent || "No Shipping";
    const shippingPrice = cells[5].querySelector("small")?.textContent || "";
    const date = cells[6].querySelector("strong").textContent;

    csv += `"${orderId}","${customerName}","${customerEmail}","${total}","${shippingCity}","${shippingPrice}","${date}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pending-orders-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Show alert function
function showAlert(message, type) {
  const alertContainer = document.getElementById("alertContainer");
  if (!alertContainer) return;

  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
  alertContainer.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Initialize tooltips if Bootstrap is available
document.addEventListener("DOMContentLoaded", function () {
  if (typeof bootstrap !== "undefined" && bootstrap.Tooltip) {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
});
