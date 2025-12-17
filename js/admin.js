// admin.js - Admin Panel Functionality (jQuery Version)
// Note: API_URL, redirectToDashboard, TIME_SLOTS, and formatBookingTime are defined in main.js

// ============================================
// ADMIN ACCESS CHECK
// ============================================

async function checkAdminAccess() {
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

    const user = await res.json();
    if (user.user && user.user.user_type !== 'admin') {
      alert('Access denied. Admin privileges required.');
      redirectToDashboard(user.user.user_type);
      return;
    }
  } catch (err) {
    console.error('Admin check error:', err);
    window.location.href = 'login.html';
  }
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

async function loadAdminStats() {
  try {
    const token = localStorage.getItem('authToken');
    
    // Load appointments
    const appointmentsRes = await fetch(`${API_URL}/admin/appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointments = await appointmentsRes.json();
    
    // Load services
    const servicesRes = await fetch(`${API_URL}/admin/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const services = await servicesRes.json();
    
    // Load users
    const usersRes = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await usersRes.json();

    // Update stats
    $('#totalAppointments').text(appointments.length || 0);
    $('#pendingAppointments').text(
      appointments.filter(a => a.status === 'pending').length || 0
    );
    $('#totalServices').text(services.length || 0);
    $('#totalUsers').text(users.length || 0);
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================

async function loadAdminAppointments() {
  const $container = $('#appointmentsContainer');
  
  try {
    const token = localStorage.getItem('authToken');
    const search = $('#searchInput').val() || '';
    const status = $('#statusFilter').val() || '';

    // Show skeleton loading
    if ($container.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('appointmentsContainer', 4, 'card');
    }

    let url = `${API_URL}/admin/appointments`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const appointments = await res.json();
    if (!$container.length) return;

    $container.empty();

    if (appointments.length === 0) {
      $container.html(`
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>No appointments found</p>
        </div>
      `);
      return;
    }

    $.each(appointments, function(i, booking) {
      const $card = $('<div>', { class: 'appointment-card' });
      const statusClass = `status-${booking.status}`;
      
      $card.html(`
        <div class="appointment-card-header">
          <div class="appointment-id">Appointment #${booking.id}</div>
          <span class="badge ${statusClass}">${booking.status}</span>
        </div>
        <div class="appointment-card-body">
          <div class="appointment-info-item">
            <span class="appointment-label">Customer:</span>
            <span class="appointment-value">${booking.user?.name || 'N/A'}</span>
          </div>
          <div class="appointment-info-item">
            <span class="appointment-label">Service:</span>
            <span class="appointment-value">${booking.service?.name || 'N/A'}</span>
          </div>
          <div class="appointment-info-item">
            <span class="appointment-label">Lash Artist:</span>
            <span class="appointment-value">${booking.lash_artist?.name || booking.lashArtist?.name || 'N/A'}</span>
          </div>
          <div class="appointment-info-item">
            <span class="appointment-label">Date:</span>
            <span class="appointment-value">${booking.booking_date || 'N/A'}</span>
          </div>
          <div class="appointment-info-item">
            <span class="appointment-label">Time:</span>
            <span class="appointment-value">${formatBookingTime(booking.booking_time)}</span>
          </div>
        </div>
        ${booking.status === 'pending' ? `
          <div class="appointment-card-footer">
            <button class="action-btn edit-btn" onclick="approveAppointment(${booking.id})">Approve</button>
            <button class="action-btn delete-btn" onclick="declineAppointment(${booking.id})">Decline</button>
          </div>
        ` : ''}
      `);
      $container.append($card);
    });
  } catch (err) {
    console.error('Error loading appointments:', err);
    if ($container.length) {
      $container.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading appointments</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadAdminAppointments()">Retry</button></div>`);
    }
  }
}

async function approveAppointment(id) {
  if (!confirm('Approve this appointment?')) return;

  let toastId = null;
  try {
    // Show loading toast
    if (typeof showToast === 'function') {
      toastId = showToast('Approving appointment...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/appointments/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.json();
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, error.error || 'Failed to approve appointment', 'error');
      }
      return;
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Appointment approved!', 'success');
    }
    loadAdminAppointments();
  } catch (err) {
    console.error('Error approving appointment:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Network error. Please try again.', 'error');
    }
  }
}

async function declineAppointment(id) {
  if (!confirm('Decline this appointment?')) return;

  let toastId = null;
  try {
    // Show loading toast
    if (typeof showToast === 'function') {
      toastId = showToast('Declining appointment...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/appointments/${id}/decline`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.json();
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, error.error || 'Failed to decline appointment', 'error');
      }
      return;
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Appointment declined!', 'success');
    }
    loadAdminAppointments();
  } catch (err) {
    console.error('Error declining appointment:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Network error. Please try again.', 'error');
    }
  }
}

