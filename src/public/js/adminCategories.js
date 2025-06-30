// Admin Categories Management JavaScript

document.addEventListener("DOMContentLoaded", function () {
  initializeAdminCategories();

  // Add event listeners for action buttons (CSP-safe)
  document.querySelectorAll(".add-subcategory-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.dataset.id;
      const name = this.dataset.name;
      addSubcategory(id, name);
    });
  });
  document.querySelectorAll(".edit-category-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.dataset.id;
      const name = this.dataset.name;
      const description = this.dataset.description;
      const iconId = this.dataset.iconId;
      editCategory(id, name, description, iconId);
    });
  });
  document.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.dataset.id;
      deleteCategory(id);
    });
  });

  // Subcategory edit button
  document.querySelectorAll(".edit-subcategory-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const subcategoryId = this.dataset.subcategoryId;
      const subcategoryName = this.dataset.subcategoryName;
      showEditSubcategoryModal(subcategoryId, subcategoryName);
    });
  });

  // Subcategory delete button
  document.querySelectorAll(".delete-subcategory-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const subcategoryId = this.dataset.subcategoryId;
      const subcategoryName = this.dataset.subcategoryName;
      showDeleteSubcategoryModal(subcategoryId, subcategoryName);
    });
  });

  // Edit subcategory form submit
  const editSubcategoryForm = document.getElementById("editSubcategoryForm");
  if (editSubcategoryForm) {
    editSubcategoryForm.addEventListener("submit", handleEditSubcategory);
  }

  // Confirm delete subcategory
  const confirmDeleteSubcategoryBtn = document.getElementById(
    "confirmDeleteSubcategoryBtn"
  );
  if (confirmDeleteSubcategoryBtn) {
    confirmDeleteSubcategoryBtn.addEventListener(
      "click",
      handleDeleteSubcategory
    );
  }

  // Confirm delete modal button
  const confirmBtn = document.getElementById("confirmDeleteCategoryBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      if (categoryIdToDelete) {
        // Show loading state (optional)
        confirmBtn.disabled = true;
        confirmBtn.innerHTML =
          '<span class="loading-spinner"></span> Deleting...';

        fetch("/admin/categories/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ category_id: categoryIdToDelete }),
        })
          .then((response) => {
            if (response.ok) return response.json();
            return response.json().then((data) => {
              throw new Error(data.error || "Failed to delete category.");
            });
          })
          .then((data) => {
            showAlert("Category deleted successfully!", "success");
            const deleteModal = bootstrap.Modal.getInstance(
              document.getElementById("deleteCategoryModal")
            );
            deleteModal.hide();
            setTimeout(() => {
              location.reload();
            }, 1000);
          })
          .catch((error) => {
            showAlert(error.message, "danger");
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = "Delete";
          });
      }
    });
  }
});

function initializeAdminCategories() {
  // Initialize search and filter functionality
  initializeSearchAndFilter();

  // Initialize form handlers
  initializeFormHandlers();

  // Initialize tooltips
  initializeTooltips();

  // Initialize confirmation dialogs
  initializeConfirmations();

  // Initialize icon dropdowns
  initializeIconDropdowns();
}

