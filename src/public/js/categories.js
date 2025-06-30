// Categories Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("categorySearch");
  const sortSelect = document.getElementById("categorySort");
  const categoriesGrid = document.getElementById("categoriesGrid");
  const categoryItems = document.querySelectorAll(".category-item");
  const loadingState = document.getElementById("loadingState");
  const categoriesContent = document.getElementById("categoriesContent");

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();

      categoryItems.forEach((item) => {
        const categoryName = item.dataset.name;
        const titleElement = item.querySelector(".category-title");

        if (categoryName.includes(searchTerm)) {
          item.style.display = "block";

          // Highlight search term
          if (searchTerm) {
            const title = titleElement.textContent;
            const highlightedTitle = title.replace(
              new RegExp(searchTerm, "gi"),
              (match) => `<span class="highlight">${match}</span>`
            );
            titleElement.innerHTML = highlightedTitle;
          } else {
            // Remove highlighting
            titleElement.innerHTML = titleElement.textContent;
          }
        } else {
          item.style.display = "none";
        }
      });

      // Show/hide empty state
      const visibleItems = document.querySelectorAll(
        '.category-item[style*="block"], .category-item:not([style*="none"])'
      );
      if (visibleItems.length === 0 && searchTerm) {
        showEmptyState("No categories found matching your search.");
      } else {
        hideEmptyState();
      }
    });
  }

  // Sort functionality
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const sortBy = this.value;
      const items = Array.from(categoryItems);

      items.sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.dataset.name.localeCompare(b.dataset.name);
          case "products":
            return parseInt(b.dataset.products) - parseInt(a.dataset.products);
          case "newest":
            return new Date(b.dataset.date) - new Date(a.dataset.date);
          default:
            return 0;
        }
      });

      // Reorder items in DOM
      items.forEach((item) => {
        categoriesGrid.appendChild(item);
      });
    });
  }

  // Show empty state
  function showEmptyState(message) {
    const emptyState = document.createElement("div");
    emptyState.className = "text-center py-5";
    emptyState.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search text-muted" style="font-size: 4rem; margin-bottom: 1rem;"></i>
        <h3 class="text-muted mb-3">${message}</h3>
        <button class="btn btn-outline-primary" onclick="clearSearch()">
          <i class="fas fa-times me-2"></i>
          Clear Search
        </button>
      </div>
    `;

    categoriesContent.innerHTML = "";
    categoriesContent.appendChild(emptyState);
  }

  // Hide empty state
  function hideEmptyState() {
    if (categoriesContent.querySelector(".empty-state")) {
      categoriesContent.innerHTML = "";
      categoriesContent.appendChild(categoriesGrid);
    }
  }

  // Clear search function (global scope)
  window.clearSearch = function () {
    if (searchInput) {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
    }
  };

  // Add click animation to category cards
  categoryItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      if (!e.target.closest("a")) {
        this.style.transform = "scale(0.95)";
        setTimeout(() => {
          this.style.transform = "";
        }, 150);
      }
    });
  });

  // Intersection Observer for animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  categoryItems.forEach((item) => {
    observer.observe(item);
  });

  // Newsletter subscription
  const newsletterForm = document.querySelector(".bg-primary .input-group");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;

      if (email) {
        // Show success message
        const button = this.querySelector("button");
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.classList.remove("btn-warning");
        button.classList.add("btn-success");

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove("btn-success");
          button.classList.add("btn-warning");
          this.querySelector('input[type="email"]').value = "";
        }, 2000);
      }
    });
  }

  // Add loading state functionality
  function showLoading() {
    if (loadingState) {
      loadingState.style.display = "block";
      if (categoriesContent) {
        categoriesContent.style.display = "none";
      }
    }
  }

  function hideLoading() {
    if (loadingState) {
      loadingState.style.display = "none";
      if (categoriesContent) {
        categoriesContent.style.display = "block";
      }
    }
  }

  // Expose functions globally for potential AJAX calls
  window.categoriesPage = {
    showLoading,
    hideLoading,
    showEmptyState,
    hideEmptyState,
    clearSearch: window.clearSearch,
  };
});
