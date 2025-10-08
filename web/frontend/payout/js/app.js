const API = "http://localhost:3000/api";
let currentPaymentId = null;

// Load danh sách thanh toán
async function loadPayments() {
  const res = await fetch(`${API}/payments`);
  const data = await res.json();

  const tbody = document.querySelector("#paymentTable tbody");
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.payment_id}</td>
      <td>${p.user_name}</td>
      <td>${p.tour_name}</td>
      <td>${Number(p.amount).toLocaleString("vi-VN")}đ</td>
      <td>${p.method}</td>
      <td><span class="status-${p.status}">
        ${p.status === "paid" ? "✅ Đã thanh toán" : "💳 Chưa thanh toán"}
      </span></td>
      <td>
        ${p.status === "unpaid" 
          ? `
            <button class="btn btn-primary" onclick="openModal('${p.payment_id}','${p.user_name}','${p.tour_name}',${p.amount})">
              <i class="fas fa-qrcode"></i> Thanh toán
            </button>
            <button class="btn btn-warning" onclick="currentPaymentId='${p.payment_id}';editInvoice();">
              <i class="fas fa-edit"></i> Sửa
            </button>
            <button class="btn btn-danger" onclick="currentPaymentId='${p.payment_id}';deleteInvoice();">
              <i class="fas fa-trash"></i> Xóa
            </button>
          `
          : `
            <button class="btn btn-success" onclick="showInvoice('${p.payment_id}')">
              <i class="fas fa-file-invoice"></i> Xem hóa đơn
            </button>
          `}
      </td>
    </tr>
  `).join("");
}

// Mở modal QR
function openModal(paymentId, user, tour, amount) {
  currentPaymentId = paymentId;
  document.getElementById("mCustomer").textContent = user;
  document.getElementById("mTour").textContent = tour;
  document.getElementById("mAmount").textContent = amount.toLocaleString("vi-VN")+"đ";
  document.getElementById("qrImg").src =
    `https://img.vietqr.io/image/970436-9392723042-qr_only.png?amount=${amount}&addInfo=ThanhToan_${paymentId}`;
  document.getElementById("payStatus").textContent="⏳ Đang chờ thanh toán...";
  document.getElementById("payStatus").className="status-box pending";
  document.getElementById("paymentModal").classList.add("open");
}

function closeModal(){
  document.getElementById("paymentModal").classList.remove("open");
}

// Xác nhận thanh toán
async function confirmPayment(){
  if(!currentPaymentId) return;
  const res = await fetch(`${API}/payments/${currentPaymentId}/confirm`, { method:"PATCH" });
  if(res.ok){
    document.getElementById("payStatus").textContent="✅ Thanh toán thành công!";
    document.getElementById("payStatus").className="status-box paid";
    loadPayments();
    closeModal();
    showInvoice(currentPaymentId);
  }
}

// Đóng hóa đơn
function closeInvoice(){
  document.getElementById("invoiceModal").classList.remove("open");
}

// Xem hóa đơn
async function showInvoice(paymentId){
  const res = await fetch(`${API}/payments/${paymentId}/invoice`);
  const data = await res.json();
  if(res.ok){
    document.getElementById("invoiceBox").innerHTML = `
      <p><b>Mã thanh toán:</b> ${data.payment_id}</p>
      <p><b>Khách hàng:</b> ${data.customer_name} (${data.email}, ${data.phone_number})</p>
      <p><b>Tour:</b> ${data.tour_name} (${data.start_date} → ${data.end_date})</p>
      <p><b>Nhà cung cấp:</b> ${data.provider_name} (${data.provider_email}, ${data.provider_phone})</p>
      <p><b>Số tiền:</b> ${Number(data.amount).toLocaleString("vi-VN")}đ</p>
      <p><b>Phương thức:</b> ${data.method}</p>
      <p><b>Trạng thái:</b> ${data.status === "paid" ? "✅ Đã thanh toán" : "❌ Chưa thanh toán"}</p>
      <p><b>Ngày tạo đơn:</b> ${new Date(data.created_at).toLocaleString("vi-VN")}</p>
      <p><b>Ngày thanh toán:</b> ${data.confirmed_at ? new Date(data.confirmed_at).toLocaleString("vi-VN") : "Chưa thanh toán"}</p>
    `;
    currentPaymentId = paymentId;
    document.getElementById("invoiceModal").classList.add("open");
  }
}

// Sửa hóa đơn
async function editInvoice(){
  const newMethod = prompt("Nhập phương thức mới (cash, card, online):");
  if(!newMethod) return;
  const newAmount = prompt("Nhập số tiền mới:", "0");
  const res = await fetch(`${API}/payments/${currentPaymentId}`, {
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ method: newMethod, amount: newAmount })
  });
  if(res.ok){
    alert("✅ Sửa hóa đơn thành công");
    loadPayments();
  } else {
    const err = await res.json();
    alert("❌ Không thể sửa: " + err.error);
  }
}

// Xóa hóa đơn
async function deleteInvoice(){
  if(!confirm("Bạn có chắc muốn xóa hóa đơn này?")) return;
  const res = await fetch(`${API}/payments/${currentPaymentId}`, { method:"DELETE" });
  if(res.ok){
    alert("✅ Xóa hóa đơn thành công");
    closeInvoice();
    loadPayments();
  } else {
    const err = await res.json();
    alert("❌ Không thể xóa: " + err.error);
  }
}

window.onload = loadPayments;