function initializeSearchAndFilter() {
  const searchInput = document.getElementById("categorySearch");
  const statusFilter = document.getElementById("statusFilter");
  const sortBy = document.getElementById("sortBy");
  const categoryRows = document.querySelectorAll(".category-row");

  if (!searchInput || !statusFilter || !sortBy) {
    console.warn("Search and filter elements not found");
    return;
  }

  function filterAndSort() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const sortValue = sortBy.value;

    let visibleRows = Array.from(categoryRows).filter((row) => {
      const name = row.dataset.name;
      const status = row.dataset.status;
      const matchesSearch = name.includes(searchTerm);
      const matchesStatus = !statusValue || status === statusValue;
      return matchesSearch && matchesStatus;
    });

    // Sort rows
    visibleRows.sort((a, b) => {
      switch (sortValue) {
        case "name":
          return a.dataset.name.localeCompare(b.dataset.name);
        case "products":
          return parseInt(b.dataset.products) - parseInt(a.dataset.products);
        case "date":
          return new Date(b.dataset.date) - new Date(a.dataset.date);
        default:
          return 0;
      }
    });

    // Reorder in DOM
    const tbody = document.querySelector("#categoriesTable tbody");
    if (tbody) {
      visibleRows.forEach((row) => tbody.appendChild(row));
    }

    // Show/hide rows with animation
    categoryRows.forEach((row) => {
      const shouldShow = visibleRows.includes(row);
      if (shouldShow && row.style.display === "none") {
        row.style.display = "";
        row.style.opacity = "0";
        setTimeout(() => {
          row.style.opacity = "1";
        }, 10);
      } else if (!shouldShow) {
        row.style.display = "none";
      }
    });

    // Update results count
    updateResultsCount(visibleRows.length);
  }

  // Add event listeners
  searchInput.addEventListener("input", debounce(filterAndSort, 300));
  statusFilter.addEventListener("change", filterAndSort);
  sortBy.addEventListener("change", filterAndSort);

  // Initial filter
  filterAndSort();
}

function initializeFormHandlers() {
  // Add category form
  const addCategoryForm = document.getElementById("addCategoryForm");
  if (addCategoryForm) {
    addCategoryForm.addEventListener("submit", handleAddCategory);
  }

  // Edit category form
  const editCategoryForm = document.getElementById("editCategoryForm");
  if (editCategoryForm) {
    editCategoryForm.addEventListener("submit", handleEditCategory);
  }

  // Add subcategory form
  const addSubcategoryForm = document.getElementById("addSubcategoryForm");
  if (addSubcategoryForm) {
    addSubcategoryForm.addEventListener("submit", handleAddSubcategory);
  }

  // Form validation
  initializeFormValidation();
}

function initializeFormValidation() {
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        showAlert("Please fill in all required fields correctly.", "warning");
      }
      form.classList.add("was-validated");
    });
  });
}

function initializeTooltips() {
  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

function initializeConfirmations() {
  // Add confirmation to delete buttons
  const deleteButtons = document.querySelectorAll(
    '[onclick*="deleteCategory"]'
  );
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      if (button.disabled) {
        e.preventDefault();
        showAlert("Cannot delete category with existing products.", "warning");
        return false;
      }
    });
  });
}

function initializeIconDropdowns() {
  // Add icon preview functionality to dropdowns
  const iconDropdowns = document.querySelectorAll('select[id*="icon_id"]');

  iconDropdowns.forEach((dropdown) => {
    // Create a preview element
    const previewContainer = document.createElement("div");
    previewContainer.className = "icon-preview mt-2";
    previewContainer.style.display = "none";
    previewContainer.innerHTML =
      '<i class="fas fa-tag me-2"></i><span>Icon Preview</span>';

    // Insert after the dropdown
    dropdown.parentNode.appendChild(previewContainer);

    // Add change event listener
    dropdown.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const iconClass = selectedOption.getAttribute("data-icon-class");
      const iconName = selectedOption.textContent.trim();

      if (iconClass && iconName) {
        previewContainer.innerHTML = `<i class="fas ${iconClass} me-2"></i><span>${iconName}</span>`;
        previewContainer.style.display = "block";
      } else {
        previewContainer.style.display = "none";
      }
    });
  });
}