// ============================================
// SERVICES MANAGEMENT
// ============================================

async function loadAdminServices() {
  const $container = $('#servicesContainer');
  
  try {
    const token = localStorage.getItem('authToken');
    const search = $('#searchInput').val() || '';

    // Show skeleton loading
    if ($container.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('servicesContainer', 4, 'card');
    }

    let url = `${API_URL}/admin/services`;
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const services = await res.json();
    if (!$container.length) return;

    $container.empty();

    if (services.length === 0) {
      $container.html(`
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <p>No services found</p>
          <button class="add-btn" onclick="openServiceModal()">Add Your First Service</button>
        </div>
      `);
      return;
    }

    $.each(services, function(i, service) {
      const imageUrl = `${API_URL.replace('/api', '')}/${service.image_path}`;
      const durationDisplay = service.duration ? `${service.duration} min` : 'N/A';
      const $card = $('<div>', { class: 'service-admin-card' });
      $card.html(`
        <div class="service-admin-card-header">
          <div class="service-admin-id">Service #${service.id}</div>
        </div>
        <div class="service-admin-card-body">
          <div class="service-admin-image-container">
            <img src="${imageUrl}" alt="${service.name}" class="service-admin-image" onerror="this.src='http://127.0.0.1:8000/storage/uploads/default.png'">
          </div>
          <div class="service-admin-info">
            <div class="service-admin-info-item">
              <span class="service-admin-label">Name:</span>
              <span class="service-admin-value">${service.name}</span>
            </div>
            <div class="service-admin-info-item">
              <span class="service-admin-label">Description:</span>
              <span class="service-admin-value">${service.description || 'No description'}</span>
            </div>
            <div class="service-admin-info-item">
              <span class="service-admin-label">Price:</span>
              <span class="service-admin-value service-admin-price">₱${parseFloat(service.price).toFixed(2)}</span>
            </div>
            <div class="service-admin-info-item">
              <span class="service-admin-label">Duration:</span>
              <span class="service-admin-value">${durationDisplay}</span>
            </div>
          </div>
        </div>
        <div class="service-admin-card-footer">
          <button class="action-btn edit-btn" onclick="editService(${service.id})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteService(${service.id})">Delete</button>
        </div>
      `);
      $container.append($card);
    });
  } catch (err) {
    console.error('Error loading services:', err);
    if ($container.length) {
      $container.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading services</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadAdminServices()">Retry</button></div>`);
    }
  }
}

function openServiceModal(serviceId = null) {
  const $modal = $('#serviceModal');
  const $form = $('#serviceForm');
  const $title = $('#modalTitle');

  if (serviceId) {
    $title.text('Edit Service');
    loadServiceData(serviceId);
  } else {
    $title.text('Add Service');
    $form[0].reset();
    $('#serviceId').val('');
  }

  $modal.show();
}

function closeServiceModal() {
  $('#serviceModal').hide();
  $('#serviceForm')[0].reset();
}

async function loadServiceData(id) {
  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const services = await res.json();
    const service = services.find(s => s.id == id);

    if (service) {
      $('#serviceId').val(service.id);
      $('#serviceName').val(service.name);
      $('#serviceDescription').val(service.description || '');
      $('#servicePrice').val(service.price);
      $('#serviceDuration').val(service.duration || '');
    }
  } catch (err) {
    console.error('Error loading service:', err);
  }
}

function editService(id) {
  openServiceModal(id);
}

async function handleServiceSubmit(e) {
  e.preventDefault();

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Saving...');
  }

  const formData = new FormData();
  const id = $('#serviceId').val();
  formData.append('name', $('#serviceName').val());
  formData.append('description', $('#serviceDescription').val());
  formData.append('price', $('#servicePrice').val());
  formData.append('duration', $('#serviceDuration').val());

  const imageFile = $('#serviceImage')[0].files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  // For PUT requests with FormData, use POST with _method field (Laravel method spoofing)
  if (id) {
    formData.append('_method', 'PUT');
  }

  try {
    const token = localStorage.getItem('authToken');
    const url = id ? `${API_URL}/admin/services/${id}` : `${API_URL}/admin/services`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const error = await res.json();
      if (typeof showToast === 'function') {
        showToast(error.error || error.message || 'Failed to save service', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast(id ? 'Service updated!' : 'Service created!', 'success');
    }
    closeServiceModal();
    loadAdminServices();
  } catch (err) {
    console.error('Error saving service:', err);
    if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

async function deleteService(id) {
  if (!confirm('Are you sure you want to delete this service?')) return;

  let toastId = null;
  try {
    if (typeof showToast === 'function') {
      toastId = showToast('Deleting service...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.json();
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, error.error || 'Failed to delete service', 'error');
      }
      return;
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Service deleted!', 'success');
    }
    loadAdminServices();
  } catch (err) {
    console.error('Error deleting service:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Network error. Please try again.', 'error');
    }
  }
}

