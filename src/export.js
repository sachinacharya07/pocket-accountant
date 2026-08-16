import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportCSV(expenses, filename = "pocket-accountant-expenses.csv") {
  const header = ["Date", "Category", "Note", "Amount"];
  const rows = expenses.map((e) => [
    e.createdAt.toLocaleDateString("en-IN"),
    e.category,
    (e.note || "").replace(/,/g, " "),
    e.amount,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  downloadBlob(csv, filename, "text/csv");
}

export function exportPDF(expenses, meta = {}, filename = "pocket-accountant-expenses.pdf") {
  const docPdf = new jsPDF();
  docPdf.setFontSize(16);
  docPdf.text("Pocket Accountant", 14, 18);
  docPdf.setFontSize(10);
  docPdf.setTextColor(120);
  docPdf.text(`${meta.month || ""}   Total spent: Rs. ${Math.round(meta.total || 0).toLocaleString("en-IN")}`, 14, 25);

  autoTable(docPdf, {
    startY: 32,
    head: [["Date", "Category", "Note", "Amount (Rs.)"]],
    body: expenses.map((e) => [
      e.createdAt.toLocaleDateString("en-IN"),
      e.category,
      e.note || "-",
      Math.round(e.amount).toLocaleString("en-IN"),
    ]),
    headStyles: { fillColor: [31, 122, 92] },
    styles: { fontSize: 9 },
  });

  docPdf.save(filename);
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