// Category management functions
function editCategory(id, name, description, iconId) {
  // Set form values
  document.getElementById("edit_category_id").value = id;
  document.getElementById("edit_main_category").value = name;
  document.getElementById("edit_description").value = description;

  // Find the current icon's category and pre-populate dropdowns
  const bodyElement = document.body;
  const allIcons = bodyElement.dataset.icons
    ? JSON.parse(bodyElement.dataset.icons)
    : [];
  const currentIcon = allIcons.find((icon) => icon.id == iconId);

  if (currentIcon) {
    // Set the category dropdown
    const editIconCategory = document.getElementById("editIconCategory");
    editIconCategory.value = currentIcon.category;

    // Trigger the change event to populate the icon dropdown
    const event = new Event("change");
    editIconCategory.dispatchEvent(event);

    // Set the icon dropdown after a short delay to ensure it's populated
    setTimeout(() => {
      const editIconId = document.getElementById("editIconId");
      const editIconText = document.getElementById("editIconText");
      editIconId.value = iconId;

      // Get icon for the current icon using Font Awesome classes
      function getIconElement(iconData) {
        if (!iconData || !iconData.icon_class) {
          // Fallback to default icon if no icon data
          const fallbackIcon = document.createElement("i");
          fallbackIcon.className = "fas fa-tag";
          fallbackIcon.style.marginRight = "0.5rem";
          fallbackIcon.style.fontSize = "1.2em";
          return fallbackIcon;
        }

        // Create Font Awesome icon element
        const iconElement = document.createElement("i");
        iconElement.className = `fas ${iconData.icon_class}`;
        iconElement.style.marginRight = "0.5rem";
        iconElement.style.fontSize = "1.2em";
        return iconElement;
      }

      // Use the current icon data directly
      const iconElement = getIconElement(currentIcon);

      // Create selected display with icon
      editIconText.innerHTML = "";
      editIconText.appendChild(iconElement);
      editIconText.appendChild(document.createTextNode(currentIcon.icon_name));
    }, 100);
  }

  // Show modal
  const editModal = new bootstrap.Modal(
    document.getElementById("editCategoryModal")
  );
  editModal.show();
}

let categoryIdToDelete = null;

function deleteCategory(categoryId) {
  categoryIdToDelete = categoryId;
  const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteCategoryModal")
  );
  deleteModal.show();
}

// Form submission handlers
function handleAddCategory(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Convert FormData to JSON object
  const jsonData = {};
  formData.forEach((value, key) => {
    jsonData[key] = value;
  });

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
  submitBtn.disabled = true;

  // Send form data to backend as JSON
  fetch("/admin/categories/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonData),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error("Network response was not ok");
    })
    .then((data) => {
      showAlert("Category created successfully!", "success");

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addCategoryModal")
      );
      modal.hide();

      // Reload page to show new category
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      console.error("Error:", error);
      showAlert("Failed to create category. Please try again.", "danger");

      // Reset button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    });
}

function handleEditCategory(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Convert FormData to JSON object
  const jsonData = {};
  formData.forEach((value, key) => {
    jsonData[key] = value;
  });

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Updating...';
  submitBtn.disabled = true;

  // Send form data to backend as JSON
  fetch("/admin/categories/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonData),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error("Network response was not ok");
    })
    .then((data) => {
      showAlert("Category updated successfully!", "success");

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editCategoryModal")
      );
      modal.hide();

      // Reload page to show updated category
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      console.error("Error:", error);
      showAlert("Failed to update category. Please try again.", "danger");

      // Reset button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    });
}

function handleAddSubcategory(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Convert FormData to JSON object
  const jsonData = {};
  formData.forEach((value, key) => {
    jsonData[key] = value;
  });

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
  submitBtn.disabled = true;

  // Send form data to backend as JSON
  fetch("/admin/subcategories/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(jsonData),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      // If not ok, try to extract error message
      return response.json().then((data) => {
        throw new Error(
          data.error || "Failed to add subcategory. Please try again."
        );
      });
    })
    .then((data) => {
      showAlert("Subcategory added successfully!", "success");

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addSubcategoryModal")
      );
      modal.hide();

      // Reload page to show new subcategory
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      showAlert(error.message, "danger");
      // Reset button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    });
}

// Utility functions
function updateResultsCount(count) {
  const totalCount = document.querySelectorAll(".category-row").length;
  const resultsText = document.getElementById("resultsCount");

  if (resultsText) {
    resultsText.textContent = `Showing ${count} of ${totalCount} categories`;
  }
}

