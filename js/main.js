// main.js - Lash Studio Booking System (jQuery Version)

const API_URL = 'http://127.0.0.1:8000/api';

// Time slot mapping: start time -> display format
const TIME_SLOTS = {
  '08:00': '8:00am-10:00am',
  '10:00': '10:00am-12:00pm',
  '13:00': '1:00pm-3:00pm',
  '15:00': '3:00pm-5:00pm',
  '17:00': '5:00pm-7:00pm'
};

// Format booking time for display
function formatBookingTime(time) {
  if (!time) return 'N/A';
  
  // Extract time part (HH:MM format)
  const timeStr = time.substring(0, 5);
  
  // Return formatted range if available, otherwise return the time as-is
  return TIME_SLOTS[timeStr] || timeStr;
}

// Redirect to appropriate dashboard based on user type
function redirectToDashboard(userType = null) {
  // If userType not provided, try to get it from localStorage or fetch
  if (!userType) {
    userType = localStorage.getItem("userType") || 'user';
  }
  
  switch(userType) {
    case 'admin':
      window.location.href = "admin-dashboard.html";
      break;
    case 'artist':
      window.location.href = "lash-artist-dashboard.html";
      break;
    case 'user':
    default:
      window.location.href = "dashboard.html";
      break;
  }
}

// Helper function to show error modal popup
function showErrorModal(message, errors = null) {
  console.log('showErrorModal called with:', message, errors);
  
  const $modal = $('#errorModal');
  const $messageEl = $('#errorModalMessage');
  const $listEl = $('#errorModalList');
  const $closeBtn = $('.error-modal-close');
  const $okBtn = $('#errorModalOk');

  console.log('Modal elements found:', {
    modal: $modal.length > 0,
    messageEl: $messageEl.length > 0,
    listEl: $listEl.length > 0,
    closeBtn: $closeBtn.length > 0,
    okBtn: $okBtn.length > 0
  });

  if (!$modal.length) {
    console.error('Error modal not found in DOM');
    // Fallback to alert if modal doesn't exist
    alert(message || 'An error occurred');
    return;
  }

  if (!$messageEl.length) {
    console.error('Error modal message element not found');
    alert(message || 'An error occurred');
    return;
  }

  // Set main message
  $messageEl.text(message || 'An error occurred. Please try again.');

  // Clear and populate error list if there are field-specific errors
  if ($listEl.length) {
    $listEl.empty();
    if (errors && typeof errors === 'object') {
      $.each(errors, function(field, messages) {
        const errorMessages = Array.isArray(messages) ? messages : [messages];
        $.each(errorMessages, function(i, msg) {
          // Capitalize field name and format the message
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          $('<li>').text(`${fieldName}: ${msg}`).appendTo($listEl);
        });
      });
    }
  }

  // Show modal - force display with inline styles to override CSS
  $modal.css({
    'display': 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'left': '0',
    'top': '0',
    'width': '100%',
    'height': '100%',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    'z-index': '10000',
    'position': 'fixed'
  }).addClass('show');
  
  console.log('Modal should now be visible. Display:', $modal.css('display'), 'Z-index:', $modal.css('z-index'));

  // Close handlers
  const closeModal = () => {
    $modal.removeClass('show').hide();
  };

  $closeBtn.off('click').on('click', closeModal);
  $okBtn.off('click').on('click', closeModal);

  // Close on outside click
  $modal.off('click').on('click', function(e) {
    if ($(e.target).is($modal)) {
      closeModal();
    }
  });

  // Close on Escape key
  $(document).off('keydown.errorModal').on('keydown.errorModal', function(e) {
    if (e.key === 'Escape' && $modal.hasClass('show')) {
      closeModal();
      $(document).off('keydown.errorModal');
    }
  });
}

$(document).ready(function() {
  const $registerForm = $('#registerForm');

  if ($registerForm.length) {
    $registerForm.on('submit', async function(e) {
      e.preventDefault();

      const $submitButton = $registerForm.find('button[type="submit"]');
      const originalText = $submitButton.text();
      
      $submitButton.prop('disabled', true).text('Registering...');

      const formData = new FormData(this);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const text = await res.text();
          console.log('Error response text:', text); // Debug log
          try {
            const result = JSON.parse(text);
            console.log('Parsed error result:', result); // Debug log
            
            // Show error modal with validation errors
            const errorMessage = result.message || result.error || "Registration failed. Please check your input.";
            
            // Wait a tiny bit to ensure DOM is ready, then show modal
            requestAnimationFrame(() => {
              showErrorModal(errorMessage, result.errors || null);
            });
            
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError, 'Text was:', text);
            showErrorModal("Registration failed. Server returned unexpected response.");
          }
          return;
        }

        const result = await res.json();

        // Redirect to verification page with email
        window.location.href = `verify-email.html?email=${encodeURIComponent(formData.get('email'))}`;
      } catch (err) {
        console.error("Fetch error:", err);
        showErrorModal("Network error. Please check your connection and try again.");
      } finally {
        $submitButton.prop('disabled', false).text(originalText);
      }
    });
  }
});

