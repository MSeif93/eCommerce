// Toast Notification System

class Toast {
  constructor() {
    this.container = this.createContainer();
    this.toasts = [];
  }

  createContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = "info", duration = 5000) {
    const toast = this.createToast(message, type);
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Show animation
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Start progress bar
    this.startProgress(toast, duration);

    // Auto remove after duration
    setTimeout(() => {
      this.hide(toast);
    }, duration);

    return toast;
  }

  createToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = this.getIcon(type);
    const title = this.getTitle(type);

    toast.innerHTML = `
      <div class="toast-header">
        <h6 class="toast-title">
          <i class="fas ${icon}"></i>
          ${title}
        </h6>
        <button class="toast-close" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <p class="toast-message">${message}</p>
      <div class="toast-progress">
        <div class="toast-progress-bar"></div>
      </div>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.hide(toast);
    });

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-triangle",
      warning: "fa-exclamation-circle",
      info: "fa-info-circle",
    };
    return icons[type] || icons.info;
  }

  getTitle(type) {
    const titles = {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Information",
    };
    return titles[type] || titles.info;
  }

  startProgress(toast, duration) {
    const progressBar = toast.querySelector(".toast-progress-bar");
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      setTimeout(() => {
        progressBar.style.width = "0%";
      }, 10);
    }
  }

  hide(toast) {
    toast.classList.add("hide");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  success(message, duration = 5000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 5000) {
    return this.show(message, "error", duration);
  }

  warning(message, duration = 5000) {
    return this.show(message, "warning", duration);
  }

  info(message, duration = 5000) {
    return this.show(message, "info", duration);
  }
}

// Initialize toast system
const toast = new Toast();

// Auto-show flash messages from server
document.addEventListener("DOMContentLoaded", function () {
  // Check for flash messages in meta tags or data attributes
  const flashSuccess = document.querySelector('meta[name="flash-success"]');
  const flashError = document.querySelector('meta[name="flash-error"]');
  const flashWarning = document.querySelector('meta[name="flash-warning"]');
  const flashInfo = document.querySelector('meta[name="flash-info"]');

  if (flashSuccess) {
    toast.success(flashSuccess.getAttribute("content"));
  }
  if (flashError) {
    toast.error(flashError.getAttribute("content"));
  }
  if (flashWarning) {
    toast.warning(flashWarning.getAttribute("content"));
  }
  if (flashInfo) {
    toast.info(flashInfo.getAttribute("content"));
  }
});
