// Password toggle functionality
document.addEventListener("DOMContentLoaded", function () {
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("adminPassword");
  const passwordIcon = document.getElementById("passwordIcon");

  if (togglePassword && passwordInput && passwordIcon) {
    togglePassword.addEventListener("click", function () {
      // Toggle password visibility
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Toggle icon
      if (type === "text") {
        passwordIcon.classList.remove("fa-eye");
        passwordIcon.classList.add("fa-eye-slash");
        togglePassword.setAttribute("title", "Hide Password");
      } else {
        passwordIcon.classList.remove("fa-eye-slash");
        passwordIcon.classList.add("fa-eye");
        togglePassword.setAttribute("title", "Show Password");
      }
    });
  }
});
