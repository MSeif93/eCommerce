// Function to show alerts in top right
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer");
  const alertId = "alert-" + Date.now();

  const alertHtml = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show mb-2" role="alert">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "danger"
          ? "exclamation-triangle"
          : "info-circle"
      } me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  alertContainer.insertAdjacentHTML("beforeend", alertHtml);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      alert.remove();
    }
  }, 5000);
}

function editShipping(id, name, price) {
  // Populate the form fields
  document.getElementById("editId").value = id;
  document.getElementById("cityName").value = name;
  document.getElementById("shippingPrice").value = price;

  // Change button text (form action stays the same)
  document.getElementById("submitBtn").innerHTML =
    '<i class="fas fa-save me-2"></i>Update Shipping Option';

  // Show cancel button
  document.getElementById("cancelBtn").style.display = "inline-block";

  // Scroll to form
  document
    .getElementById("shippingForm")
    .scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  // Clear form fields
  document.getElementById("editId").value = "";
  document.getElementById("cityName").value = "";
  document.getElementById("shippingPrice").value = "";

  // Reset button text (form action stays the same)
  document.getElementById("submitBtn").innerHTML =
    '<i class="fas fa-plus me-2"></i>Add Shipping Option';

  // Hide cancel button
  document.getElementById("cancelBtn").style.display = "none";
}

let formToDelete = null; // Store the form to submit after confirmation

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add event listener to cancel button
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelEdit);
  }

  // Add event listeners to all edit buttons
  document.querySelectorAll(".edit-shipping-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = this.getAttribute("data-id");
      const name = this.getAttribute("data-name");
      const price = this.getAttribute("data-price");
      editShipping(id, name, price);
    });
  });

  // Delete confirmation with Bootstrap modal
  document.querySelectorAll(".delete-shipping-btn").forEach(function (button) {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const shippingName = this.getAttribute("data-shipping-name");
      formToDelete = this.closest(".delete-shipping-form");
      document.getElementById(
        "deleteModalMessage"
      ).textContent = `Are you sure you want to delete the shipping option "${shippingName}"?`;
      const modal = new bootstrap.Modal(
        document.getElementById("deleteConfirmModal")
      );
      modal.show();
    });
  });

  // Handle confirm delete
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", function () {
      if (formToDelete) {
        formToDelete.submit();
        formToDelete = null;
      }
      // Hide the modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteConfirmModal")
      );
      if (modal) modal.hide();
    });

  // Check for server-side flash messages and display them
  // These will be set by the server in data attributes on the body element
  const body = document.body;
  if (body) {
    const errorMessage = body.getAttribute("data-error");
    const successMessage = body.getAttribute("data-success");

    if (errorMessage && errorMessage !== "") {
      showAlert(errorMessage, "danger");
    }

    if (successMessage && successMessage !== "") {
      showAlert(successMessage, "success");
    }
  }
});
