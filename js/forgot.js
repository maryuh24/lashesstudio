// forgot.js - Forgot Password Flow (jQuery Version)

const API_URL = 'http://127.0.0.1:8000';

// Global variables to store data
let userEmail = '';
let verifiedOtp = '';

$(document).ready(function() {
  // DOM elements
  const $stepEmail = $('#step-email');
  const $stepOtp = $('#step-otp');
  const $stepReset = $('#step-reset');

  const $forgotEmailInput = $('#forgotEmail');
  const $otpInput = $('#otpInput');
  const $newPasswordInput = $('#newPassword');
  const $confirmPasswordInput = $('#confirmPassword');

  const $sendOtpBtn = $('#sendOtpBtn');
  const $verifyOtpBtn = $('#verifyOtpBtn');
  const $resetPasswordBtn = $('#resetPasswordBtn');

  const $emailMsg = $('#emailMsg');
  const $otpMsg = $('#otpMsg');
  const $resetMsg = $('#resetMsg');

  // Step 1: Send OTP
  $sendOtpBtn.on('click', async function() {
    const email = $forgotEmailInput.val().trim();
    
    if (!email) {
      showMessage($emailMsg, 'Please enter your email address.', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showMessage($emailMsg, 'Please enter a valid email address.', 'error');
      return;
    }

    let buttonState = null;
    try {
      // Use progress indicator
      if (typeof setButtonLoading === 'function') {
        buttonState = setButtonLoading($sendOtpBtn, 'Sending OTP...');
      } else {
        $sendOtpBtn.prop('disabled', true).text('Sending...');
      }
      
      const response = await fetch(`${API_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        // Store email BEFORE showing success message
        userEmail = email;
        console.log('Email stored:', userEmail);
        
        if (typeof showToast === 'function') {
          showToast(data.message || 'OTP sent to your email!', 'success');
        } else {
          showMessage($emailMsg, data.message, 'success');
        }
        
        // Move to step 2 after 1 second
        setTimeout(() => {
          if (window.showStep) {
            window.showStep('step-otp');
          } else {
            $stepEmail.hide();
            $stepOtp.show();
          }
        }, 1000);
      } else {
        if (typeof showToast === 'function') {
          showToast(data.error || 'Failed to send OTP', 'error');
        } else {
          showMessage($emailMsg, data.error, 'error');
        }
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      if (typeof showToast === 'function') {
        showToast('Network error. Please try again.', 'error');
      } else {
        showMessage($emailMsg, 'Network error. Please try again.', 'error');
      }
    } finally {
      if (typeof resetButtonLoading === 'function' && buttonState) {
        resetButtonLoading($sendOtpBtn, buttonState);
      } else {
        $sendOtpBtn.prop('disabled', false).text('Send OTP');
      }
    }
  });

  // Step 2: Verify OTP
  $verifyOtpBtn.on('click', async function() {
    const otp = $otpInput.val().trim();
    
    if (!otp) {
      showMessage($otpMsg, 'Please enter the OTP.', 'error');
      return;
    }

    if (otp.length !== 6) {
      showMessage($otpMsg, 'OTP must be 6 digits.', 'error');
      return;
    }

    let buttonState = null;
    try {
      // Use progress indicator
      if (typeof setButtonLoading === 'function') {
        buttonState = setButtonLoading($verifyOtpBtn, 'Verifying...');
      } else {
        $verifyOtpBtn.prop('disabled', true).text('Verifying...');
      }
      
      const response = await fetch(`${API_URL}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail, 
          otp: otp 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store the OTP BEFORE showing success message
        verifiedOtp = otp;
        console.log('OTP verified and stored:', verifiedOtp);
        console.log('Email is:', userEmail);
        
        if (typeof showToast === 'function') {
          showToast(data.message || 'OTP verified successfully!', 'success');
        } else {
          showMessage($otpMsg, data.message, 'success');
        }
        
        // Move to step 3 after 1 second
        setTimeout(() => {
          if (window.showStep) {
            window.showStep('step-reset');
          } else {
            $stepOtp.hide();
            $stepReset.show();
          }
        }, 1000);
      } else {
        if (typeof showToast === 'function') {
          showToast(data.error || 'Invalid OTP', 'error');
        } else {
          showMessage($otpMsg, data.error, 'error');
        }
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      if (typeof showToast === 'function') {
        showToast('Network error. Please try again.', 'error');
      } else {
        showMessage($otpMsg, 'Network error. Please try again.', 'error');
      }
    } finally {
      if (typeof resetButtonLoading === 'function' && buttonState) {
        resetButtonLoading($verifyOtpBtn, buttonState);
      } else {
        $verifyOtpBtn.prop('disabled', false).text('Verify OTP');
      }
    }
  });

  // Step 3: Reset Password
  $resetPasswordBtn.on('click', async function() {
    const newPassword = $newPasswordInput.val();
    const confirmPassword = $confirmPasswordInput.val();
    
    // Add debug logging
    console.log('Reset attempt with:');
    console.log('- Email:', userEmail);
    console.log('- OTP:', verifiedOtp);
    console.log('- New password length:', newPassword.length);
    
    if (!newPassword || !confirmPassword) {
      if (typeof showToast === 'function') {
        showToast('Please fill in all fields.', 'warning');
      } else {
        showMessage($resetMsg, 'Please fill in all fields.', 'error');
      }
      return;
    }

    if (newPassword.length < 6) {
      if (typeof showToast === 'function') {
        showToast('Password must be at least 6 characters.', 'error');
      } else {
        showMessage($resetMsg, 'Password must be at least 6 characters.', 'error');
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (typeof showToast === 'function') {
        showToast('Passwords do not match.', 'error');
      } else {
        showMessage($resetMsg, 'Passwords do not match.', 'error');
      }
      return;
    }

    // Verify we have email and OTP
    if (!userEmail || !verifiedOtp) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Please start over.', 'error');
      } else {
        showMessage($resetMsg, 'Session expired. Please start over.', 'error');
      }
      setTimeout(() => {
        window.location.href = 'forgot.html';
      }, 2000);
      return;
    }

    let buttonState = null;
    try {
      // Use progress indicator
      if (typeof setButtonLoading === 'function') {
        buttonState = setButtonLoading($resetPasswordBtn, 'Resetting...');
      } else {
        $resetPasswordBtn.prop('disabled', true).text('Resetting...');
      }
      
      const response = await fetch(`${API_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: userEmail, 
          otp: verifiedOtp,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (typeof showToast === 'function') {
          showToast(data.message || 'Password reset successful!', 'success');
        } else {
          showMessage($resetMsg, data.message, 'success');
        }
        
        // Clear stored data
        userEmail = '';
        verifiedOtp = '';
        
        // Show page loading for redirect
        if (typeof showPageLoading === 'function') {
          showPageLoading('Success!', 'Redirecting to login...');
        }
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        console.error('Reset failed:', data);
        if (typeof showToast === 'function') {
          showToast(data.error || 'Failed to reset password', 'error');
        } else {
          showMessage($resetMsg, data.error, 'error');
        }
      }
    } catch (error) {
      console.error('Reset Password Error:', error);
      if (typeof showToast === 'function') {
        showToast('Network error. Please try again.', 'error');
      } else {
        showMessage($resetMsg, 'Network error. Please try again.', 'error');
      }
    } finally {
      if (typeof resetButtonLoading === 'function' && buttonState) {
        resetButtonLoading($resetPasswordBtn, buttonState);
      } else {
        $resetPasswordBtn.prop('disabled', false).text('Reset Password');
      }
    }
  });

  // Allow only numbers in OTP input
  $otpInput.on('input', function() {
    $(this).val($(this).val().replace(/[^0-9]/g, ''));
  });

  // Auto-focus next input after email
  $forgotEmailInput.on('keypress', function(e) {
    if (e.key === 'Enter') {
      $sendOtpBtn.click();
    }
  });

  // Auto-focus next input after OTP
  $otpInput.on('keypress', function(e) {
    if (e.key === 'Enter') {
      $verifyOtpBtn.click();
    }
  });

  // Auto-submit on Enter in password fields
  $confirmPasswordInput.on('keypress', function(e) {
    if (e.key === 'Enter') {
      $resetPasswordBtn.click();
    }
  });
});

// Utility functions
function showMessage($element, message, type) {
  $element
    .text(message)
    .removeClass('success-message error-message')
    .addClass(type === 'success' ? 'success-message' : 'error-message')
    .show();
  
  // Hide message after 5 seconds
  setTimeout(() => {
    $element.hide();
  }, 5000);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
