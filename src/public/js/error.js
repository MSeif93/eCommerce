// Error Page JavaScript
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
});