// Loading overlay functions for logout
function createLogoutOverlay() {
  if ($('#logoutOverlay').length) return;
  
  const $overlay = $('<div>', {
    id: 'logoutOverlay',
    class: 'loading-overlay'
  }).html(`
    <div class="loading-spinner"></div>
    <div class="loading-text">Signing you out...</div>
    <div class="loading-subtext">See you soon!</div>
    <div class="loading-progress">
      <div class="loading-progress-bar" id="logoutProgressBar"></div>
    </div>
  `);
  
  $('body').append($overlay);
}

function showLogoutLoading() {
  createLogoutOverlay();
  const $overlay = $('#logoutOverlay');
  const $progressBar = $('#logoutProgressBar');
  
  if ($overlay.length) {
    $overlay.addClass('active');
    if ($progressBar.length) {
      $progressBar.css('width', '0%');
      setTimeout(() => $progressBar.css('width', '40%'), 100);
      setTimeout(() => $progressBar.css('width', '70%'), 400);
    }
  }
}

function hideLogoutLoading() {
  const $overlay = $('#logoutOverlay');
  if ($overlay.length) {
    $overlay.removeClass('active');
  }
}

function completeLogoutLoading(callback) {
  const $progressBar = $('#logoutProgressBar');
  if ($progressBar.length) {
    $progressBar.css('width', '100%');
  }
  setTimeout(callback, 400);
}

// Logout Handler
$(document).ready(function() {
  $('#logoutBtn').on('click', async function() {
    await logout();
  });
});

async function logout() {
  const token = localStorage.getItem("authToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Show loading screen
  showLogoutLoading();

  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userType");
      completeLogoutLoading(() => {
        window.location.href = "login.html";
      });
      return;
    }

    if (!res.ok) {
      hideLogoutLoading();
      const text = await res.text();
      console.error('Logout response text:', text);
      try {
        const data = JSON.parse(text);
        alert(data.error || "Logout failed.");
      } catch {
        alert("Logout failed. Server returned unexpected response.");
      }
      return;
    }

    const data = await res.json();
    console.log("Logout response:", data);

    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    
    completeLogoutLoading(() => {
      window.location.href = "login.html";
    });
  } catch (err) {
    console.error("Network error during logout:", err);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    completeLogoutLoading(() => {
      window.location.href = "login.html";
    });
  }
}

// Load My Bookings
async function loadMyBookings() {
  const $container = $('#bookingsContainer');
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // Show skeleton loading
    if ($container.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('bookingsContainer', 3, 'card');
    }

    const statusFilter = $('#statusFilter').val() || '';
    let url = `${API_URL}/bookings/my`;
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const bookings = await res.json();

    if (!$container.length) return;
    
    $container.empty();
    
    if (bookings.length === 0) {
      $container.html('<div class="empty-state"><p>No bookings found. Book your first appointment!</p><button class="add-btn" onclick="window.location.href=\'book-appointment.html\'">Book Appointment</button></div>');
      return;
    }
    
    $.each(bookings, function(i, booking) {
      const statusClass = `status-${booking.status}`;
      const $card = $('<div>', { class: 'booking-card' });
      $card.html(`
        <div class="booking-card-header">
          <div class="booking-id">#${booking.id}</div>
          <span class="badge ${statusClass}">${booking.status}</span>
        </div>
        <div class="booking-card-body">
          <div class="booking-info-item">
            <span class="booking-label">Service:</span>
            <span class="booking-value">${booking.service?.name || 'N/A'}</span>
          </div>
          <div class="booking-info-item">
            <span class="booking-label">Lash Artist:</span>
            <span class="booking-value">${booking.lash_artist?.name || booking.lashArtist?.name || 'N/A'}</span>
          </div>
          <div class="booking-info-item">
            <span class="booking-label">Date:</span>
            <span class="booking-value">${booking.booking_date || 'N/A'}</span>
          </div>
          <div class="booking-info-item">
            <span class="booking-label">Time:</span>
            <span class="booking-value">${formatBookingTime(booking.booking_time)}</span>
          </div>
        </div>
        ${booking.status === 'pending' ? 
          `<div class="booking-card-footer">
            <button class="delete-btn" data-id="${booking.id}">Cancel Booking</button>
          </div>` :
          ''
        }
      `);
      $container.append($card);
    });
  } catch (err) {
    console.error('Error loading bookings:', err);
    if ($container.length) {
      $container.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading bookings</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadMyBookings()">Retry</button></div>`);
    }
  }
}