function showAlert(message, type = "info") {
  // Create alert element
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  // Add to page
  document.body.appendChild(alertDiv);

  // timeout of 3 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export functions for global access
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.addSubcategory = addSubcategory;

// Icon selection functionality for two-dropdown system
document.addEventListener("DOMContentLoaded", function () {
  // Get all icons data from the body tag's data attribute
  const bodyElement = document.body;
  const allIcons = bodyElement.dataset.icons
    ? JSON.parse(bodyElement.dataset.icons)
    : [];

  // Add Category Modal - Icon Selection
  const addIconCategory = document.getElementById("addIconCategory");
  const addIconDropdown = document.getElementById("addIconDropdown");
  const addIconId = document.getElementById("addIconId");
  const addIconText = document.getElementById("addIconText");
  const addIconOptions = document.getElementById("addIconOptions");

  if (addIconCategory && addIconDropdown) {
    addIconCategory.addEventListener("change", function () {
      const selectedCategory = this.value;

      // Clear and disable icon dropdown if no category selected
      if (!selectedCategory) {
        addIconText.textContent = "Select an icon";
        addIconId.value = "";
        addIconOptions.innerHTML = "";
        addIconDropdown.disabled = true;
        return;
      }

      // Filter icons by selected category
      const categoryIcons = allIcons.filter(
        (icon) => icon.category === selectedCategory
      );

      // Populate icon dropdown
      addIconOptions.innerHTML = "";
      categoryIcons.forEach((icon) => {
        const li = document.createElement("li");
        li.className = "dropdown-item d-flex align-items-center";

        // Get icon for the current icon using Font Awesome classes
        function getIconElement(iconData) {
          if (!iconData || !iconData.icon_class) {
            // Fallback to default icon if no icon data
            const fallbackIcon = document.createElement("i");
            fallbackIcon.className = "fas fa-tag";
            fallbackIcon.style.marginRight = "0.5rem";
            fallbackIcon.style.fontSize = "1.2em";
            return fallbackIcon;
          }

          // Create Font Awesome icon element
          const iconElement = document.createElement("i");
          iconElement.className = `fas ${iconData.icon_class}`;
          iconElement.style.marginRight = "0.5rem";
          iconElement.style.fontSize = "1.2em";
          return iconElement;
        }

        // Use the current icon data directly
        const iconElement = getIconElement(icon);

        // Create text element
        const textElement = document.createElement("span");
        textElement.textContent = icon.icon_name;

        // Append elements
        li.appendChild(iconElement);
        li.appendChild(textElement);

        li.setAttribute("data-value", icon.id);
        li.setAttribute("data-icon-symbol", icon.icon_class);
        li.setAttribute("data-icon-name", icon.icon_name);

        li.addEventListener("click", function () {
          addIconId.value = this.getAttribute("data-value");

          // Create selected display with Font Awesome icon
          const selectedIcon = document.createElement("i");
          const iconClass = this.getAttribute("data-icon-symbol");
          selectedIcon.className = `fas ${iconClass}`;
          selectedIcon.style.marginRight = "0.5rem";
          selectedIcon.style.fontSize = "1.2em";

          addIconText.innerHTML = "";
          addIconText.appendChild(selectedIcon);
          addIconText.appendChild(
            document.createTextNode(this.getAttribute("data-icon-name"))
          );
        });

        addIconOptions.appendChild(li);
      });

      // Enable icon dropdown
      addIconDropdown.disabled = false;
    });
  }

  // Edit Category Modal - Icon Selection
  const editIconCategory = document.getElementById("editIconCategory");
  const editIconDropdown = document.getElementById("editIconDropdown");
  const editIconId = document.getElementById("editIconId");
  const editIconText = document.getElementById("editIconText");
  const editIconOptions = document.getElementById("editIconOptions");

  if (editIconCategory && editIconDropdown) {
    editIconCategory.addEventListener("change", function () {
      const selectedCategory = this.value;

      // Clear and disable icon dropdown if no category selected
      if (!selectedCategory) {
        editIconText.textContent = "Select an icon";
        editIconId.value = "";
        editIconOptions.innerHTML = "";
        editIconDropdown.disabled = true;
        return;
      }

      // Filter icons by selected category
      const categoryIcons = allIcons.filter(
        (icon) => icon.category === selectedCategory
      );

      // Populate icon dropdown
      editIconOptions.innerHTML = "";
      categoryIcons.forEach((icon) => {
        const li = document.createElement("li");
        li.className = "dropdown-item d-flex align-items-center";

        // Get icon for the current icon using Font Awesome classes
        function getIconElement(iconData) {
          if (!iconData || !iconData.icon_class) {
            // Fallback to default icon if no icon data
            const fallbackIcon = document.createElement("i");
            fallbackIcon.className = "fas fa-tag";
            fallbackIcon.style.marginRight = "0.5rem";
            fallbackIcon.style.fontSize = "1.2em";
            return fallbackIcon;
          }

          // Create Font Awesome icon element
          const iconElement = document.createElement("i");
          iconElement.className = `fas ${iconData.icon_class}`;
          iconElement.style.marginRight = "0.5rem";
          iconElement.style.fontSize = "1.2em";
          return iconElement;
        }

        // Use the current icon data directly
        const iconElement = getIconElement(icon);

        // Create text element
        const textElement = document.createElement("span");
        textElement.textContent = icon.icon_name;

        // Append elements
        li.appendChild(iconElement);
        li.appendChild(textElement);

        li.setAttribute("data-value", icon.id);
        li.setAttribute("data-icon-symbol", icon.icon_class);
        li.setAttribute("data-icon-name", icon.icon_name);

        li.addEventListener("click", function () {
          editIconId.value = this.getAttribute("data-value");

          // Create selected display with Font Awesome icon
          const selectedIcon = document.createElement("i");
          const iconClass = this.getAttribute("data-icon-symbol");
          selectedIcon.className = `fas ${iconClass}`;
          selectedIcon.style.marginRight = "0.5rem";
          selectedIcon.style.fontSize = "1.2em";

          editIconText.innerHTML = "";
          editIconText.appendChild(selectedIcon);
          editIconText.appendChild(
            document.createTextNode(this.getAttribute("data-icon-name"))
          );
        });

        editIconOptions.appendChild(li);
      });

      // Enable icon dropdown
      editIconDropdown.disabled = false;
    });
  }
});

// Add Subcategory function
function addSubcategory(categoryId, categoryName) {
  // Set the category ID and name in the modal
  document.getElementById("subcategory_category_id").value = categoryId;
  document.getElementById("parentCategoryName").textContent = categoryName;

  // Show the modal
  const addSubcategoryModal = new bootstrap.Modal(
    document.getElementById("addSubcategoryModal")
  );
  addSubcategoryModal.show();
}

let subcategoryIdToDelete = null;

function showEditSubcategoryModal(subcategoryId, subcategoryName) {
  document.getElementById("edit_subcategory_id").value = subcategoryId;
  document.getElementById("edit_subcategory_name").value = subcategoryName;
  const modal = new bootstrap.Modal(
    document.getElementById("editSubcategoryModal")
  );
  modal.show();
}

function showDeleteSubcategoryModal(subcategoryId, subcategoryName) {
  subcategoryIdToDelete = subcategoryId;
  document.getElementById("deleteSubcategoryName").textContent =
    subcategoryName;
  const modal = new bootstrap.Modal(
    document.getElementById("deleteSubcategoryModal")
  );
  modal.show();
}

function handleEditSubcategory(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const jsonData = {};
  formData.forEach((value, key) => {
    jsonData[key] = value;
  });
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Updating...';
  submitBtn.disabled = true;
  fetch("/admin/subcategories/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jsonData),
  })
    .then((response) => {
      if (response.ok) return response.json();
      return response.json().then((data) => {
        throw new Error(data.error || "Failed to update subcategory.");
      });
    })
    .then((data) => {
      showAlert("Subcategory updated successfully!", "success");
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editSubcategoryModal")
      );
      modal.hide();
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      showAlert(error.message, "danger");
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    });
}

function handleDeleteSubcategory() {
  const btn = document.getElementById("confirmDeleteSubcategoryBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
  btn.disabled = true;
  fetch("/admin/subcategories/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subcategory_id: subcategoryIdToDelete }),
  })
    .then((response) => {
      if (response.ok) return response.json();
      return response.json().then((data) => {
        throw new Error(data.error || "Failed to delete subcategory.");
      });
    })
    .then((data) => {
      showAlert("Subcategory deleted successfully!", "success");
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteSubcategoryModal")
      );
      modal.hide();
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      showAlert(error.message, "danger");
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}
