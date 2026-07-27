
const PDFDocument = require('pdfkit');

const COLS = [
  { key: 'date', label: 'Date', width: 70 },
  { key: 'particulars', label: 'Particulars', width: 165 },
  { key: 'billNumber', label: 'Bill No.', width: 65 },
  { key: 'debit', label: 'Payment (Dr)', width: 85 },
  { key: 'credit', label: 'Bill (Cr)', width: 85 },
  { key: 'balance', label: 'Balance', width: 85 },
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN');
}

function fmtAmt(n) {
  return n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function generateLedgerPdf({ customer, entries, openingBalance, totalBills, totalPayments, balance, business }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const tableWidth = COLS.reduce((s, c) => s + c.width, 0);

  // Business letterhead
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

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('LEDGER STATEMENT', left, doc.y, { align: 'center', width: tableWidth });
  doc.moveDown(0.7);
  doc.fontSize(11).font('Helvetica-Bold').text(`Customer: `, left, doc.y, { continued: true }).font('Helvetica').text(customer.name);
  doc.font('Helvetica-Bold').text('Address: ', left, doc.y, { continued: true }).font('Helvetica').text(customer.address || '-');
  doc.font('Helvetica-Bold').text('GST Number: ', left, doc.y, { continued: true }).font('Helvetica').text(customer.gstNumber || '-');
  doc.font('Helvetica-Bold').text('Statement Date: ', left, doc.y, { continued: true }).font('Helvetica').text(new Date().toLocaleDateString('en-IN'));
  doc.moveDown(0.8);

  let y = doc.y;
  const rowHeight = 22;

  function drawRowLines(rowY, height) {
    let x = left;
    doc.moveTo(left, rowY).lineTo(left + tableWidth, rowY).stroke();
    COLS.forEach((c) => {
      doc.moveTo(x, rowY).lineTo(x, rowY + height).stroke();
      x += c.width;
    });
    doc.moveTo(x, rowY).lineTo(x, rowY + height).stroke();
  }

  function drawHeaderRow(rowY) {
    doc.font('Helvetica-Bold').fontSize(9);
    let x = left;
    COLS.forEach((c) => {
      doc.text(c.label, x + 3, rowY + 6, { width: c.width - 6, align: c.key === 'particulars' ? 'left' : 'center' });
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

  if (openingBalance) {
    ensureSpace(rowHeight);
    doc.font('Helvetica-Oblique').fontSize(9);
    let x = left;
    const openingRow = {
      date: '',
      particulars: 'Opening Balance',
      billNumber: '',
      debit: openingBalance < 0 ? fmtAmt(Math.abs(openingBalance)) : '',
      credit: openingBalance > 0 ? fmtAmt(openingBalance) : '',
      balance: fmtAmt(openingBalance),
    };
    COLS.forEach((c) => {
      doc.text(openingRow[c.key], x + 3, y + 6, {
        width: c.width - 6,
        align: c.key === 'particulars' ? 'left' : (c.key === 'date' ? 'center' : 'right'),
      });
      x += c.width;
    });
    drawRowLines(y, rowHeight);
    y += rowHeight;
  }

  doc.font('Helvetica').fontSize(9);
  entries.forEach((e) => {
    ensureSpace(rowHeight);
    const particulars = e.description || (e.type === 'bill' ? 'Purchase / Bill' : `Payment${e.paymentMode ? ' - ' + e.paymentMode : ''}`);
    let x = left;
    const row = {
      date: fmtDate(e.date),
      particulars,
      billNumber: e.billNumber || '-',
      debit: e.type === 'payment' ? fmtAmt(e.amount) : '',
      credit: e.type === 'bill' ? fmtAmt(e.amount) : '',
      balance: fmtAmt(e.runningBalance),
    };
    COLS.forEach((c) => {
      doc.text(row[c.key], x + 3, y + 6, {
        width: c.width - 6,
        align: c.key === 'particulars' ? 'left' : (c.key === 'date' ? 'center' : 'right'),
      });
      x += c.width;
    });
    drawRowLines(y, rowHeight);
    y += rowHeight;
  });

  // Totals row
  ensureSpace(rowHeight * 2);
  doc.font('Helvetica-Bold').fontSize(9);
  let x = left;
  const totalsRow = {
    date: '',
    particulars: 'TOTAL',
    billNumber: '',
    debit: fmtAmt(totalPayments),
    credit: fmtAmt(totalBills),
    balance: fmtAmt(balance),
  };
  COLS.forEach((c) => {
    doc.text(totalsRow[c.key], x + 3, y + 6, {
      width: c.width - 6,
      align: c.key === 'particulars' ? 'left' : (c.key === 'date' ? 'center' : 'right'),
    });
    x += c.width;
  });
  drawRowLines(y, rowHeight);
  y += rowHeight + 20;

  doc.font('Helvetica').fontSize(10);
  doc.text(
    balance >= 0
      ? `Balance Due from Customer: Rs. ${fmtAmt(balance)}`
      : `Advance / Excess Paid by Customer: Rs. ${fmtAmt(Math.abs(balance))}`,
    left, y
  );

  doc.end();
}

module.exports = { generateLedgerPdf };