// ============================================
// USERS MANAGEMENT
// ============================================

async function loadAdminUsers() {
  const $container = $('#usersContainer');
  
  try {
    const token = localStorage.getItem('authToken');
    const search = $('#searchInput').val() || '';
    const userType = $('#userTypeFilter').val() || '';

    // Show skeleton loading
    if ($container.length && typeof showSkeletonLoading === 'function') {
      showSkeletonLoading('usersContainer', 4, 'card');
    }

    let url = `${API_URL}/admin/users`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (userType) params.append('user_type', userType);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'warning');
      }
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    const users = await res.json();
    if (!$container.length) return;

    $container.empty();

    if (users.length === 0) {
      $container.html(`
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <p>No users found</p>
          <button class="add-btn" onclick="openUserModal()">Add Your First User</button>
        </div>
      `);
      return;
    }

    $.each(users, function(i, user) {
      const isSuperAdmin = user.id === 1;
      const $card = $('<div>', { class: 'user-card' });
      $card.html(`
        <div class="user-card-header">
          <span class="badge status-${user.user_type}">${user.user_type}${isSuperAdmin ? ' ★' : ''}</span>
        </div>
        <div class="user-card-body">
          <h3 class="user-card-name">${user.name}${isSuperAdmin ? ' <span class="super-admin-badge">Super Admin</span>' : ''}</h3>
          <p class="user-card-username">@${user.username}</p>
          <div class="user-card-details">
            <div class="user-detail-item">
              <span class="user-detail-icon">✉</span>
              <span class="user-detail-text">${user.email}</span>
            </div>
            <div class="user-detail-item">
              <span class="user-detail-icon">#</span>
              <span class="user-detail-text">ID: ${user.id}</span>
            </div>
          </div>
        </div>
        <div class="user-card-footer">
          <button class="action-btn edit-btn" onclick="editUser(${user.id})">Edit</button>
          ${!isSuperAdmin ? `<button class="action-btn delete-btn" onclick="deleteUser(${user.id})">Delete</button>` : ''}
        </div>
      `);
      $container.append($card);
    });
  } catch (err) {
    console.error('Error loading users:', err);
    if ($container.length) {
      $container.html(`<div class="error-state"><div class="error-icon">⚠</div><p>Error loading users</p><p class="error-details">${err.message}</p><button class="btn-primary" onclick="loadAdminUsers()">Retry</button></div>`);
    }
  }
}

function openUserModal(userId = null) {
  const $modal = $('#userModal');
  const $form = $('#userForm');
  const $title = $('#userModalTitle');
  const $passwordInput = $('#userPassword');
  const $passwordHint = $('#passwordHint');

  if (userId) {
    $title.text('Edit User');
    $passwordInput.prop('required', false);
    $passwordHint.show();
    loadUserData(userId);
  } else {
    $title.text('Add User');
    $passwordInput.prop('required', true);
    $passwordHint.hide();
    $form[0].reset();
    $('#userId').val('');
  }

  $modal.show();
}

function closeUserModal() {
  $('#userModal').hide();
  $('#userForm')[0].reset();
}

async function loadUserData(id) {
  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();
    const user = users.find(u => u.id == id);

    if (user) {
      $('#userId').val(user.id);
      $('#userName').val(user.name);
      $('#userUsername').val(user.username);
      $('#userEmail').val(user.email);
      $('#userType').val(user.user_type);
    }
  } catch (err) {
    console.error('Error loading user:', err);
  }
}

function editUser(id) {
  openUserModal(id);
}

