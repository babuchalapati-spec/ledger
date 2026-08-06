
const PDFDocument = require('pdfkit');

const COLS = [
  { key: 'date', label: 'Date', width: 62 },
  { key: 'particulars', label: 'Particulars', width: 138 },
  { key: 'billNumber', label: 'Bill No.', width: 50 },
  { key: 'qty', label: 'Qty', width: 50 },
  { key: 'debit', label: 'Payment (Dr)', width: 82 },
  { key: 'credit', label: 'Bill (Cr)', width: 82 },
  { key: 'balance', label: 'Balance', width: 82 },
];

// Used for the category-grouped layout: no running-balance column since a
// per-row running balance isn't meaningful once entries are split into groups.
const GROUPED_COLS = [
  { key: 'date', label: 'Date', width: 70 },
  { key: 'particulars', label: 'Particulars', width: 160 },
  { key: 'billNumber', label: 'Bill No.', width: 60 },
  { key: 'qty', label: 'Qty', width: 55 },
  { key: 'debit', label: 'Payment (Dr)', width: 90 },
  { key: 'credit', label: 'Bill (Cr)', width: 90 },
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN');
}

function fmtAmt(n) {
  return n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function particularsFor(e) {
  return e.description || (e.type === 'bill' ? 'Purchase / Bill' : `Payment${e.paymentMode ? ' - ' + e.paymentMode : ''}`);
}

function fmtQty(e) {
  return e.type === 'bill' && e.quantity != null ? `${e.quantity}${e.unit ? ' ' + e.unit : ''}` : '';
}

// Sums quantity per unit across a group's bill entries, e.g. "60 bags, 3 tons".
function qtyTotalsFor(groupEntries) {
  const totals = {};
  groupEntries.forEach((e) => {
    if (e.type === 'bill' && e.quantity != null) {
      const key = e.unit || '';
      totals[key] = (totals[key] || 0) + e.quantity;
    }
  });
  return Object.entries(totals).map(([unit, qty]) => `${qty}${unit ? ' ' + unit : ''}`).join(', ');
}

function generateLedgerPdf({ customer, entries, openingBalance, totalBills, totalPayments, balance, business }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const hasCategories = entries.some((e) => e.category && e.category.trim());
  const cols = hasCategories ? GROUPED_COLS : COLS;
  const tableWidth = cols.reduce((s, c) => s + c.width, 0);

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
      doc.text(c.label, x + 3, rowY + 6, { width: c.width - 6, align: c.key === 'particulars' ? 'left' : 'center' });
      x += c.width;
    });
    drawRowLines(rowY, rowHeight);
  }

  function ensureSpace(neededHeight, redrawHeader) {
    if (y + neededHeight > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      if (redrawHeader) {
        redrawHeader(y);
        y += rowHeight;
      }
    }
  }

  function drawRow(rowY, values, opts = {}) {
    doc.font(opts.bold ? 'Helvetica-Bold' : (opts.italic ? 'Helvetica-Oblique' : 'Helvetica')).fontSize(9);
    let x = left;
    cols.forEach((c) => {
      doc.text(values[c.key] || '', x + 3, rowY + 6, {
        width: c.width - 6,
        align: c.key === 'particulars' ? 'left' : (c.key === 'date' ? 'center' : 'right'),
      });
      x += c.width;
    });
    drawRowLines(rowY, rowHeight);
  }

  if (!hasCategories) {
    // Today's flat chronological layout with a running balance column, unchanged
    // except for the added Qty column.
    drawHeaderRow(y);
    y += rowHeight;

    if (openingBalance) {
      ensureSpace(rowHeight, drawHeaderRow);
      drawRow(y, {
        particulars: 'Opening Balance',
        debit: openingBalance < 0 ? fmtAmt(Math.abs(openingBalance)) : '',
        credit: openingBalance > 0 ? fmtAmt(openingBalance) : '',
        balance: fmtAmt(openingBalance),
      }, { italic: true });
      y += rowHeight;
    }

    entries.forEach((e) => {
      ensureSpace(rowHeight, drawHeaderRow);
      drawRow(y, {
        date: fmtDate(e.date),
        particulars: particularsFor(e),
        billNumber: e.billNumber || '-',
        qty: fmtQty(e),
        debit: e.type === 'payment' ? fmtAmt(e.amount) : '',
        credit: e.type === 'bill' ? fmtAmt(e.amount) : '',
        balance: fmtAmt(e.runningBalance),
      });
      y += rowHeight;
    });

    ensureSpace(rowHeight * 2, drawHeaderRow);
    drawRow(y, {
      particulars: 'TOTAL',
      debit: fmtAmt(totalPayments),
      credit: fmtAmt(totalBills),
      balance: fmtAmt(balance),
    }, { bold: true });
    y += rowHeight + 20;

    doc.font('Helvetica').fontSize(10);
    doc.text(
      balance >= 0
        ? `Balance Due from Customer: Rs. ${fmtAmt(balance)}`
        : `Advance / Excess Paid by Customer: Rs. ${fmtAmt(Math.abs(balance))}`,
      left, y
    );
  } else {
    // Grouped-by-category layout: one mini-table per category, each with its
    // own subtotal ("category balance") and total quantity, then a final
    // summary combining every category's balance.
    const groups = new Map();
    entries.forEach((e) => {
      const key = (e.category && e.category.trim()) || 'Uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    const categoryBalances = [];

    sortedCategories.forEach((category) => {
      const groupEntries = groups.get(category);

      ensureSpace(rowHeight * 2);
      doc.font('Helvetica-Bold').fontSize(12).text(category, left, y);
      y += 18;

      drawHeaderRow(y);
      y += rowHeight;

      let categoryBills = 0;
      let categoryPayments = 0;
      groupEntries.forEach((e) => {
        ensureSpace(rowHeight, drawHeaderRow);
        drawRow(y, {
          date: fmtDate(e.date),
          particulars: particularsFor(e),
          billNumber: e.billNumber || '-',
          qty: fmtQty(e),
          debit: e.type === 'payment' ? fmtAmt(e.amount) : '',
          credit: e.type === 'bill' ? fmtAmt(e.amount) : '',
        });
        y += rowHeight;
        if (e.type === 'bill') categoryBills += e.amount;
        else categoryPayments += e.amount;
      });

      const categoryBalance = categoryBills - categoryPayments;
      const categoryQty = qtyTotalsFor(groupEntries);
      categoryBalances.push({ category, balance: categoryBalance, qty: categoryQty });

      ensureSpace(rowHeight, drawHeaderRow);
      drawRow(y, {
        particulars: `${category} Subtotal`,
        qty: categoryQty,
        debit: fmtAmt(categoryPayments),
        credit: fmtAmt(categoryBills),
      }, { bold: true });
      y += rowHeight + 16;
    });

    // Final summary: opening balance + each category's balance = final balance.
    ensureSpace(rowHeight * (categoryBalances.length + 3));
    doc.font('Helvetica-Bold').fontSize(12).text('Summary', left, y);
    y += 18;
    doc.font('Helvetica').fontSize(10);

    if (openingBalance) {
      doc.text(`Opening Balance: Rs. ${fmtAmt(openingBalance)}`, left, y);
      y += 16;
    }
    categoryBalances.forEach(({ category, balance: catBalance, qty }) => {
      doc.text(`${category}: Rs. ${fmtAmt(catBalance)}${qty ? ` (Qty: ${qty})` : ''}`, left, y);
      y += 16;
    });
    y += 6;
    doc.font('Helvetica-Bold').fontSize(11).text(
      balance >= 0
        ? `FINAL BALANCE DUE FROM CUSTOMER: Rs. ${fmtAmt(balance)}`
        : `FINAL ADVANCE / EXCESS PAID BY CUSTOMER: Rs. ${fmtAmt(Math.abs(balance))}`,
      left, y
    );
  }

  doc.end();
}

module.exports = { generateLedgerPdf };
