"use client";
export default function PrintButton() {
  return (
    <div className="no-print flex gap-2 justify-center my-4">
      <button onClick={() => window.print()} className="btn-primary">🖨 Cetak</button>
      <button onClick={() => window.close()} className="btn-secondary">Tutup</button>
    </div>
  );
}
