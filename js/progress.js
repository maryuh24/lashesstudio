// progress.js - Universal Progress Indicator System for Lash Studio Booking System (jQuery Version)

/**
 * Progress Indicator Types:
 * 1. Full Page Overlay - For major page transitions and actions
 * 2. Button Loading - For form submissions
 * 3. Section/Container Loading - For data fetching within sections
 * 4. Toast Notifications - For quick feedback
 */

// ============================================
// CONFIGURATION
// ============================================

const ProgressConfig = {
  defaultTimeout: 30000, // 30 seconds timeout for operations
  toastDuration: 3000,   // Toast display duration
  animationDuration: 300  // CSS transition duration
};

// ============================================
// FULL PAGE LOADING OVERLAY
// ============================================

function createPageOverlay() {
  if ($('#pageLoadingOverlay').length) return;
  
  const overlay = $('<div>', {
    id: 'pageLoadingOverlay',
    class: 'progress-overlay'
  }).html(`
    <div class="progress-content">
      <div class="progress-spinner">
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
        <div class="spinner-blade"></div>
      </div>
      <div class="progress-message" id="progressMessage">Loading...</div>
      <div class="progress-submessage" id="progressSubmessage">Please wait</div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progressBar"></div>
      </div>
    </div>
  `);
  
  $('body').append(overlay);
}

/**
 * Show full page loading overlay
 * @param {string} message - Main loading message
 * @param {string} submessage - Secondary message
 */
function showPageLoading(message = 'Loading...', submessage = 'Please wait') {
  createPageOverlay();
  const $overlay = $('#pageLoadingOverlay');
  const $messageEl = $('#progressMessage');
  const $submessageEl = $('#progressSubmessage');
  const $progressBar = $('#progressBar');
  
  if ($messageEl.length) $messageEl.text(message);
  if ($submessageEl.length) $submessageEl.text(submessage);
  if ($progressBar.length) {
    $progressBar.css('width', '0%');
    // Animate progress
    setTimeout(() => $progressBar.css('width', '30%'), 100);
    setTimeout(() => $progressBar.css('width', '60%'), 500);
    setTimeout(() => $progressBar.css('width', '80%'), 1000);
  }
  
  if ($overlay.length) {
    $overlay.addClass('active');
  }
}

/**
 * Update page loading message
 * @param {string} message - New message
 * @param {string} submessage - New submessage
 */
function updatePageLoading(message, submessage) {
  const $messageEl = $('#progressMessage');
  const $submessageEl = $('#progressSubmessage');
  
  if ($messageEl.length && message) $messageEl.text(message);
  if ($submessageEl.length && submessage) $submessageEl.text(submessage);
}

/**
 * Hide page loading overlay
 * @param {function} callback - Optional callback after hide
 */
function hidePageLoading(callback) {
  const $overlay = $('#pageLoadingOverlay');
  const $progressBar = $('#progressBar');
  
  if ($progressBar.length) {
    $progressBar.css('width', '100%');
  }
  
  setTimeout(() => {
    if ($overlay.length) {
      $overlay.removeClass('active');
    }
    if (callback && typeof callback === 'function') {
      callback();
    }
  }, ProgressConfig.animationDuration);
}

// ============================================
// BUTTON LOADING STATE
// ============================================

/**
 * Set button to loading state
 * @param {HTMLElement|jQuery} button - Button element
 * @param {string} loadingText - Text to show while loading
 * @returns {object} - Object with original state for restoration
 */
function setButtonLoading(button, loadingText = 'Loading...') {
  const $button = $(button);
  if (!$button.length) return null;
  
  const originalState = {
    text: $button.html(),
    disabled: $button.prop('disabled'),
    width: $button.css('width')
  };
  
  // Store original width to prevent button size change
  const width = $button.outerWidth();
  $button.css('min-width', width + 'px');
  
  $button.prop('disabled', true);
  $button.addClass('btn-loading');
  $button.html(`
    <span class="btn-spinner"></span>
    <span class="btn-loading-text">${loadingText}</span>
  `);
  
  return originalState;
}

/**
 * Reset button from loading state
 * @param {HTMLElement|jQuery} button - Button element
 * @param {object} originalState - Original state object from setButtonLoading
 */
function resetButtonLoading(button, originalState) {
  const $button = $(button);
  if (!$button.length || !originalState) return;
  
  $button.prop('disabled', originalState.disabled);
  $button.removeClass('btn-loading');
  $button.html(originalState.text);
  $button.css('min-width', '');
}

// ============================================
// SECTION/CONTAINER LOADING
// ============================================

/**
 * Show loading state in a container
 * @param {string} containerId - Container element ID
 * @param {string} message - Loading message
 */
function showSectionLoading(containerId, message = 'Loading...') {
  const $container = $('#' + containerId);
  if (!$container.length) return;
  
  // Store original content
  $container.data('originalContent', $container.html());
  
  $container.html(`
    <div class="section-loading">
      <div class="section-spinner"></div>
      <p class="section-loading-text">${message}</p>
    </div>
  `);
  $container.addClass('is-loading');
}

