import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';
import autoTable from 'jspdf-autotable'; 
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

export default function App() {
  // NAVIGATION STATE
  const [activeTab, setActiveTab] = useState(1);
  const [currentModule, setCurrentModule] = useState('generator');

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // GENERATOR STATE
  const [documentType, setDocumentType] = useState('sertifikat');
  const [template, setTemplate] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableQR, setEnableQR] = useState(true);
  const imageRef = useRef(null);

  // AI OCR STATE
  const [ocrImage, setOcrImage] = useState(null);
  const [rawText, setRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  
  // PDF UTILITY STATE
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  const docConfig = {
    sertifikat: { orientation: 'landscape', format: 'a4', width: 297, height: 210 },
    id_card: { orientation: 'portrait', format: [90, 130], width: 90, height: 130 },
    surat: { orientation: 'portrait', format: 'a4', width: 210, height: 297 }
  };

  // --- LOGIKA UTILITAS PDF ---
  const handlePdfUpload = (e) => {
    setPdfFiles([...e.target.files]);
  };

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      alert("Pilih minimal 2 file PDF untuk digabungkan.");
      return;
    }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
      saveAs(blob, `Gabungan_Dokumen_SITU_${Date.now()}.pdf`);
      setPdfFiles([]); // Reset setelah berhasil
    } catch (error) {
      console.error(error);
      alert("Gagal menggabungkan PDF. Pastikan file tidak terkunci sandi.");
    }
    setIsMerging(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setTemplate(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const processCSVData = (csvString) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const detectedHeaders = results.meta.fields;
        const initialConfigs = {};
        detectedHeaders.forEach((header, index) => {
          let defaultSize = 12;
          if (header === 'nama') {
             if (documentType === 'sertifikat') defaultSize = 36;
             else if (documentType === 'surat') defaultSize = 14;
             else defaultSize = 18;
          }

          initialConfigs[header] = { 
            x: 50, y: 40 + (index * 10),
            size: defaultSize, 
            color: '#000000'
          };
        });
        setHeaders(detectedHeaders);
        setFieldConfigs(initialConfigs);
        setActiveField(detectedHeaders[0]);
        setParticipants(results.data);
      },
    });
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => processCSVData(event.target.result);
      reader.readAsText(file);
      e.target.value = null;
    }
  };

  const handleOCRImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrImage(URL.createObjectURL(file));
    setIsExtracting(true);
    setRawText("Sedang memindai gambar... Mohon tunggu.");
    try {
      const result = await Tesseract.recognize(file, 'ind', { logger: m => console.log(m) });
      setRawText(result.data.text);
    } catch (error) {
      console.error(error);
      setRawText("Gagal memindai teks. Pastikan gambar jelas.");
    }
    setIsExtracting(false);
    e.target.value = null;
  };

  const handleAICleansing = async () => {
    if (!rawText) return;
    setIsCleaning(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("API Key Gemini tidak ditemukan di file .env");
      setIsCleaning(false);
      return;
    }
    const prompt = `Ekstrak nama dari teks OCR ini. Rapikan kapital & gelar. Kembalikan HANYA format tabel CSV dengan 1 kolom header "nama".\n\nTeks:\n${rawText}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      let cleanCSV = data.candidates[0].content.parts[0].text.replace(/```csv\n?/g, '').replace(/```\n?/g, '').trim();
      processCSVData(cleanCSV);
      setRawText("Data berhasil dirapikan dan dimasukkan ke sistem!");
    } catch (error) {
      console.error(error);
      alert("Gagal menghubungi AI. Periksa koneksi internet.");
    }
    setIsCleaning(false);
  };

  const handleAddManualParticipant = () => {
    if (!manualInput.trim()) return;

    // Jika ini adalah data pertama, inisialisasi header 'nama'
    if (headers.length === 0 || !headers.includes('nama')) {
       const newHeaders = [...headers, 'nama'];
       setHeaders(newHeaders);
       let defaultSize = documentType === 'sertifikat' ? 36 : (documentType === 'surat' ? 14 : 18);
       setFieldConfigs({
         ...fieldConfigs,
         'nama': { x: 50, y: 50, size: defaultSize, color: '#000000' }
       });
       if (!activeField) setActiveField('nama');
    }

    // Tambahkan data ke antrean
    setParticipants([...participants, { nama: manualInput.trim() }]);
    setManualInput(""); 
  };

  const handleResetData = () => {
    if(window.confirm("Apakah Anda yakin ingin menghapus seluruh antrean data?")) {
      setParticipants([]);
      setHeaders([]);
      setFieldConfigs({});
      setActiveField(null);
    }
  };

  const handleImageClick = (e) => {
    if (!imageRef.current || !activeField) return;
    const rect = imageRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setFieldConfigs(prev => ({ ...prev, [activeField]: { ...prev[activeField], x: xPercent, y: yPercent } }));
  };

  const updateConfig = (field, key, value) => {
    setFieldConfigs(prev => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
  };

  const generateCertificates = async () => {
    if (!template || participants.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();
    const config = docConfig[documentType];
    
    for (let i = 0; i < participants.length; i++) {
      const rowData = participants[i];
      const doc = new jsPDF({ orientation: config.orientation, unit: 'mm', format: config.format });
      doc.addImage(template, 'JPEG', 0, 0, config.width, config.height);
      doc.setFont('helvetica', 'bold');

      headers.forEach(field => {
        const textToPrint = rowData[field] || "";
        const fConfig = fieldConfigs[field];
        doc.setFontSize(Number(fConfig.size));
        doc.setTextColor(fConfig.color);
        const textAlign = documentType === 'surat' ? 'left' : 'center';
        doc.text(textToPrint, (fConfig.x / 100) * config.width, (fConfig.y / 100) * config.height, { align: textAlign });
      });

      // Fitur Keamanan: Generasi QR Code Validasi Dinamis
      if (enableQR) {
        try {
          const participantName = rowData['nama'] || rowData['Nama'] || "Peserta";
          // Data yang akan muncul jika QR di-scan
          const qrDataText = `DOKUMEN VALID DISDIKBUD PATI\nNama: ${participantName}\nJenis: ${documentType.toUpperCase()}\nTanggal Terbit: ${new Date().toLocaleDateString('id-ID')}`;
          
          // Mengubah teks menjadi gambar Base64 QR Code
          const qrDataUrl = await QRCode.toDataURL(qrDataText, { margin: 1, width: 150 });
          
          // Penempatan posisi QR Code otomatis menyesuaikan orientasi kertas
          if (documentType === 'sertifikat') doc.addImage(qrDataUrl, 'PNG', 265, 175, 22, 22); // Pojok kanan bawah Lanskap
          else if (documentType === 'surat') doc.addImage(qrDataUrl, 'PNG', 175, 265, 22, 22); // Pojok kanan bawah Potret
          else doc.addImage(qrDataUrl, 'PNG', 65, 105, 18, 18); // Pojok kanan bawah ID Card
        } catch (qrErr) {
          console.error("Gagal menempelkan QR Code:", qrErr);
        }
      }

      const fileNameStr = rowData['nama'] || `Dokumen_${i+1}`;
      let prefix = documentType === 'sertifikat' ? 'Sertifikat' : (documentType === 'surat' ? 'Surat' : 'ID_Card');
      zip.file(`${prefix}_${fileNameStr}.pdf`, doc.output('blob'));
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    let zipName = documentType === 'sertifikat' ? 'Sertifikat' : (documentType === 'surat' ? 'Surat_Massal' : 'ID_Card');
    saveAs(zipContent, `Arsip_${zipName}_Disdikbud.zip`);

    try {
      const reportDoc = new jsPDF();
      // Judul Laporan
      reportDoc.setFont('helvetica', 'bold');
      reportDoc.setFontSize(14);
      reportDoc.text("LAPORAN REKAPITULASI PENCETAKAN DOKUMEN", 105, 20, { align: 'center' });
      reportDoc.setFontSize(11);
      reportDoc.text("DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. PATI", 105, 26, { align: 'center' });
      
      // Garis Kop Surat
      reportDoc.setLineWidth(0.5);
      reportDoc.line(14, 30, 196, 30);

      // Info Meta Data
      reportDoc.setFont('helvetica', 'normal');
      reportDoc.text(`Tanggal Cetak   : ${new Date().toLocaleDateString('id-ID')}`, 14, 40);
      reportDoc.text(`Jenis Dokumen   : ${documentType.toUpperCase()}`, 14, 46);
      reportDoc.text(`Total Dicetak   : ${participants.length} Berkas`, 14, 52);

      // Data Tabel
      const tableColumn = ["No", "Nama Peserta Tercetak"];
      const tableRows = participants.map((p, index) => [
        index + 1,
        p.nama || p.Nama || p.NAMA || p[headers[0]] || "Nama tidak ditemukan"
      ]);

      // Cetak Tabel menggunakan Plugin
      autoTable(reportDoc, {
        startY: 60,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [49, 46, 129] }, // Warna Indigo tua khas birokrasi
        styles: { font: 'helvetica', fontSize: 10 }
      });

      // Kolom Tanda Tangan
      const finalY = reportDoc.lastAutoTable.finalY || 60;
      reportDoc.text("Pati, " + new Date().toLocaleDateString('id-ID'), 140, finalY + 20);
      reportDoc.text("Mengetahui,", 140, finalY + 26);
      reportDoc.text("Staf Tata Usaha", 140, finalY + 32);
      
      reportDoc.text("_______________________", 140, finalY + 55);
      reportDoc.text("NIP.", 140, finalY + 61);

      // Unduh file PDF Laporan
      reportDoc.save(`Berita_Acara_Cetak_${documentType}.pdf`);
    } catch (err) {
      console.error("Gagal membuat laporan:", err);
    }

    setIsProcessing(false);
  };

return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden relative">
      
      {/* MOBILE OVERLAY BACKGROUND */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-72 md:w-64 bg-indigo-900 text-white flex flex-col shadow-2xl md:shadow-xl z-30 transition-transform duration-300 ease-in-out justify-between`}>
        <div>
          <div className="p-6 border-b border-indigo-800 flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner bg-white overflow-hidden shrink-0">
                 <img src="/logo.png" alt="Logo" className="w-full h-full object-cover"/>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">APP Generator</h1>
                <p className="text-xs text-indigo-300">Disdikbud Kab. Pati</p>
              </div>
            </div>
            {/* Tombol Tutup Sidebar Khusus Mobile */}
            <button 
              className="md:hidden text-indigo-300 hover:text-white p-2 text-xl"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <nav className="p-4 space-y-2">
            <button onClick={() => { setCurrentModule('generator'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${currentModule === 'generator' ? 'bg-indigo-800 shadow-sm border border-indigo-700' : 'hover:bg-indigo-800/50 text-indigo-200'}`}>
              <span>📄</span> Generator Dokumen
            </button>
            <button onClick={() => { setCurrentModule('pdf_utility'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${currentModule === 'pdf_utility' ? 'bg-indigo-800 shadow-sm border border-indigo-700' : 'hover:bg-indigo-800/50 text-indigo-200'}`}>
              <span>🗂️</span> Utilitas PDF
            </button>
          </nav>
        </div>

        <div className="p-4 m-4 rounded-xl bg-indigo-950/60 border border-indigo-800 text-center">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Dikembangkan Oleh</p>
          <p className="text-xs font-semibold text-indigo-100">Mahasiswa Teknik Informatika UNNES</p>
          <div className="h-px bg-indigo-800 my-2"></div>
          <p className="text-[10px] text-indigo-300"></p>
        </div>
      </aside>

      {/* CORE CANVAS WORKSPACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* TOP NAVBAR BANNER */}
        <header className="bg-white px-4 md:px-8 py-4 flex items-center gap-4 shadow-sm z-10">
          {/* Tombol Hamburger Mobile */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xl"
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-700">Portal App Generator</h2>
            <p className="text-xs text-slate-400 font-medium">Sistem Pemrosesan Dokumen & Ekstraksi AI Terintegrasi</p>
          </div>
        </header>

        {/* DYNAMIC AREA CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* =========================================================
              VIEW MODUL: UTILITAS PDF
              ========================================================= */}
          {currentModule === 'pdf_utility' && (
             <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">🔗</div>
                 <div>
                   <h3 className="text-xl font-bold">Penggabung File PDF (Merger)</h3>
                   <p className="text-sm text-slate-500">Gabungkan lembar arsip hasil scan (SK/Ijazah/Surat) menjadi satu berkas secara lokal.</p>
                 </div>
               </div>
               
               <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center mb-6">
                 <span className="text-4xl mb-3 block">📄</span>
                 <p className="text-sm font-semibold text-slate-700 mb-2">Pilih beberapa berkas PDF yang ingin disatukan</p>
                 <input type="file" multiple accept=".pdf" onChange={handlePdfUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full"/>
               </div>

               {pdfFiles.length > 0 && (
                 <div className="mb-6">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Urutan Gabungan Berkas ({pdfFiles.length}):</p>
                   <ul className="space-y-2">
                     {Array.from(pdfFiles).map((file, i) => (
                       <li key={i} className="text-sm bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
                         <span className="font-bold text-slate-400">{i+1}.</span> <span className="font-medium text-slate-700 truncate">{file.name}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               <button onClick={mergePdfs} disabled={isMerging || pdfFiles.length < 2} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isMerging || pdfFiles.length < 2 ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                 {isMerging ? '🔄 Menyatukan Lembar Halaman Berkas...' : 'Gabungkan PDF Sekarang'}
               </button>
             </div>
          )}

          {/* =========================================================
              VIEW MODUL: GENERATOR DOKUMEN 
              ========================================================= */}
          {currentModule === 'generator' && (
            <>
              {/* Alur Langkah Kerja */}
              <div className="flex gap-6 mb-6 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab(1)} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 1 ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Langkah 1: Setup Template Latar</button>
                <button onClick={() => setActiveTab(2)} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 2 ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Langkah 2: Input Sumber Data & AI</button>
                <button onClick={() => setActiveTab(3)} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 3 ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Langkah 3: Tata Letak & Cetak Berkas</button>
              </div>

              <div className="max-w-5xl bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                {activeTab === 1 && (
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-bold mb-4">Pengaturan Format Dokumen</h3>
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Tipe Keluaran Administrasi:</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        <button onClick={() => setDocumentType('sertifikat')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'sertifikat' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>🎓 Sertifikat Penghargaan (A4 Lanskap)</button>
                        <button onClick={() => setDocumentType('id_card')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'id_card' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>🪪 Tanda Pengenal / ID Card (B4 Potret)</button>
                        <button onClick={() => setDocumentType('surat')} className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition-all ${documentType === 'surat' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>📄 Surat Edaran Massal (A4 Potret)</button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Unggah Desain Latar Kosong (Format Gambar)</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 cursor-pointer" />
                    </div>
                    <button onClick={() => setActiveTab(2)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">Lanjut Langkah Berikutnya ➡️</button>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-bold mb-4">Pilih Jalur Pemasukan Data</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* OPSI A */}
                      <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">📁</div>
                        <h4 className="font-bold mb-2">Opsi A: Import Excel/CSV</h4>
                        <p className="text-xs text-slate-500 mb-4 flex-1">Gunakan berkas spreadsheet jika kuantitas data mencapai puluhan atau ratusan.</p>
                        <input type="file" accept=".csv" onChange={handleCSVUpload} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50" />
                      </div>
                      
                      {/* OPSI B */}
                      <div className="p-5 border-2 border-indigo-100 rounded-xl bg-indigo-50 shadow-sm relative flex flex-col">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">✨ Smart AI</div>
                        <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center mb-3">🤖</div>
                        <h4 className="font-bold mb-2 text-indigo-900">Opsi B: Ekstraksi Gambar SK</h4>
                        <p className="text-xs text-indigo-700 mb-4 flex-1">Pindai lembar foto fisik SK Tugas, AI akan membaca teks dan merapikan gelar otomatis.</p>
                        <input type="file" accept="image/*" onChange={handleOCRImageUpload} className="w-full p-2 border border-indigo-200 rounded-lg text-xs bg-white mb-2" />
                        {ocrImage && <img src={ocrImage} className="w-full h-16 object-cover border border-indigo-200 rounded-lg mb-2 shadow-sm" />}
                        {rawText && (
                          <div className="mt-auto">
                            <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} className="w-full text-[10px] p-2 border border-indigo-200 rounded h-12 mb-2 bg-white" />
                            <button onClick={handleAICleansing} disabled={isCleaning || isExtracting} className="w-full py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-bold hover:bg-indigo-700 disabled:bg-indigo-300">
                              {isCleaning ? "Merangkum..." : "Rapikan AI"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* OPSI C */}
                      <div className="p-5 border border-amber-200 rounded-xl bg-amber-50 shadow-sm flex flex-col">
                        <div className="w-10 h-10 bg-amber-200 text-amber-700 rounded-full flex items-center justify-center mb-3">✍️</div>
                        <h4 className="font-bold mb-2 text-amber-900">Opsi C: Entri Manual</h4>
                        <p className="text-xs text-amber-700 mb-4 flex-1">Ketik nama secara manual untuk menangani kasus peserta susulan atau ralat cetak berkas.</p>
                        <div className="flex gap-2 mb-2 mt-auto">
                          <input 
                            type="text" 
                            placeholder="Ketik Nama & Gelar..." 
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddManualParticipant()}
                            className="w-full p-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none" 
                          />
                          <button onClick={handleAddManualParticipant} className="px-3 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 shadow-sm">+</button>
                        </div>
                      </div>
                    </div>

                    {/* Panel Tabel Pratinjau & Tombol Reset Data */}
                    {participants.length > 0 && (
                      <div className="mt-6 animate-fade-in border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                         {/* Header Status & Tombol Aksi */}
                         <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 p-4 border-b border-slate-200 gap-4">
                           <div className="flex items-center gap-3 w-full sm:w-auto">
                             <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">✓</div>
                             <div>
                               <p className="text-sm font-bold text-slate-800">Antrean Siap: {participants.length} Dokumen</p>
                               <p className="text-xs text-slate-500">Pratinjau data yang siap dicetak</p>
                             </div>
                           </div>
                           <div className="flex gap-2 w-full sm:w-auto">
                             <button onClick={handleResetData} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold transition-colors flex-1 sm:flex-none">
                               Kosongkan Data
                             </button>
                             <button onClick={() => setActiveTab(3)} className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-md transition-all flex-1 sm:flex-none">
                               Lanjut Desain ➡️
                             </button>
                           </div>
                         </div>
                         
                         {/* Tabel Pratinjau Scrollable */}
                         <div className="bg-white max-h-60 overflow-y-auto">
                           <table className="w-full text-left text-sm text-slate-600">
                             <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0 shadow-sm">
                               <tr>
                                 <th className="px-6 py-3 font-bold w-16">No</th>
                                 {headers.map((h, idx) => (
                                   <th key={idx} className="px-6 py-3 font-bold">{h}</th>
                                 ))}
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {participants.map((p, i) => (
                                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-6 py-3 font-medium text-slate-400">{i + 1}</td>
                                   {headers.map((h, idx) => (
                                     <td key={idx} className="px-6 py-3">{p[h] || '-'}</td>
                                   ))}
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="animate-fade-in flex flex-col md:flex-row gap-8">
                    {/* Panel Kiri */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                      <h3 className="text-lg font-bold mb-2">Penyesuaian Komponen</h3>
                      
                      {/* Keamanan QR */}
                      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <span className="text-indigo-600 font-bold">🛡️</span>
                           <div>
                             <p className="text-xs font-bold text-indigo-900">Validasi QR Code Resmi</p>
                             <p className="text-[10px] text-indigo-700">Sematkan kode pengaman otomatis</p>
                           </div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={enableQR} onChange={() => setEnableQR(!enableQR)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                         </label>
                      </div>

                      {headers.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-400 mb-2">Daftar Variabel Penempatan:</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {headers.map(h => (
                              <button key={h} onClick={() => setActiveField(h)} className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${activeField === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{h.toUpperCase()}</button>
                            ))}
                          </div>
                          {activeField && fieldConfigs[activeField] && (
                             <div className="space-y-4">
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Skala Ketebalan Font</label>
                                  <input type="range" min="10" max="80" value={fieldConfigs[activeField].size} onChange={(e) => updateConfig(activeField, 'size', e.target.value)} className="w-full accent-indigo-600"/>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Palet Warna Teks</label>
                                  <input type="color" value={fieldConfigs[activeField].color} onChange={(e) => updateConfig(activeField, 'color', e.target.value)} className="w-full h-8 rounded border p-0 cursor-pointer"/>
                                </div>
                             </div>
                          )}
                        </div>
                      )}
                      
                      <button onClick={generateCertificates} disabled={isProcessing || !template || participants.length === 0} className={`w-full py-3 mt-auto rounded-xl font-bold text-white shadow-lg transition-all ${isProcessing || !template || participants.length === 0 ? 'bg-slate-400' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                        {isProcessing ? 'Mengompres File ZIP...' : `Eksekusi Cetak Massal`}
                      </button>
                    </div>

                    {/* Panel Kanan Preview */}
                    <div className="w-full md:w-2/3">
                      <p className="text-sm font-semibold text-slate-500 mb-2">Kanvas Tata Letak (Klik gambar untuk menggeser posisi teks)</p>
                      {!template ? (
                         <div className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-400 bg-slate-50">Silakan unggah berkas gambar latar pada Langkah 1</div>
                      ) : (
                        <div className={`relative w-full cursor-crosshair border shadow-md rounded-lg overflow-hidden bg-white mx-auto ${documentType === 'id_card' ? 'max-w-xs' : (documentType === 'surat' ? 'max-w-md' : 'max-w-full')}`} onClick={handleImageClick}>
                          <img ref={imageRef} src={template} alt="Preview" className="w-full h-auto object-contain pointer-events-none" />
                          {headers.map(header => {
                            const config = fieldConfigs[header];
                            if (!config) return null;
                            let markerAlignClass = "-translate-x-1/2";
                            if (documentType === 'surat') markerAlignClass = "translate-x-0"; 
                            return (
                              <div key={header} className={`absolute flex flex-col pointer-events-none -translate-y-1/2 ${markerAlignClass}`} style={{ left: `${config.x}%`, top: `${config.y}%`, zIndex: activeField === header ? 20 : 10 }}>
                                <span style={{ fontSize: `${config.size / 2}px`, color: config.color, border: activeField === header ? '2px dashed #4f46e5' : '1px solid transparent', backgroundColor: activeField === header ? 'rgba(255,255,255,0.8)' : 'transparent', padding: '2px 8px', borderRadius: '4px' }} className="font-bold whitespace-nowrap">
                                  [{header}]
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}