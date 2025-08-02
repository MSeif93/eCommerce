// Add Product Form Logic

document.addEventListener("DOMContentLoaded", function () {
  const categorySelect = document.getElementById("category_id");
  const subcategorySelect = document.getElementById("sub_category");
  const costInput = document.getElementById("cost");
  const priceInput = document.getElementById("price");
  const profitInfo = document.getElementById("profit-info");
  const profitLabel = document.getElementById("profit-label");
  const profitAmount = document.getElementById("profit-amount");
  const profitPercentage = document.getElementById("profit-percentage");

  // Category-Subcategory filtering function using API
  async function filterSubcategories() {
    const selectedCat = categorySelect.value;

    // Reset subcategory dropdown
    subcategorySelect.innerHTML =
      '<option value="">Select Subcategory</option>';
    subcategorySelect.disabled = true;

    if (!selectedCat) {
      return;
    }

    try {
      const response = await fetch(`/api/subcategories/${selectedCat}`);
      if (!response.ok) {
        throw new Error("Failed to fetch subcategories");
      }

      const subcategories = await response.json();

      if (subcategories.length > 0) {
        subcategories.forEach((sub) => {
          const option = document.createElement("option");
          option.value = sub.id;
          option.textContent = sub.sub_category;
          subcategorySelect.appendChild(option);
        });
        subcategorySelect.disabled = false;

        // Auto-select if only one subcategory
        if (subcategories.length === 1) {
          subcategorySelect.value = subcategories[0].id;
        }
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      // Show error message to user
      const errorOption = document.createElement("option");
      errorOption.value = "";
      errorOption.textContent = "Error loading subcategories";
      errorOption.disabled = true;
      subcategorySelect.appendChild(errorOption);
    }
  }

  // Profit calculation function
  function calculateProfit() {
    const cost = parseFloat(costInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    if (cost > 0 && price > 0) {
      const profit = price - cost;
      const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

      if (profit > 0) {
        profitInfo.classList.remove("d-none");
        profitLabel.textContent = "Profit";
        profitAmount.textContent = profit.toFixed(2);
        profitPercentage.textContent = profitPercent.toFixed(1);
        profitInfo.className = "mt-2 text-success";
        profitInfo.querySelector("i").className = "fas fa-chart-line me-1";
      } else if (profit < 0) {
        profitInfo.classList.remove("d-none");
        profitLabel.textContent = "Loss";
        profitAmount.textContent = Math.abs(profit).toFixed(2);
        profitPercentage.textContent = Math.abs(profitPercent).toFixed(1);
        profitInfo.className = "mt-2 text-danger";
        profitInfo.querySelector("i").className =
          "fas fa-exclamation-triangle me-1";
      } else {
        // case (profit = 0)
        profitInfo.classList.add("d-none");
      }
    } else {
      // No cost or price entered
      profitInfo.classList.add("d-none");
    }
  }

  // Add event listeners
  categorySelect.addEventListener("change", filterSubcategories);
  costInput.addEventListener("input", calculateProfit);
  priceInput.addEventListener("input", calculateProfit);

  // Initialize subcategory filtering
  filterSubcategories();

  // Limit additional images to 4
  const additionalImages = document.getElementById("additional_images");
  additionalImages.addEventListener("change", function () {
    if (this.files.length > 4) {
      alert("You can only upload up to 4 additional images.");
      this.value = "";
    }
  });

  // Form validation
  const form = document.querySelector("form");
  form.addEventListener("submit", function (e) {
    const cost = parseFloat(costInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    if (price < cost) {
      e.preventDefault();
      alert(
        "Warning: Selling price is less than cost. This will result in a loss."
      );
      if (!confirm("Do you want to continue anyway?")) {
        return false;
      }
    }
  });
});