/**
 * Hide section loading and optionally restore content
 * @param {string} containerId - Container element ID
 * @param {boolean} restore - Whether to restore original content
 */
function hideSectionLoading(containerId, restore = false) {
  const $container = $('#' + containerId);
  if (!$container.length) return;
  
  $container.removeClass('is-loading');
  
  if (restore && $container.data('originalContent')) {
    $container.html($container.data('originalContent'));
    $container.removeData('originalContent');
  }
}

/**
 * Show skeleton loading placeholders
 * @param {string} containerId - Container element ID
 * @param {number} count - Number of skeleton items
 * @param {string} type - Type of skeleton ('card', 'row', 'list')
 */
function showSkeletonLoading(containerId, count = 3, type = 'card') {
  const $container = $('#' + containerId);
  if (!$container.length) return;
  
  $container.data('originalContent', $container.html());
  
  let skeletonHTML = '';
  
  for (let i = 0; i < count; i++) {
    if (type === 'card') {
      skeletonHTML += `
        <div class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-badge"></div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
          </div>
          <div class="skeleton-footer">
            <div class="skeleton skeleton-button"></div>
          </div>
        </div>
      `;
    } else if (type === 'row') {
      skeletonHTML += `
        <div class="skeleton-row">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-row-content">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
          </div>
        </div>
      `;
    } else if (type === 'list') {
      skeletonHTML += `
        <div class="skeleton-list-item">
          <div class="skeleton skeleton-line"></div>
        </div>
      `;
    }
  }
  
  $container.html(`<div class="skeleton-container">${skeletonHTML}</div>`);
  $container.addClass('is-loading');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function createToastContainer() {
  if ($('#toastContainer').length) return;
  
  const $container = $('<div>', {
    id: 'toastContainer',
    class: 'toast-container'
  });
  $('body').append($container);
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success', 'error', 'warning', 'info', 'loading')
 * @param {number} duration - Duration in ms (0 for persistent)
 * @returns {string} - Toast ID for manual dismissal
 */
function showToast(message, type = 'info', duration = ProgressConfig.toastDuration) {
  createToastContainer();
  const $container = $('#toastContainer');
  
  const toastId = 'toast-' + Date.now();
  const $toast = $('<div>', {
    id: toastId,
    class: `toast toast-${type}`
  });
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    loading: ''
  };
  
  $toast.html(`
    <div class="toast-content">
      ${type === 'loading' ? '<span class="toast-spinner"></span>' : `<span class="toast-icon">${icons[type]}</span>`}
      <span class="toast-message">${message}</span>
    </div>
    ${type !== 'loading' ? '<button class="toast-close" onclick="dismissToast(\'' + toastId + '\')">&times;</button>' : ''}
  `);
  
  $container.append($toast);
  
  // Trigger animation
  setTimeout(() => $toast.addClass('show'), 10);
  
  // Auto dismiss
  if (duration > 0 && type !== 'loading') {
    setTimeout(() => dismissToast(toastId), duration);
  }
  
  return toastId;
}

/**
 * Dismiss a toast notification
 * @param {string} toastId - Toast element ID
 */
function dismissToast(toastId) {
  const $toast = $('#' + toastId);
  if (!$toast.length) return;
  
  $toast.removeClass('show').addClass('hide');
  
  setTimeout(() => {
    $toast.remove();
  }, ProgressConfig.animationDuration);
}

/**
 * Update a toast message
 * @param {string} toastId - Toast element ID
 * @param {string} message - New message
 * @param {string} type - New type
 */
function updateToast(toastId, message, type) {
  const $toast = $('#' + toastId);
  if (!$toast.length) return;
  
  const $messageEl = $toast.find('.toast-message');
  if ($messageEl.length) $messageEl.text(message);
  
  if (type) {
    $toast.attr('class', `toast toast-${type} show`);
    
    const $iconEl = $toast.find('.toast-icon');
    const $spinnerEl = $toast.find('.toast-spinner');
    
    if (type !== 'loading' && $spinnerEl.length) {
      const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
      $spinnerEl.replaceWith(`<span class="toast-icon">${icons[type]}</span>`);
    }
    
    // Auto dismiss after type change (unless it's loading)
    if (type !== 'loading') {
      setTimeout(() => dismissToast(toastId), ProgressConfig.toastDuration);
    }
  }
}

// ============================================
// INLINE LOADING (FOR SPECIFIC ELEMENTS)
// ============================================

/**
 * Add inline loading indicator next to an element
 * @param {string} elementId - Element ID to add loading next to
 * @param {string} position - Position ('before', 'after', 'replace')
 */
function showInlineLoading(elementId, position = 'after') {
  const $element = $('#' + elementId);
  if (!$element.length) return;
  
  const loaderId = `loader-${elementId}`;
  
  // Remove existing loader if any
  $('#' + loaderId).remove();
  
  const $loader = $('<span>', {
    id: loaderId,
    class: 'inline-loader'
  }).html('<span class="inline-spinner"></span>');
  
  if (position === 'before') {
    $element.before($loader);
  } else if (position === 'after') {
    $element.after($loader);
  } else if (position === 'replace') {
    $element.data('originalDisplay', $element.css('display'));
    $element.hide();
    $element.after($loader);
  }
}

/**
 * Hide inline loading indicator
 * @param {string} elementId - Original element ID
 */
function hideInlineLoading(elementId) {
  const loaderId = `loader-${elementId}`;
  $('#' + loaderId).remove();
  
  const $element = $('#' + elementId);
  if ($element.length && $element.data('originalDisplay') !== undefined) {
    $element.css('display', $element.data('originalDisplay') || '');
    $element.removeData('originalDisplay');
  }
}

// ============================================
// ACTION WRAPPER WITH PROGRESS
// ============================================

/**
 * Wrapper for async actions with automatic progress indication
 * @param {object} options - Configuration options
 * @param {function} options.action - Async action to perform
 * @param {string} options.loadingMessage - Loading message
 * @param {string} options.successMessage - Success message
 * @param {string} options.errorMessage - Error message prefix
 * @param {string} options.type - Progress type ('page', 'toast', 'button')
 * @param {HTMLElement|jQuery} options.button - Button element (for button type)
 */
async function withProgress(options) {
  const {
    action,
    loadingMessage = 'Processing...',
    successMessage = 'Success!',
    errorMessage = 'An error occurred',
    type = 'toast',
    button = null,
    buttonText = 'Processing...'
  } = options;
  
  let toastId = null;
  let buttonState = null;
  
  try {
    // Start loading
    if (type === 'page') {
      showPageLoading(loadingMessage);
    } else if (type === 'toast') {
      toastId = showToast(loadingMessage, 'loading', 0);
    } else if (type === 'button' && button) {
      buttonState = setButtonLoading(button, buttonText);
    }
    
    // Execute action
    const result = await action();
    
    // Show success
    if (type === 'page') {
      hidePageLoading();
      showToast(successMessage, 'success');
    } else if (type === 'toast' && toastId) {
      updateToast(toastId, successMessage, 'success');
    } else if (type === 'button') {
      showToast(successMessage, 'success');
    }
    
    return result;
    
  } catch (error) {
    // Show error
    const errMsg = error.message || errorMessage;
    
    if (type === 'page') {
      hidePageLoading();
      showToast(errMsg, 'error', 5000);
    } else if (type === 'toast' && toastId) {
      updateToast(toastId, errMsg, 'error');
    } else if (type === 'button') {
      showToast(errMsg, 'error', 5000);
    }
    
    throw error;
    
  } finally {
    // Reset button
    if (type === 'button' && button && buttonState) {
      resetButtonLoading(button, buttonState);
    }
  }
}

// ============================================
// DATA LOADING WITH PROGRESS
// ============================================

/**
 * Load data with progress indication
 * @param {string} containerId - Container to show loading in
 * @param {function} loadFunction - Async function that loads and renders data
 * @param {object} options - Additional options
 */
async function loadWithProgress(containerId, loadFunction, options = {}) {
  const {
    loadingMessage = 'Loading data...',
    skeletonType = 'card',
    skeletonCount = 3,
    useSkeleton = true
  } = options;
  
  try {
    if (useSkeleton) {
      showSkeletonLoading(containerId, skeletonCount, skeletonType);
    } else {
      showSectionLoading(containerId, loadingMessage);
    }
    
    await loadFunction();
    
  } catch (error) {
    const $container = $('#' + containerId);
    if ($container.length) {
      $container.html(`
        <div class="error-state">
          <div class="error-icon">⚠</div>
          <p>Failed to load data</p>
          <p class="error-details">${error.message}</p>
          <button class="btn-primary" onclick="location.reload()">Retry</button>
        </div>
      `);
    }
    throw error;
  }
}

// ============================================
// EXPORT FOR GLOBAL USE
// ============================================

// Make functions available globally
window.showPageLoading = showPageLoading;
window.updatePageLoading = updatePageLoading;
window.hidePageLoading = hidePageLoading;
window.setButtonLoading = setButtonLoading;
window.resetButtonLoading = resetButtonLoading;
window.showSectionLoading = showSectionLoading;
window.hideSectionLoading = hideSectionLoading;
window.showSkeletonLoading = showSkeletonLoading;
window.showToast = showToast;
window.dismissToast = dismissToast;
window.updateToast = updateToast;
window.showInlineLoading = showInlineLoading;
window.hideInlineLoading = hideInlineLoading;
window.withProgress = withProgress;
window.loadWithProgress = loadWithProgress;
window.ProgressConfig = ProgressConfig;
