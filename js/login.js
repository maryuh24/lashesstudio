// login.js - Handle Login Form (jQuery Version)

// Create and inject loading overlay
function createLoadingOverlay() {
  if ($('#loadingOverlay').length) return;
  
  const $overlay = $('<div>', {
    id: 'loadingOverlay',
    class: 'loading-overlay'
  }).html(`
    <div class="loading-spinner"></div>
    <div class="loading-text">Signing you in...</div>
    <div class="loading-subtext">Please wait</div>
    <div class="loading-progress">
      <div class="loading-progress-bar" id="loginProgressBar"></div>
    </div>
  `);
  
  $('body').append($overlay);
}

function showLoginLoading() {
  createLoadingOverlay();
  const $overlay = $('#loadingOverlay');
  const $progressBar = $('#loginProgressBar');
  
  if ($overlay.length) {
    $overlay.addClass('active');
    // Animate progress bar
    if ($progressBar.length) {
      $progressBar.css('width', '0%');
      setTimeout(() => $progressBar.css('width', '30%'), 100);
      setTimeout(() => $progressBar.css('width', '60%'), 500);
      setTimeout(() => $progressBar.css('width', '80%'), 1000);
    }
  }
}

function hideLoginLoading() {
  const $overlay = $('#loadingOverlay');
  const $progressBar = $('#loginProgressBar');
  
  if ($progressBar.length) {
    $progressBar.css('width', '100%');
  }
  
  setTimeout(() => {
    if ($overlay.length) {
      $overlay.removeClass('active');
    }
  }, 300);
}

function completeLoginLoading(callback) {
  const $progressBar = $('#loginProgressBar');
  if ($progressBar.length) {
    $progressBar.css('width', '100%');
  }
  setTimeout(callback, 400);
}

$(document).ready(function() {
  // Check if user just verified their email
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('verified') === '1') {
    const $successMsg = $('<div>')
      .css({
        'background': '#d1fae5',
        'color': '#065f46',
        'padding': '1rem',
        'border-radius': '8px',
        'margin-bottom': '1rem',
        'text-align': 'center'
      })
      .text('✓ Email verified successfully! You can now login.');
    
    const $formContainer = $('.form-container');
    if ($formContainer.length) {
      $formContainer.prepend($successMsg);
      
      // Remove the message after 5 seconds
      setTimeout(() => $successMsg.remove(), 5000);
    }
  }

  const $loginForm = $('#loginForm');

  if ($loginForm.length) {
    $loginForm.on('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const data = {
        username: formData.get("username"),
        password: formData.get("password")
      };

      // Show loading screen
      showLoginLoading();

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          hideLoginLoading();
          const text = await res.text();
          console.error('Response status:', res.status);
          console.error('Response text:', text);
          
          let errorMsg = "Login failed. Please try again.";
          try {
            const result = JSON.parse(text);
            errorMsg = result.error || result.message || errorMsg;
            
            // Check if account needs verification (403 with requires_verification flag)
            if (res.status === 403 && result.requires_verification && result.email) {
              // Show message and redirect to verification page
              showVerificationMessage(result.error, result.email);
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            errorMsg = "Login failed. Server returned unexpected response.";
          }
          
          // Display error message in UI
          showErrorMessage(errorMsg);
          return;
        }

        const result = await res.json();

        // ✅ Store token with consistent key name
        localStorage.setItem("authToken", result.token);
        
        // Store user type for navigation
        const userType = result.user?.user_type || 'user';
        localStorage.setItem("userType", userType);

        // Clear any existing error messages
        hideErrorMessage();
        
        // Complete loading animation then redirect
        completeLoginLoading(() => {
          // Redirect to appropriate dashboard based on user type
          if (userType === 'admin') {
            window.location.href = "admin-dashboard.html";
          } else if (userType === 'artist') {
            window.location.href = "lash-artist-dashboard.html";
          } else {
            window.location.href = "dashboard.html";
          }
        });
      } catch (err) {
        hideLoginLoading();
        console.error("Login error:", err);
        showErrorMessage("Network error. Please check your connection and try again.");
      }
    });
  }

  // Function to show error message
  function showErrorMessage(message) {
    const $errorContainer = $('#errorMessage');
    const $errorText = $('#errorText');
    
    if ($errorContainer.length && $errorText.length) {
      $errorText.text(message);
      $errorContainer.show();
      
      // Scroll to error message
      $errorContainer[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Function to show verification required message and redirect
  function showVerificationMessage(message, email) {
    // Create a styled verification notice
    $('#verificationNotice').remove();

    const $notice = $('<div>', { id: 'verificationNotice' })
      .css({
        'background': 'linear-gradient(135deg, #fef3c7, #fde68a)',
        'color': '#92400e',
        'padding': '1.5rem',
        'border-radius': '12px',
        'margin-bottom': '1.5rem',
        'text-align': 'center',
        'border': '2px solid #f59e0b',
        'box-shadow': '0 4px 6px rgba(245, 158, 11, 0.2)'
      })
      .html(`
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📧</div>
        <p style="font-weight: 600; margin-bottom: 0.5rem;">${message}</p>
        <p style="font-size: 0.9rem; margin-bottom: 1rem;">Redirecting to verification page...</p>
        <div style="width: 100%; height: 4px; background: rgba(146, 64, 14, 0.2); border-radius: 2px; overflow: hidden;">
          <div id="redirectProgress" style="width: 0%; height: 100%; background: #92400e; transition: width 3s linear;"></div>
        </div>
      `);

    const $formContainer = $('.form-container');
    if ($formContainer.length) {
      $formContainer.prepend($notice);
      
      // Start progress bar animation
      setTimeout(() => {
        $('#redirectProgress').css('width', '100%');
      }, 100);

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = `verify-email.html?email=${encodeURIComponent(email)}&from=login`;
      }, 3000);
    }
  }

  // Function to hide error message
  function hideErrorMessage() {
    $('#errorMessage').hide();
  }

  // Close error message button handler
  $('#closeError').on('click', function() {
    hideErrorMessage();
  });
});
