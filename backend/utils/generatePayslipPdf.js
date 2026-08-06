const PDFDocument = require('pdfkit');

function fmtAmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(month) {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// business: tenant Settings doc. summary: { email, role, monthlySalary, workingDays, daysPresent, calculatedSalary }.
// presentDates: array of 'YYYY-MM-DD' strings this person was marked present.
function generatePayslipPdf({ business, month, summary, presentDates }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  if (business && business.businessName) {
    doc.fontSize(16).font('Helvetica-Bold').text(business.businessName, left, 40, { align: 'center', width });
    const subLines = [business.address, business.gstNumber ? `GSTIN: ${business.gstNumber}` : '', business.phone].filter(Boolean);
    if (subLines.length) {
      doc.fontSize(9).font('Helvetica').text(subLines.join('  |  '), left, doc.y + 2, { align: 'center', width });
    }
    doc.moveDown(0.6);
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);
  }

  doc.fontSize(18).font('Helvetica-Bold').text(`PAYSLIP — ${fmtMonth(month)}`, left, doc.y, { align: 'center', width });
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('Employee: ', left, doc.y, { continued: true }).font('Helvetica').text(summary.email);
  doc.font('Helvetica-Bold').text('Role: ', left, doc.y, { continued: true }).font('Helvetica').text(summary.role);
  doc.moveDown(0.8);

  const rows = [
    ['Monthly Salary', `Rs. ${fmtAmt(summary.monthlySalary)}`],
    ['Working Days', String(summary.workingDays)],
    ['Days Present', String(summary.daysPresent)],
    ['Calculated Salary', `Rs. ${fmtAmt(summary.calculatedSalary)}`],
  ];
  const labelWidth = 160;
  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(11).text(label, left, doc.y, { width: labelWidth, continued: true });
    doc.font('Helvetica').text(value);
  });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text('Attendance', left, doc.y);
  doc.moveDown(0.4);
  if (presentDates.length === 0) {
    doc.font('Helvetica').fontSize(10).text('No attendance marked this month.', left, doc.y);
  } else {
    doc.font('Helvetica').fontSize(9);
    const perLine = 4;
    for (let i = 0; i < presentDates.length; i += perLine) {
      const line = presentDates.slice(i, i + perLine).map(fmtDate).join('     ');
      doc.text(line, left, doc.y);
    }
  }

  doc.end();
}

module.exports = { generatePayslipPdf };
