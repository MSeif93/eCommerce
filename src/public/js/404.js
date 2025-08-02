// 404 Page JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Handle "Go Back" button click
  const goBackBtn = document.querySelector(".go-back-btn");
  if (goBackBtn) {
    goBackBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // If no history, redirect to home
        window.location.href = "/";
      }
    });
  }

  // Handle search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  if (searchInput && searchBtn) {
    // Search on button click
    searchBtn.addEventListener("click", function () {
      performSearch();
    });

    // Search on Enter key press
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performSearch();
      }
    });

    // Auto-focus on search input
    searchInput.focus();
  }

  function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
      // For now, redirect to home with search parameter
      // You can modify this to implement actual search functionality
      window.location.href = `/?search=${encodeURIComponent(query)}`;
    } else {
      // Show error message or shake animation
      searchInput.classList.add("is-invalid");
      setTimeout(() => {
        searchInput.classList.remove("is-invalid");
      }, 1000);
    }
  }

  // Add some interactive animations
  const errorNumber = document.querySelector(".error-number");
  if (errorNumber) {
    errorNumber.addEventListener("click", function () {
      this.style.transform = "scale(1.1) rotate(5deg)";
      setTimeout(() => {
        this.style.transform = "";
      }, 300);
    });
  }

  // Add loading animation to buttons
  const buttons = document.querySelectorAll(".not-found-page .btn");
  buttons.forEach((button) => {
    button.addEventListener("click", function (e) {
      if (!this.classList.contains("go-back-btn")) {
        // Add loading state
        const originalText = this.innerHTML;
        this.innerHTML =
          '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
        this.disabled = true;

        // Reset after a short delay (simulate loading)
        setTimeout(() => {
          this.innerHTML = originalText;
          this.disabled = false;
        }, 1000);
      }
    });
  });
});
