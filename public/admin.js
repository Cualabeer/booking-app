async function loadBookings() {
  const res = await fetch('/admin/bookings');
  const bookings = await res.json();
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.id}</td><td>${b.name}</td><td>${b.email}</td><td>${b.phone}</td>
      <td>${b.vehicle}</td><td>${b.date}</td><td>${b.time}</td><td>${b.bay}</td>
      <td>${b.garage}</td><td>${b.status}</td>
      <td><button onclick="editBooking(${b.id})">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function editBooking(id) {
  fetch(`/admin/bookings/${id}`)
    .then(res => res.json())
    .then(b => {
      document.getElementById('editId').value = b.id;
      document.getElementById('editName').value = b.name;
      document.getElementById('editEmail').value = b.email;
      document.getElementById('editPhone').value = b.phone;
      document.getElementById('editVehicle').value = b.vehicle;
      document.getElementById('editDate').value = b.date;
      document.getElementById('editTime').value = b.time;
      document.getElementById('editBay').value = b.bay;
      document.getElementById('editGarage').value = b.garage;
      document.getElementById('editStatus').value = b.status;
      document.getElementById('editModal').style.display = 'block';
    });
}

document.getElementById('closeModal').onclick = () => {
  document.getElementById('editModal').style.display = 'none';
};

document.getElementById('editForm').onsubmit = async e => {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const payload = {
    name: document.getElementById('editName').value,
    email: document.getElementById('editEmail').value,
    phone: document.getElementById('editPhone').value,
    vehicle: document.getElementById('editVehicle').value,
    date: document.getElementById('editDate').value,
    time: document.getElementById('editTime').value,
    bay: document.getElementById('editBay').value,
    garage: document.getElementById('editGarage').value,
    status: document.getElementById('editStatus').value
  };
  const res = await fetch(`/admin/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  if(result.success){ loadBookings(); document.getElementById('editModal').style.display = 'none'; }
  else { alert(result.error); }
};

loadBookings();