// Load Services
async function loadServices() {
  const $servicesGrid = $('#servicesGrid');
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // Show skeleton loading
    if ($servicesGrid.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('servicesGrid', 6, 'card');
    }

    const searchTerm = $('#searchInput').val() || '';
    let url = `${API_URL}/services`;
    if (searchTerm) {
      url += `?search=${encodeURIComponent(searchTerm)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const services = await res.json();

    if (!$servicesGrid.length) return;

    $servicesGrid.empty();

    if (services.length === 0) {
      $servicesGrid.html('<div class="empty-state"><p>No services found.</p></div>');
      return;
    }

    $.each(services, function(i, service) {
      const imageUrl = `${API_URL.replace('/api', '')}/${service.image_path}`;
      const durationDisplay = service.duration ? `${service.duration} min` : 'N/A';
      const $card = $('<div>', { class: 'service-card' });
      $card.html(`
        <img src="${imageUrl}" alt="${service.name}" onerror="this.src='http://127.0.0.1:8000/storage/uploads/default.png'">
        <div class="service-info">
          <h3>${service.name}</h3>
          <p class="service-description">${service.description || 'Professional service'}</p>
          <div class="service-details">
            <span class="service-price">₱${parseFloat(service.price).toFixed(2)}</span>
            <span class="service-duration">${durationDisplay}</span>
          </div>
        </div>
      `);
      $servicesGrid.append($card);
    });
  } catch (err) {
    console.error('Error loading services:', err);
    if ($servicesGrid.length) {
      $servicesGrid.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading services</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadServices()">Retry</button></div>`);
    }
  }
}

// Load Lash Artists
async function loadLashArtists() {
  const $lashArtistsGrid = $('#lashArtistsGrid, #barbersGrid');
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // Show skeleton loading
    if ($lashArtistsGrid.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading($lashArtistsGrid.attr('id'), 4, 'card');
    }

    const searchTerm = $('#searchInput').val() || '';
    let url = `${API_URL}/lash-artists`;
    if (searchTerm) {
      url += `?search=${encodeURIComponent(searchTerm)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to load lash artists (Status: ${res.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If not JSON, use the text
      }
      
      if ($lashArtistsGrid.length) {
        $lashArtistsGrid.html(`<div class="error-state"><div class="error-icon">⚠</div><p>${errorMessage}</p><button class="btn-primary" onclick="loadLashArtists()">Retry</button></div>`);
      }
      throw new Error(errorMessage);
    }

    const lashArtists = await res.json();

    if (!$lashArtistsGrid.length) {
      console.error('lashArtistsGrid element not found');
      return;
    }

    $lashArtistsGrid.empty();

    if (!Array.isArray(lashArtists)) {
      console.error('Invalid response format:', lashArtists);
      $lashArtistsGrid.html('<div class="error-state"><div class="error-icon">⚠</div><p>Invalid response from server</p></div>');
      return;
    }

    if (lashArtists.length === 0) {
      $lashArtistsGrid.html('<div class="empty-state"><p>No lash artists found.</p></div>');
      return;
    }

    $.each(lashArtists, function(i, artist) {
      // Handle both specialty and specialization fields
      const specialty = artist.specialty || artist.specialization || 'Expert Lash Artist';
      // Use image_url if provided, otherwise construct from image_path or use default
      const imageUrl = artist.image_url || 
        (artist.image_path ? `${API_URL.replace('/api', '')}/storage/${artist.image_path}` : null) ||
        'http://127.0.0.1:8000/storage/uploads/profile.png';
      
      const $card = $('<div>', { class: 'barber-card lash-artist-card' });
      $card.html(`
        <img src="${imageUrl}" alt="${artist.name || 'Lash Artist'}" onerror="this.src='http://127.0.0.1:8000/storage/uploads/profile.png'">
        <div class="barber-info">
          <h3>${artist.name || 'Unknown Lash Artist'}</h3>
          <p class="barber-specialty">${specialty}</p>
          <p class="barber-bio">${artist.bio || ''}</p>
          ${artist.phone ? `<p class="barber-phone">📞 ${artist.phone}</p>` : ''}
        </div>
      `);
      $lashArtistsGrid.append($card);
    });
  } catch (err) {
    console.error('Error loading lash artists:', err);
    if ($lashArtistsGrid.length) {
      $lashArtistsGrid.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading lash artists</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadLashArtists()">Retry</button></div>`);
    }
  }
}