async function handleUserSubmit(e) {
  e.preventDefault();

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Saving...');
  }

  const formData = new FormData();
  const id = $('#userId').val();
  formData.append('name', $('#userName').val());
  formData.append('username', $('#userUsername').val());
  formData.append('email', $('#userEmail').val());
  formData.append('user_type', $('#userType').val());

  const password = $('#userPassword').val();
  if (password) {
    formData.append('password', password);
  }

  // For PUT requests with FormData, use POST with _method field (Laravel method spoofing)
  if (id) {
    formData.append('_method', 'PUT');
  }

  try {
    const token = localStorage.getItem('authToken');
    const url = id ? `${API_URL}/admin/users/${id}` : `${API_URL}/admin/users`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const error = await res.json();
      if (typeof showToast === 'function') {
        showToast(error.error || 'Failed to save user', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast(id ? 'User updated!' : 'User created!', 'success');
    }
    closeUserModal();
    loadAdminUsers();
  } catch (err) {
    console.error('Error saving user:', err);
    if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

  let toastId = null;
  try {
    if (typeof showToast === 'function') {
      toastId = showToast('Deleting user...', 'loading', 0);
    }
    
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.json();
      if (toastId && typeof updateToast === 'function') {
        updateToast(toastId, error.error || 'Failed to delete user', 'error');
      }
      return;
    }

    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'User deleted!', 'success');
    }
    loadAdminUsers();
  } catch (err) {
    console.error('Error deleting user:', err);
    if (toastId && typeof updateToast === 'function') {
      updateToast(toastId, 'Network error. Please try again.', 'error');
    }
  }
}

// ============================================
// ADMIN PROFILE
// ============================================

async function loadAdminProfile() {
  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;

    $('#profileName').val(user.name);
    $('#profileUsername').val(user.username);
    $('#profileEmail').val(user.email);
    
    const avatarUrl = user.avatar ? `${API_URL.replace('/api', '')}/${user.avatar}` : 'http://127.0.0.1:8000/storage/uploads/default.png';
    $('#avatarPreview').attr('src', avatarUrl);
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

async function handleAdminProfileUpdate(e) {
  e.preventDefault();

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Saving...');
  }

  const formData = new FormData();
  formData.append('name', $('#profileName').val());
  formData.append('username', $('#profileUsername').val());
  formData.append('email', $('#profileEmail').val());

  const avatarFile = $('#avatarInput')[0].files[0];
  if (avatarFile) {
    formData.append('avatar', avatarFile);
  }

  // For PUT requests with FormData, use POST with _method field (Laravel method spoofing)
  formData.append('_method', 'PUT');

  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/admin/profile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const error = await res.json();
      if (typeof showToast === 'function') {
        showToast(error.error || 'Failed to update profile', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Profile updated successfully!', 'success');
    }
    loadAdminProfile();
  } catch (err) {
    console.error('Error updating profile:', err);
    if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

async function handleAdminPasswordChange(e) {
  e.preventDefault();

  const currentPassword = $('#currentPassword').val();
  const newPassword = $('#newPassword').val();
  const confirmNewPassword = $('#confirmNewPassword').val();

  // Validate passwords match
  if (newPassword !== confirmNewPassword) {
    if (typeof showToast === 'function') {
      showToast('New passwords do not match!', 'error');
    }
    return;
  }

  // Validate minimum length
  if (newPassword.length < 6) {
    if (typeof showToast === 'function') {
      showToast('New password must be at least 6 characters long.', 'error');
    }
    return;
  }

  const $form = $(e.target);
  const $submitBtn = $form.find('button[type="submit"]');
  let buttonState = null;
  
  if (typeof setButtonLoading === 'function') {
    buttonState = setButtonLoading($submitBtn, 'Changing...');
  }

  try {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/users/me/password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldPassword: currentPassword,
        newPassword: newPassword
      })
    });

    if (!res.ok) {
      const error = await res.json();
      if (typeof showToast === 'function') {
        showToast(error.error || 'Failed to change password', 'error');
      }
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Password changed successfully! Redirecting to login...', 'success');
    }
    
    // Show loading for redirect
    if (typeof showPageLoading === 'function') {
      showPageLoading('Signing out...', 'Please log in with your new password');
    }
    
    // Clear token and redirect to login
    setTimeout(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userType');
      window.location.href = 'login.html';
    }, 1500);
  } catch (err) {
    console.error('Error changing password:', err);
    if (typeof showToast === 'function') {
      showToast('Network error. Please try again.', 'error');
    }
  } finally {
    if (typeof resetButtonLoading === 'function' && buttonState) {
      resetButtonLoading($submitBtn, buttonState);
    }
  }
}

// Close modals when clicking outside
$(window).on('click', function(event) {
  const $serviceModal = $('#serviceModal');
  const $userModal = $('#userModal');
  
  if ($(event.target).is($serviceModal)) {
    closeServiceModal();
  }
  if ($(event.target).is($userModal)) {
    closeUserModal();
  }
});
