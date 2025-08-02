// Admin Products Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // View switching functionality
  const viewGridBtn = document.getElementById("viewGrid");
  const viewListBtn = document.getElementById("viewList");
  const productsTable = document.querySelector(".table-responsive");

  if (viewGridBtn && viewListBtn) {
    viewGridBtn.addEventListener("click", function () {
      viewGridBtn.classList.add("active");
      viewListBtn.classList.remove("active");
      // Future implementation for grid view
      console.log("Grid view clicked");
    });

    viewListBtn.addEventListener("click", function () {
      viewListBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      // Future implementation for list view
      console.log("List view clicked");
    });
  }

  // Removed auto-submit functionality - now only searches on button click
  // const categorySelect = document.getElementById("category");
  // const stockSelect = document.getElementById("stock");
  // const ratingSelect = document.getElementById("rating");

  // if (categorySelect) {
  //   categorySelect.addEventListener("change", function () {
  //     this.closest("form").submit();
  //   });
  // }

  // if (stockSelect) {
  //   stockSelect.addEventListener("change", function () {
  //     this.closest("form").submit();
  //   });
  // }

  // if (ratingSelect) {
  //   ratingSelect.addEventListener("change", function () {
  //     this.closest("form").submit();
  //   });
  // }

  // Search only on button click - removed auto-search functionality
  // const searchInput = document.getElementById("search");
  // let searchTimeout;

  // if (searchInput) {
  //   searchInput.addEventListener("input", function () {
  //     clearTimeout(searchTimeout);
  //     searchTimeout = setTimeout(() => {
  //       this.closest("form").submit();
  //     }, 500);
  //   });
  // }

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Deactivate product buttons
  document.querySelectorAll(".deactivate-product-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id");
      const productName = this.getAttribute("data-product-name");
      deactivateProduct(productId, productName);
    });
  });

  // Reactivate product buttons
  document.querySelectorAll(".reactivate-product-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id");
      const productName = this.getAttribute("data-product-name");
      reactivateProduct(productId, productName);
    });
  });

  // Removed auto-submit functionality for showInactive - now only searches on button click
  // const showInactiveSelect = document.getElementById("showInactive");
  // if (showInactiveSelect) {
  //   showInactiveSelect.addEventListener("change", function () {
  //     this.closest("form").submit();
  //   });
  // }
});

// Deactivate product function
function deactivateProduct(productId, productName) {
  const modal = new bootstrap.Modal(document.getElementById("deactivateModal"));
  const productNameSpan = document.getElementById("productName");
  const deactivateForm = document.getElementById("deactivateForm");

  productNameSpan.textContent = productName;
  deactivateForm.action = `/admin/products/delete/${productId}`;

  modal.show();
}

// Reactivate product function
function reactivateProduct(productId, productName) {
  const modal = new bootstrap.Modal(document.getElementById("reactivateModal"));
  const productNameSpan = document.getElementById("reactivateProductName");
  const reactivateForm = document.getElementById("reactivateForm");

  productNameSpan.textContent = productName;
  reactivateForm.action = `/admin/products/reactivate/${productId}`;

  modal.show();
}

// View product details function
function viewProduct(productId) {
  // You can implement a modal or redirect to a detailed view
  window.open(`/admin/products/view/${productId}`, "_blank");
}

// Bulk actions functionality
function selectAllProducts() {
  const checkboxes = document.querySelectorAll(".product-checkbox");
  const selectAllCheckbox = document.getElementById("selectAll");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });

  updateBulkActions();
}

function updateBulkActions() {
  const checkedBoxes = document.querySelectorAll(".product-checkbox:checked");
  const bulkActionsDiv = document.getElementById("bulkActions");

  if (checkedBoxes.length > 0) {
    bulkActionsDiv.classList.remove("d-none");
    document.getElementById("selectedCount").textContent = checkedBoxes.length;
  } else {
    bulkActionsDiv.classList.add("d-none");
  }
}

// Export functionality
function exportProducts(format) {
  const searchParams = new URLSearchParams(window.location.search);
  const url = `/admin/products/export?format=${format}&${searchParams.toString()}`;

  // Show loading state
  const exportBtn = document.querySelector(`[data-export="${format}"]`);
  if (exportBtn) {
    exportBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Exporting...';
    exportBtn.disabled = true;
  }

  // Download file
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${format}-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch((error) => {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    })
    .finally(() => {
      if (exportBtn) {
        exportBtn.innerHTML = `<i class="fas fa-download me-2"></i>Export ${format.toUpperCase()}`;
        exportBtn.disabled = false;
      }
    });
}

// Quick edit functionality
function quickEdit(productId, field, value) {
  fetch(`/admin/products/quick-edit/${productId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      field: field,
      value: value,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showToast("Product updated successfully", "success");
      } else {
        showToast("Failed to update product", "error");
      }
    })
    .catch((error) => {
      console.error("Quick edit failed:", error);
      showToast("Failed to update product", "error");
    });
}

// Toast notification function
function showToast(message, type = "info") {
  // You can implement your own toast system or use an existing one
  console.log(`${type.toUpperCase()}: ${message}`);

  // Example implementation with Bootstrap toast
  const toastContainer = document.getElementById("toastContainer");
  if (toastContainer) {
    const toastHtml = `
            <div class="toast align-items-center text-white bg-${
              type === "success"
                ? "success"
                : type === "error"
                ? "danger"
                : "info"
            } border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
    toastContainer.insertAdjacentHTML("beforeend", toastHtml);

    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener("hidden.bs.toast", function () {
      toastElement.remove();
    });
  }
}

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // Ctrl/Cmd + N to add new product
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    window.location.href = "/admin/products/add";
  }

  // Ctrl/Cmd + F to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    const searchInput = document.getElementById("search");
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Escape to close modals
  if (e.key === "Escape") {
    const modals = document.querySelectorAll(".modal.show");
    modals.forEach((modal) => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    });
  }
});

// Performance optimization: Lazy loading for images
function lazyLoadImages() {
  const images = document.querySelectorAll("img[data-src]");
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

// Initialize lazy loading
if ("IntersectionObserver" in window) {
  lazyLoadImages();
}
