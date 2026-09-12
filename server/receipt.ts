export function renderReceiptHtml(order: any): string {
  const fmt = (v: any) => (v === null || v === undefined || v === '' ? '0.00' : parseFloat(String(v)).toFixed(2));
  const money = (v: any) => `${fmt(v)} LYD`;
  const dateStr = new Date(order.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = (order.items || []).map((it: any, i: number) => {
    const addOns = (it.addOns || []).map((a: any) =>
      `<div class="addon">+ ${a.nameEn || ''} <span>${money(a.price)}</span></div>`
    ).join('');
    const unitWithAddOns = parseFloat(it.unitPrice || 0) + (it.addOns || []).reduce((s: number, a: any) => s + parseFloat(a.price || 0), 0);
    return `<tr>
      <td>${i + 1}</td>
      <td>${it.productNameEn || it.productNameAr || ''}${addOns ? `<div class="addons">${addOns}</div>` : ''}</td>
      <td class="num">${it.quantity}</td>
      <td class="num">${money(it.unitPrice)}</td>
      <td class="num">${money(unitWithAddOns * it.quantity)}</td>
    </tr>`;
  }).join('');

  const row = (label: string, value: string, strong = false) =>
    `<div class="tr ${strong ? 'strong' : ''}"><span>${label}</span><span>${value}</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt ${order.orderNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter','Segoe UI',Arial,sans-serif; background:#f2f0ec; color:#1B3A2D; padding:24px; }
  .actions { max-width:760px; margin:0 auto 16px; display:flex; gap:10px; }
  .actions button, .actions a { padding:10px 18px; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; }
  .actions button { background:#1B3A2D; color:#fff; }
  .actions a { background:#fff; color:#1B3A2D; border:1px solid #d8d4cc; }
  .receipt { max-width:760px; margin:0 auto; background:#fff; border:1px solid #e4dfd6; border-radius:12px; padding:36px 40px; }
  .header { border-bottom:2px solid #C9A96E; padding-bottom:18px; margin-bottom:22px; }
  .brand { font-family:Georgia,serif; font-size:26px; font-weight:700; color:#1B3A2D; letter-spacing:1px; }
  .brand span { color:#C9A96E; }
  .sub { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8a857c; margin-top:2px; }
  .header h1 { font-size:20px; color:#C9A96E; margin-top:14px; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; margin-top:14px; font-size:13px; color:#555; }
  .meta strong { color:#1B3A2D; }
  .parties { display:flex; gap:24px; margin-bottom:20px; }
  .block { flex:1; background:#F8F6F3; border-radius:8px; padding:14px 16px; font-size:13px; line-height:1.6; }
  .block h3 { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8a857c; margin-bottom:6px; }
  .message { background:#FBF6EA; border-left:3px solid #C9A96E; padding:10px 14px; font-size:13px; margin-bottom:20px; border-radius:4px; }
  table.items { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px; }
  table.items th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8a857c; border-bottom:1px solid #e4dfd6; padding:8px 10px; }
  table.items td { padding:10px; border-bottom:1px solid #f0ede7; vertical-align:top; }
  table.items .num { text-align:right; white-space:nowrap; }
  .addons { margin-top:4px; font-size:12px; color:#6b7c74; }
  .addon span { float:right; }
  .totals { margin-left:auto; width:280px; border-top:2px solid #C9A96E; padding-top:12px; }
  .tr { display:flex; justify-content:space-between; font-size:13px; padding:4px 0; color:#555; }
  .tr.strong { font-size:16px; font-weight:700; color:#1B3A2D; border-top:1px solid #e4dfd6; margin-top:6px; padding-top:10px; }
  .footer { margin-top:26px; padding-top:14px; border-top:1px dashed #d8d4cc; font-size:11px; color:#8a857c; text-align:center; }
  @media print {
    body { background:#fff; padding:0; }
    .actions { display:none; }
    .receipt { border:none; box-shadow:none; padding:0; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
    <a href="javascript:history.back()">Back</a>
  </div>
  <div class="receipt">
    <div class="header">
      <div class="brand">NYLUVER<span>.</span></div>
      <div class="sub">Luxury Gifts & Flowers</div>
      <h1>Tax Receipt</h1>
      <div class="meta">
        <div>Receipt No: <strong>${order.orderNumber}</strong></div>
        <div>Date: <strong>${dateStr}</strong></div>
        <div>Payment: <strong>${(order.paymentMethod || '').replace(/_/g, ' ')}</strong></div>
        <div>Status: <strong>${(order.status || '').replace(/_/g, ' ')}</strong></div>
      </div>
    </div>
    <div class="parties">
      <div class="block">
        <h3>Sold To (Sender)</h3>
        <div>${order.sender?.nameEn || '—'}</div>
        <div>${order.sender?.phone || ''}</div>
      </div>
      <div class="block">
        <h3>Deliver To (Recipient)</h3>
        <div>${order.recipientName || ''}</div>
        <div>${order.recipientPhone || ''}</div>
        ${order.address ? `<div>${order.address}</div>` : ''}
        ${order.slotDate ? `<div>Delivery: ${order.slotDate}${order.slotTime ? ' ' + order.slotTime : ''}</div>` : ''}
      </div>
    </div>
    ${order.cardMessage ? `<div class="message"><strong>Card message:</strong> ${order.cardMessage}</div>` : ''}
    <table class="items">
      <thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      ${row('Subtotal', money(order.subtotal))}
      ${parseFloat(order.deliveryFee || 0) > 0 ? row('Delivery Fee', money(order.deliveryFee)) : ''}
      ${parseFloat(order.expressFee || 0) > 0 ? row('Express Fee', money(order.expressFee)) : ''}
      ${parseFloat(order.discount || 0) > 0 ? row('Discount', '-' + money(order.discount)) : ''}
      ${parseFloat(order.vatAmount || 0) > 0 ? row('VAT', money(order.vatAmount)) : ''}
      ${row('Total', money(order.total), true)}
      ${order.totalUSD ? `<div class="tr"><span>Total (USD)</span><span>${fmt(order.totalUSD)} USD</span></div>` : ''}
    </div>
    <div class="footer">Thank you for choosing Nyluver. This receipt is issued for tax and record-keeping purposes.</div>
  </div>
</body>
</html>`;
}
