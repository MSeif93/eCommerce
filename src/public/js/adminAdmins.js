// Admin Management JavaScript

let pendingDeleteForm = null;
document.addEventListener("DOMContentLoaded", function () {
  // Handle delete confirmation
  const deleteForms = document.querySelectorAll(".delete-admin-form");
  const modal = document.getElementById("customConfirmModal");
  const messageSpan = document.getElementById("customConfirmMessage");
  const okBtn = document.getElementById("customConfirmOk");
  const cancelBtn = document.getElementById("customConfirmCancel");

  deleteForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      pendingDeleteForm = this;
      const adminName = this.getAttribute("data-admin-name");
      messageSpan.textContent = `Are you sure you want to delete ${adminName}? This action cannot be undone.`;
      modal.style.display = "flex";
      okBtn.focus();
    });
  });

  okBtn.addEventListener("click", function () {
    if (pendingDeleteForm) {
      modal.style.display = "none";
      pendingDeleteForm.submit();
      pendingDeleteForm = null;
    }
  });
  cancelBtn.addEventListener("click", function () {
    modal.style.display = "none";
    pendingDeleteForm = null;
  });
  // Optional: close modal on Escape key
  document.addEventListener("keydown", function (e) {
    if (modal.style.display === "flex" && e.key === "Escape") {
      modal.style.display = "none";
      pendingDeleteForm = null;
    }
  });
});
