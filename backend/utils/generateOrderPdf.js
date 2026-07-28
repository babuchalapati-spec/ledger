const PDFDocument = require('pdfkit');

const COLS = [
  { key: 'item', label: 'Item', width: 210 },
  { key: 'qty', label: 'Qty', width: 60 },
  { key: 'unit', label: 'Unit', width: 90 },
  { key: 'rate', label: 'MRP', width: 65 },
  { key: 'amount', label: 'Amount', width: 65 },
];

const PLAIN_COLS = [
  { key: 'item', label: 'Item', width: 280 },
  { key: 'qty', label: 'Qty', width: 100 },
  { key: 'unit', label: 'Unit', width: 120 },
];

function fmtAmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN');
}

function generateOrderPdf({ order, business, plain }, res) {
  const cols = plain ? PLAIN_COLS : COLS;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const tableWidth = cols.reduce((s, c) => s + c.width, 0);

  if (business && business.businessName) {
    doc.fontSize(16).font('Helvetica-Bold').text(business.businessName, left, 40, { align: 'center', width: tableWidth });
    const subLines = [business.address, business.gstNumber ? `GSTIN: ${business.gstNumber}` : '', business.phone].filter(Boolean);
    if (subLines.length) {
      doc.fontSize(9).font('Helvetica').text(subLines.join('  |  '), left, doc.y + 2, { align: 'center', width: tableWidth });
    }
    doc.moveDown(0.6);
    doc.moveTo(left, doc.y).lineTo(left + tableWidth, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);
  }

  doc.fontSize(18).font('Helvetica-Bold').text(plain ? 'SHOPPING LIST' : 'GROCERY ORDER', left, doc.y, { align: 'center', width: tableWidth });
  doc.moveDown(0.7);
  doc.fontSize(11).font('Helvetica-Bold').text('Order Date: ', left, doc.y, { continued: true }).font('Helvetica').text(fmtDate(order.date));
  if (order.deliveryDate) {
    doc.font('Helvetica-Bold').text('Delivery Date: ', left, doc.y, { continued: true }).font('Helvetica').text(fmtDate(order.deliveryDate));
  }
  doc.font('Helvetica-Bold').text('Ordered For: ', left, doc.y, { continued: true }).font('Helvetica').text(order.orderedFor || '-');
  doc.font('Helvetica-Bold').text('Notes: ', left, doc.y, { continued: true }).font('Helvetica').text(order.notes || '-');
  if (!plain) {
    doc.font('Helvetica-Bold').text('Status: ', left, doc.y, { continued: true }).font('Helvetica').text(order.status);
  }
  doc.moveDown(0.8);

  let y = doc.y;
  const rowHeight = 22;

  function drawRowLines(rowY, height) {
    let x = left;
    doc.moveTo(left, rowY).lineTo(left + tableWidth, rowY).stroke();
    cols.forEach((c) => {
      doc.moveTo(x, rowY).lineTo(x, rowY + height).stroke();
      x += c.width;
    });
    doc.moveTo(x, rowY).lineTo(x, rowY + height).stroke();
  }

  function drawHeaderRow(rowY) {
    doc.font('Helvetica-Bold').fontSize(9);
    let x = left;
    cols.forEach((c) => {
      doc.text(c.label, x + 3, rowY + 6, { width: c.width - 6, align: c.key === 'item' ? 'left' : 'center' });
      x += c.width;
    });
    drawRowLines(rowY, rowHeight);
  }

  function ensureSpace(neededHeight) {
    if (y + neededHeight > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow(y);
      y += rowHeight;
    }
  }

  drawHeaderRow(y);
  y += rowHeight;

  doc.font('Helvetica').fontSize(9);
  order.items.forEach((line) => {
    ensureSpace(rowHeight);
    let x = left;
    const row = {
      // English only: pdfkit can't shape Telugu conjuncts/vowel signs correctly.
      item: line.name,
      qty: String(line.quantity),
      unit: line.unitLabel,
      rate: fmtAmt(line.pricePerUnit),
      amount: fmtAmt(line.lineTotal),
    };
    cols.forEach((c) => {
      doc.text(row[c.key], x + 3, y + 6, {
        width: c.width - 6,
        align: c.key === 'item' ? 'left' : (c.key === 'unit' ? 'center' : 'right'),
      });
      x += c.width;
    });
    drawRowLines(y, rowHeight);
    y += rowHeight;
  });

  if (!plain) {
    ensureSpace(rowHeight);
    doc.font('Helvetica-Bold').fontSize(9);
    let x = left;
    const totalsRow = { item: 'TOTAL', qty: '', unit: '', rate: '', amount: fmtAmt(order.totalAmount) };
    cols.forEach((c) => {
      doc.text(totalsRow[c.key], x + 3, y + 6, {
        width: c.width - 6,
        align: c.key === 'item' ? 'left' : (c.key === 'unit' ? 'center' : 'right'),
      });
      x += c.width;
    });
    drawRowLines(y, rowHeight);
    y += rowHeight + 20;

    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Order Value: Rs. ${fmtAmt(order.totalAmount)}`, left, y);
  }

  doc.end();
}

module.exports = { generateOrderPdf };
