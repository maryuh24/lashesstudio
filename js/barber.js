// lash-artist.js - Lash Artist Dashboard Functionality (jQuery Version)
// Note: API_URL, redirectToDashboard, TIME_SLOTS, and formatBookingTime are defined in main.js

// Helper function to get appointment date/time as a Date object
function getAppointmentDateTime(bookingDate, bookingTime) {
  // Parse the booking date
  const date = new Date(bookingDate);
  
  // Parse the booking time (could be in format "HH:MM" or "HH:MM:SS")
  const timeParts = bookingTime.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10) || 0;
  
  // Set the time on the date
  date.setHours(hours, minutes, 0, 0);
  
  return date;
}

// Check if user is a lash artist
async function checkLashArtistAccess() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const res = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;
    
    if (!user || user.user_type !== 'artist') {
      alert('Access denied. Artist privileges required.');
      redirectToDashboard(user?.user_type);
      return;
    }
  } catch (err) {
    console.error('Lash artist check error:', err);
    window.location.href = 'login.html';
  }
}

// Alias for backward compatibility
async function checkBarberAccess() {
  return checkLashArtistAccess();
}

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================

// Load barber's appointments
// Alias for backward compatibility
async function loadBarberAppointments() {
  return loadLashArtistAppointments();
}

async function loadLashArtistAppointments() {
  const $container = $('#barberAppointmentsContainer');
  
  try {
    const token = localStorage.getItem('authToken');
    const search = $('#searchInput').val() || '';
    const status = $('#statusFilter').val() || '';

    // Show skeleton loading
    if ($container.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('barberAppointmentsContainer', 4, 'card');
    }

    let url = `${API_URL}/lash-artist/appointments`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    if (!res.ok) {
      const error = await res.json();
      console.error('Error loading appointments:', error);
      if (typeof showToast === 'function') {
        showToast(error.message || 'Failed to load appointments', 'error');
      }
      return;
    }

    const bookings = await res.json();

    if (!$container.length) return;

    $container.empty();

    if (bookings.length === 0) {
      $container.html(`
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>No appointments found</p>
          <span class="empty-hint">Your appointments will appear here once customers book with you</span>
        </div>
      `);
      return;
    }

    $.each(bookings, function(i, booking) {
      const statusClass = `status-${booking.status}`;
      
      // Format date and time
      const dateObj = new Date(booking.booking_date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      const time = formatBookingTime(booking.booking_time);
      
      // Check if appointment date/time has passed
      const appointmentDateTime = getAppointmentDateTime(booking.booking_date, booking.booking_time);
      const now = new Date();
      const hasAppointmentPassed = appointmentDateTime <= now;
      
      // Action button based on status
      let actionSection = '';
      if (booking.status === 'confirmed') {
        if (hasAppointmentPassed) {
          actionSection = `
            <div class="barber-card-footer">
              <button class="btn btn-success action-btn" onclick="markAppointmentComplete(${booking.id})">
                ✓ Mark as Complete
              </button>
            </div>
          `;
        } else {
          // Appointment is in the future - show scheduled message
          actionSection = `
            <div class="barber-card-footer scheduled-footer">
              <span class="scheduled-badge">📅 Scheduled - Cannot complete yet</span>
            </div>
          `;
        }
      } else if (booking.status === 'completed') {
        actionSection = `
          <div class="barber-card-footer completed-footer">
            <span class="completion-badge">✓ Completed</span>
          </div>
        `;
      } else if (booking.status === 'pending') {
        actionSection = `
          <div class="barber-card-footer pending-footer">
            <span class="pending-badge">⏳ Awaiting Admin Approval</span>
          </div>
        `;
      } else if (booking.status === 'cancelled') {
        actionSection = `
          <div class="barber-card-footer cancelled-footer">
            <span class="cancelled-badge">✕ Cancelled</span>
          </div>
        `;
      }

      const $card = $('<div>', { class: `barber-appointment-card ${statusClass}-card` });
      $card.html(`
        <div class="barber-card-header">
          <span class="barber-card-id">#${booking.id}</span>
          <span class="badge ${statusClass}">${booking.status}</span>
        </div>
        <div class="barber-card-body">
          <div class="customer-section">
            <div class="customer-details">
              <span class="customer-name">${booking.user?.name || 'N/A'}</span>
              <span class="customer-label">Customer</span>
            </div>
          </div>
          <div class="appointment-details-grid">
            <div class="detail-item">
              <span class="detail-icon">✂️</span>
              <div class="detail-content">
                <span class="detail-label">Service</span>
                <span class="detail-value">${booking.service?.name || 'N/A'}</span>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <div class="detail-content">
                <span class="detail-label">Date</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-icon">🕐</span>
              <div class="detail-content">
                <span class="detail-label">Time</span>
                <span class="detail-value">${time}</span>
              </div>
            </div>
            ${booking.notes ? `
            <div class="detail-item notes-item">
              <span class="detail-icon">📝</span>
              <div class="detail-content">
                <span class="detail-label">Notes</span>
                <span class="detail-value notes-value">${booking.notes}</span>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ${actionSection}
      `);
      $container.append($card);
    });
  } catch (err) {
    console.error('Error loading lash artist appointments:', err);
    if ($container.length) {
      $container.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading appointments</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadLashArtistAppointments()">Retry</button></div>`);
    }
  }
}

// Mark appointment as completed
async function markAppointmentComplete(id) {
  if (!confirm('Mark this appointment as completed?')) {
    return;
  }

  let toastId = null;
  try {
    // Show loading toast
    if (typeof showToast === 'function') {
      toastId = showToast('Marking as completed...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');

    const res = await fetch(`${API_URL}/lash-artist/appointments/${id}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, 'Session expired. Redirecting...', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const result = await res.json();

    if (!res.ok) {
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, result.error || result.message || 'Failed to mark as completed', 'error');
      }
      return;
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Appointment marked as completed!', 'success');
    }
    loadLashArtistAppointments(); // Reload the list
  } catch (err) {
    console.error('Error marking appointment complete:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Failed to mark as completed. Please try again.', 'error');
    }
  }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Load lash artist profile
async function loadLashArtistProfile() {
  try {
    const token = localStorage.getItem('authToken');

    const res = await fetch(`${API_URL}/lash-artist/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) {
      const error = await res.json();
      console.error('Error loading profile:', error);
      alert(error.message || 'Failed to load profile');
      return;
    }

    const data = await res.json();
    const lashArtist = data.lash_artist || data.barber;
    const user = data.user;

    // Populate form fields
    $('#name').val(lashArtist.name || '');
    $('#email').val(lashArtist.email || user.email || '');
    $('#phone').val(lashArtist.phone || '');
    $('#specialty').val(lashArtist.specialty || '');
    $('#bio').val(lashArtist.bio || '');

    // Populate username field if it exists
    const $usernameField = $('#username');
    if ($usernameField.length) {
      $usernameField.val(user.username || '');
    }

    // Set profile image - use profile.png as default
    const $profileImage = $('#profileImage');
    if ($profileImage.length) {
      if (lashArtist.image_url) {
        $profileImage.attr('src', lashArtist.image_url);
      } else if (user.avatar) {
        $profileImage.attr('src', user.avatar);
      } else {
        $profileImage.attr('src', `${API_URL.replace('/api', '')}/storage/uploads/profile.png`);
      }
    }
  } catch (err) {
    console.error('Error loading lash artist profile:', err);
    alert('Failed to load profile. Please try again.');
  }
}

// Aliases for backward compatibility
async function loadBarberProfile() {
  return loadLashArtistProfile();
}

async function updateBarberProfile(e) {
  return updateLashArtistProfile(e);
}

async function updateBarberCredentials(e) {
  return updateLashArtistCredentials(e);
}

async function uploadBarberImage(e) {
  return uploadLashArtistImage(e);
}

// Update lash artist profile
async function updateLashArtistProfile(e) {
  e.preventDefault();

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Saving...');
  }

  try {
    const token = localStorage.getItem('authToken');
    const formData = new FormData(e.target);

    const data = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      specialty: formData.get('specialty'),
      bio: formData.get('bio')
    };

    const res = await fetch(`${API_URL}/lash-artist/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (res.status === 401) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Redirecting...', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const result = await res.json();

    if (!res.ok) {
      if (typeof showToast === 'function') {
        showToast(result.error || result.message || 'Failed to update profile', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Profile updated successfully!', 'success');
    }
    loadLashArtistProfile(); // Reload the profile
  } catch (err) {
    console.error('Error updating lash artist profile:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to update profile. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

// Update lash artist login credentials
async function updateLashArtistCredentials(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  const username = formData.get('username');
  const currentPassword = formData.get('current_password');
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');

  // Validate current password is required
  if (!currentPassword) {
    if (typeof showToast === 'function') {
      showToast('Please enter your current password to make changes.', 'warning');
    }
    return;
  }

  // Validate new password confirmation
  if (newPassword && newPassword !== confirmPassword) {
    if (typeof showToast === 'function') {
      showToast('New passwords do not match.', 'error');
    }
    return;
  }

  // Validate new password length if provided
  if (newPassword && newPassword.length < 6) {
    if (typeof showToast === 'function') {
      showToast('New password must be at least 6 characters long.', 'error');
    }
    return;
  }

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Updating...');
  }

  try {
    const token = localStorage.getItem('authToken');

    const data = {
      username: username,
      current_password: currentPassword
    };

    // Only include new_password if user wants to change it
    if (newPassword) {
      data.new_password = newPassword;
    }

    const res = await fetch(`${API_URL}/lash-artist/credentials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (res.status === 401) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Redirecting...', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const result = await res.json();

    if (!res.ok) {
      if (typeof showToast === 'function') {
        showToast(result.error || result.message || 'Failed to update credentials', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Credentials updated successfully!', 'success');
    }
    
    // Clear password fields
    $('#current_password').val('');
    $('#new_password').val('');
    $('#confirm_password').val('');
    
    loadLashArtistProfile(); // Reload the profile
  } catch (err) {
    console.error('Error updating credentials:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to update credentials. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

// Upload lash artist profile image
async function uploadLashArtistImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    if (typeof showToast === 'function') {
      showToast('Please select a valid image file', 'error');
    }
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    if (typeof showToast === 'function') {
      showToast('Image size must be less than 2MB', 'error');
    }
    return;
  }

  let toastId = null;
  try {
    if (typeof showToast === 'function') {
      toastId = showToast('Uploading image...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_URL}/lash-artist/profile/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (res.status === 401) {
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, 'Session expired. Redirecting...', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const result = await res.json();

    if (!res.ok) {
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, result.error || result.message || 'Failed to upload image', 'error');
      }
      return;
    }

    // Update the profile image
    const $profileImage = $('#profileImage');
    if ($profileImage.length && result.image_url) {
      $profileImage.attr('src', result.image_url);
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Profile image updated successfully!', 'success');
    }
  } catch (err) {
    console.error('Error uploading lash artist image:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Failed to upload image. Please try again.', 'error');
    }
  }
}