// Alias for backward compatibility
async function loadBarbers() {
  return loadLashArtists();
}

// Load Service Options (for booking form)
async function loadServiceOptions() {
  const $serviceSelect = $('#service');
  
  try {
    const token = localStorage.getItem('authToken');
    
    // Show loading state in select
    if ($serviceSelect.length) {
      $serviceSelect.html('<option value="">Loading services...</option>').prop('disabled', true);
    }
    
    const res = await fetch(`${API_URL}/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load services');

    const services = await res.json();

    if ($serviceSelect.length) {
      $serviceSelect.html('<option value="">Select a service...</option>').prop('disabled', false);
      
      $.each(services, function(i, service) {
        const durationDisplay = service.duration ? `${service.duration} min` : 'N/A';
        const $option = $('<option>', {
          value: service.id,
          text: `${service.name} - ₱${parseFloat(service.price).toFixed(2)} (${durationDisplay})`,
          'data-price': service.price,
          'data-duration': service.duration || ''
        });
        $serviceSelect.append($option);
      });

      // Show service info on selection
      $serviceSelect.off('change').on('change', function() {
        const $selectedOption = $(this).find('option:selected');
        const $serviceInfo = $('#serviceInfo');
        if ($selectedOption.val()) {
          const durationDisplay = $selectedOption.data('duration') ? `${$selectedOption.data('duration')} min` : 'N/A';
          $serviceInfo.html(`<strong>Price:</strong> ₱${$selectedOption.data('price')} | <strong>Duration:</strong> ${durationDisplay}`);
        } else {
          $serviceInfo.html('');
        }
      });
    }
  } catch (err) {
    console.error('Error loading services:', err);
    if ($serviceSelect.length) {
      $serviceSelect.html('<option value="">Error loading services</option>').prop('disabled', false);
    }
    if (typeof showToast === 'function') {
      showToast('Failed to load services', 'error');
    }
  }
}

// Load Lash Artist Options (for booking form)
async function loadLashArtistOptions() {
  const $lashArtistSelect = $('#lash_artist, #barber');
  
  try {
    const token = localStorage.getItem('authToken');
    
    // Show loading state in select
    if ($lashArtistSelect.length) {
      $lashArtistSelect.html('<option value="">Loading lash artists...</option>').prop('disabled', true);
    }
    
    const res = await fetch(`${API_URL}/lash-artists`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load lash artists');

    const lashArtists = await res.json();
    
    if ($lashArtistSelect.length) {
      $lashArtistSelect.html('<option value="">Select a lash artist...</option>').prop('disabled', false);

      $.each(lashArtists, function(i, artist) {
        const $option = $('<option>', {
          // Use lash_artist_id for bookings if available
          // Otherwise use user id
          value: artist.lash_artist_id || artist.id,
          text: artist.name + (artist.specialty ? ` - ${artist.specialty}` : '')
        });
        $lashArtistSelect.append($option);
      });

      // Show lash artist info on selection
      $lashArtistSelect.off('change').on('change', function() {
        const $selectedOption = $(this).find('option:selected');
        const $artistInfo = $('#lashArtistInfo, #barberInfo');
        if ($selectedOption.val()) {
          // Find artist by lash_artist_id or id
          const artist = lashArtists.find(a => (a.lash_artist_id && a.lash_artist_id == $selectedOption.val()) || a.id == $selectedOption.val());
          $artistInfo.html(artist && artist.bio ? `<em>${artist.bio}</em>` : '');
        } else {
          $artistInfo.html('');
        }
      });
    }
  } catch (err) {
    console.error('Error loading lash artists:', err);
    if ($lashArtistSelect.length) {
      $lashArtistSelect.html('<option value="">Error loading lash artists</option>').prop('disabled', false);
    }
    if (typeof showToast === 'function') {
      showToast('Failed to load lash artists', 'error');
    }
  }
}

// Alias for backward compatibility
async function loadBarberOptions() {
  return loadLashArtistOptions();
}

// Load Available Time Slots
async function loadAvailableSlots() {
  const lashArtistId = $('#lash_artist, #barber').val();
  const date = $('#booking_date').val();
  const $timeSelect = $('#booking_time');

  if (!lashArtistId || !date) {
    $timeSelect.prop('disabled', true).html('<option value="">Select date and lash artist first...</option>');
    return;
  }

  try {
    // Show loading state
    $timeSelect.html('<option value="">Loading available slots...</option>').prop('disabled', true);
    
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/available-slots?lash_artist_id=${lashArtistId}&date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      // Show detailed validation errors if available
      let errorMsg = data.error || data.message || 'Failed to load time slots';
      
      if (data.errors) {
        const errorDetails = Object.values(data.errors).flat().join(', ');
        if (errorDetails) {
          errorMsg = errorDetails;
        }
      }
      
      console.error('API Error:', errorMsg, data);
      throw new Error(errorMsg);
    }

    const slots = data.available_slots;

    $timeSelect.html('<option value="">Choose a time...</option>');

    if (slots.length === 0) {
      $timeSelect.html('<option value="">No available slots for this date</option>').prop('disabled', true);
      if (typeof showToast === 'function') {
        showToast('No available slots for this date', 'info');
      }
      return;
    }

    $.each(slots, function(i, slot) {
      let $option;
      // Handle both new format (object with value/display) and old format (string)
      if (typeof slot === 'object' && slot.value && slot.display) {
        $option = $('<option>', {
          value: slot.value, // Store start time (e.g., "08:00")
          text: slot.display // Display range (e.g., "8:00am-10:00am")
        });
      } else {
        // Fallback for old format
        $option = $('<option>', {
          value: slot,
          text: slot
        });
      }
      $timeSelect.append($option);
    });

    $timeSelect.prop('disabled', false);
  } catch (err) {
    console.error('Error loading time slots:', err);
    $timeSelect.html('<option value="">Error loading slots</option>').prop('disabled', true);
    if (typeof showToast === 'function') {
      showToast('Failed to load time slots', 'error');
    }
  }
}

// Handle Booking Form Submission
async function handleBookingSubmit(e) {
  e.preventDefault();

  const $form = $(e.target);
  const $submitButton = $form.find('button[type="submit"]');
  let buttonState = null;

  // Use progress indicator for button
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitButton, 'Booking...');
  } else {
    $submitButton.prop('disabled', true).text('Booking...');
  }

  const formData = {
    service_id: $('#service').val(),
    lash_artist_id: $('#lash_artist, #barber').val(),
    booking_date: $('#booking_date').val(),
    booking_time: $('#booking_time').val(),
    notes: $('#notes').val()
  };

  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    if (!res.ok) {
      const error = await res.json();
      if (typeof showToast === 'function') {
        showToast(error.error || 'Failed to book appointment', 'error');
      } else {
        alert(error.error || 'Failed to book appointment');
      }
      return;
    }

    const result = await res.json();
    
    if (typeof showToast === 'function') {
      showToast('Appointment booked successfully!', 'success');
    }
    
    // Show page loading for redirect
    if (typeof showPageLoading === 'function') {
      showPageLoading('Redirecting...', 'Taking you to your dashboard');
    }
    
    setTimeout(() => {
      redirectToDashboard(); // Redirect to appropriate dashboard based on user type
    }, 1000);
    
  } catch (err) {
    console.error('Booking error:', err);
    if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    } else {
      alert('Network error. Please try again.');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitButton, buttonState);
    } else {
      $submitButton.prop('disabled', false).text('Book Appointment');
    }
  }
}

// Handle Delete/Cancel buttons
$(document).on('click', '.delete-btn', function() {
  const id = $(this).data('id');
  if (confirm('Are you sure you want to cancel this booking?')) {
    cancelBooking(id);
  }
});

// Cancel booking function
async function cancelBooking(id) {
  let toastId = null;
  
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // Show loading toast
    if (typeof showToast === 'function') {
      toastId = showToast('Cancelling booking...', 'loading', 0);
    }

    const res = await fetch(`${API_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, 'Session expired. Redirecting...', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }
    
    if (!res.ok) {
      const error = await res.json();
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, error.error || 'Failed to cancel booking', 'error');
      } else if (typeof showToast === 'function') {
        showToast(error.error || 'Failed to cancel booking', 'error');
      } else {
        alert(error.error || 'Failed to cancel booking');
      }
      return;
    }
    
    // Show success
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Booking cancelled successfully!', 'success');
    } else if (typeof showToast === 'function') {
      showToast('Booking cancelled successfully!', 'success');
    }
    
    loadMyBookings();
  } catch (err) {
    console.error('Cancel error:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Network error. Please try again.', 'error');
    } else if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    } else {
      alert('Network error. Please try again.');
    }
  }
}
