// Edit Product Form Logic

document.addEventListener("DOMContentLoaded", function () {
  const mainCategorySelect = document.getElementById("main_category");
  const subcategorySelect = document.getElementById("sub_category");
  const costInput = document.getElementById("cost");
  const priceInput = document.getElementById("price");
  const profitInfo = document.getElementById("profit-info");
  const profitLabel = document.getElementById("profit-label");
  const profitAmount = document.getElementById("profit-amount");
  const profitPercentage = document.getElementById("profit-percentage");

  // Store the current product's subcategory for initialization
  const currentSubcategory = subcategorySelect.getAttribute(
    "data-current-subcategory"
  );
  const currentMainCategory = subcategorySelect.getAttribute(
    "data-current-main-category"
  );

  // Category-Subcategory filtering function
  async function filterSubcategories() {
    const selectedCat = mainCategorySelect.value;

    if (!selectedCat) {
      subcategorySelect.innerHTML =
        '<option value="">Select Subcategory</option>';
      return;
    }

    try {
      // Fetch subcategories for the selected category
      const response = await fetch(`/api/subcategories/${selectedCat}`);
      const subcategories = await response.json();

      // Clear existing options
      subcategorySelect.innerHTML =
        '<option value="">Select Subcategory</option>';

      // Add new options
      subcategories.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub.sub_category;
        option.textContent = sub.sub_category;
        subcategorySelect.appendChild(option);
      });

      // Auto-select the current subcategory if it matches the selected category
      if (selectedCat === currentMainCategory && currentSubcategory) {
        subcategorySelect.value = currentSubcategory;
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
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
  mainCategorySelect.addEventListener("change", filterSubcategories);
  costInput.addEventListener("input", calculateProfit);
  priceInput.addEventListener("input", calculateProfit);

  // Initialize profit calculation
  calculateProfit();

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
